/**
 * The host switcher: selection, dismissal, and the one host state that has a
 * recovery action.
 *
 * Every assertion is on rendered text and roles. The only substitution is the
 * Tauri IPC boundary, which no browser provides.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { fleet, HOSTS, oneHost, sessions } from './fixtures.ts'
import { type Harness, startHarness, textOf } from './harness.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('marks the active host with a trailing check, not a fill', async () => {
  const page = await harness.open({ hosts: HOSTS, remote: { 'session/list': { items: sessions() } } })
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-connection="trigger"]').click()
  const menu = page.locator('[data-deeptail-connection="menu"]')
  expect(await menu.getAttribute('role')).toBe('menu')
  // Choosing one host from a set is a radio group, so the selection is spoken
  // as a checked state rather than drawn as a fill.
  expect(await page.locator('[data-deeptail-connection="menu"] [aria-checked="true"]').count()).toBe(1)
  expect(await textOf(page, '[data-deeptail-connection="menu"] [aria-checked="true"] .menu-label')).toBe('Workstation')
  expect(await page.locator('[data-deeptail-connection="menu"] [role="menuitemradio"]').count()).toBe(HOSTS.length)
  await harness.shoot(page, 'connection-menu')
  await page.close()
})

it('closes the connection menu on Escape', async () => {
  const page = await harness.open({ hosts: HOSTS, remote: { 'session/list': { items: sessions() } } })
  await page.waitForSelector('[data-deeptail-shell]')
  const trigger = page.locator('[data-deeptail-connection="trigger"]')
  await trigger.click()
  expect(await trigger.getAttribute('aria-expanded')).toBe('true')
  await page.keyboard.press('Escape')
  expect(await trigger.getAttribute('aria-expanded')).toBe('false')
  await page.close()
})

it('reports a revoked token as needing re-pairing and offers the way out', async () => {
  const page = await harness.open(oneHost({ remoteStatuses: { 'session/list': 401 } }))
  await page.waitForSelector('[data-deeptail-shell]')
  // The state is spoken, not merely coloured, so the dot is never the only cue.
  expect(await textOf(page, '.connection-trigger')).toContain('Needs re-pairing')
  await page.locator('[data-deeptail-connection="trigger"]').click()
  expect(await textOf(page, '[data-deeptail-action="repair"]')).toBe('Re-pair this host')
  await harness.shoot(page, 'connection-unauthorized')
  await page.close()
})

it('walks every menu item with the arrow keys and is one stop in the tab order', async () => {
  const page = await harness.open({
    hosts: HOSTS,
    remote: { 'session/list': { items: sessions() } },
    remoteStatuses: { 'lab-2:session/list': 401 },
  })
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'visible' })
  const spoken = () => page.evaluate(() => document.activeElement?.textContent?.trim() ?? null)
  // Focus opens on the first host, and Down reaches the re-pair row and the
  // pinned footer rather than stopping at the last host.
  expect(await spoken()).toContain('Workstation')
  // Each press depends on where the one before it landed, so they are written
  // out rather than gathered.
  await page.keyboard.press('ArrowDown')
  const second = await spoken()
  await page.keyboard.press('ArrowDown')
  const third = await spoken()
  await page.keyboard.press('ArrowDown')
  const fourth = await spoken()
  await page.keyboard.press('ArrowDown')
  const fifth = await spoken()
  expect([second, third, fourth, fifth]).toEqual([
    'Lab boxNeeds re-pairing',
    'Re-pair this host',
    'Pair a host',
    'Unpair',
  ])
  // Every item shares one tab stop, so Tab leaves the menu rather than walking it.
  expect(await page.evaluate(() => document.querySelectorAll('[role="menuitem"][tabindex="0"]').length)).toBe(1)
  await page.close()
})

it('keeps the operator on their row when a fleet event repaints the open menu', async () => {
  const page = await harness.open(fleet({ muxHosts: HOSTS.map((host) => host.id) }))
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'visible' })
  await page.keyboard.press('ArrowDown')
  expect(await page.evaluate(() => document.activeElement?.textContent?.trim() ?? null)).toContain('Lab box')
  // A forwarded event repaints the switcher — the roster's own rebuild keeps
  // focus by row, and the menu owes the operator the same rather than yanking
  // them back to the first host every time a row arrives.
  await harness.forward(page, 'api-session/added', [
    { sessionId: 's-arrived', updatedAt: Date.now(), running: false, blank: false },
  ])
  await page.waitForSelector('[data-deeptail-session="s-arrived"]')
  expect(await page.evaluate(() => document.activeElement?.textContent?.trim() ?? null)).toContain('Lab box')
  await page.close()
})

it('takes the rows the open menu covers out of play', async () => {
  const page = await harness.open(fleet())
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'visible' })
  // A row the menu overlaps is partially covered, so it is not a target while
  // the menu is open: a click there dismisses the menu instead of reaching it.
  const reachable = () =>
    page.evaluate(() => {
      const row = document.querySelector<HTMLElement>('[data-deeptail-session="s-running"] .session-open')
      if (row === null) return null
      row.focus()
      return document.activeElement === row
    })
  expect(await reachable()).toBe(false)
  await page.keyboard.press('Escape')
  await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'detached' })
  // Dismissing the menu puts them back.
  expect(await reachable()).toBe(true)
  await page.close()
})

it('opens the pairing form under the name of the host being re-paired', async () => {
  const page = await harness.open({
    hosts: HOSTS,
    remote: { 'session/list': { items: sessions() } },
    remoteStatuses: { 'lab-2:session/list': 401 },
  })
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await page.locator('[data-deeptail-action="repair"]').click()
  await page.locator('[data-deeptail-field="link"]').waitFor({ state: 'visible' })
  // Re-pairing replaces the record it names, so the form carries that host's
  // name rather than opening blank for whatever is pasted next.
  expect(await page.locator('[data-deeptail-field="name"]').inputValue()).toBe('Lab box')
  await page.close()
})

it('dismisses the menu when a pointer lands outside it, without taking focus back', async () => {
  const page = await harness.open(fleet())
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'visible' })
  // An open menu overlaps what is behind it, so it must not stay open once the
  // operator has moved on. Focus stays where the pointer put it: pulling it
  // back to the trigger would override whatever they just reached for.
  await page.locator('.main-body').click()
  await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'detached' })
  expect(await page.locator('[data-deeptail-connection="trigger"]').getAttribute('aria-expanded')).toBe('false')
  expect(
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.deeptailConnection),
  ).not.toBe('trigger')
  await page.close()
})

it('hands focus back to the trigger when the operator dismisses from inside', async () => {
  const page = await harness.open(fleet())
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'visible' })
  // Escape is a dismissal the operator made from inside the menu, so it returns
  // them to the control they opened it from.
  await page.keyboard.press('Escape')
  await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'detached' })
  expect(await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.deeptailConnection)).toBe(
    'trigger',
  )
  await page.close()
})

it('holds the pane behind the open drawer out of reach', async () => {
  const page = await harness.open(fleet(), { mobile: true })
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-action="drawer"]').click()
  // Opening moves focus into the drawer on the next frame, so the assertion
  // waits for that rather than racing it.
  await page.waitForFunction(() => document.activeElement?.closest('.sidebar') !== null)
  // The scrim covers the whole main pane, the drawer toggle included, so a
  // control left focusable behind it is one the reader can reach but neither
  // see nor click.
  const state = await page.evaluate(() => {
    const pane = document.querySelector('.main')
    document.querySelector<HTMLElement>('[data-deeptail-action="drawer"]')?.focus()
    const active = document.activeElement
    return {
      inert: pane instanceof HTMLElement && pane.inert,
      inPane: active instanceof HTMLElement && active.closest('.main') !== null,
    }
  })
  expect(state).toEqual({ inert: true, inPane: false })
  // Escape and the scrim both sit outside the inert pane, so the drawer always
  // has a way out, and closing it hands the toggle back.
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => (document.activeElement as HTMLElement | null)?.dataset.deeptailAction === 'drawer')
  expect(await page.evaluate(() => document.querySelector('.main')?.matches('[inert]') ?? true)).toBe(false)
  await page.close()
})

it('lets Tab out of the open menu rather than cycling inside it', async () => {
  const page = await harness.open(fleet())
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'visible' })
  const where = () =>
    page.evaluate(() => {
      const active = document.activeElement
      if (active === null || active === document.body) return 'nowhere'
      return active.closest('[data-deeptail-connection="menu"]') === null ? 'outside the menu' : 'inside the menu'
    })
  expect(await where()).toBe('inside the menu')
  // The rest of the sidebar is inert while the menu covers it, so without a
  // way out the tab sequence runs menu, document, trigger, menu for ever. One
  // Tab has to end it: the menu closes and focus carries on past the trigger.
  await page.keyboard.press('Tab')
  await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'detached' })
  expect(await where()).toBe('outside the menu')
  expect(await page.locator('[data-deeptail-connection="trigger"]').getAttribute('aria-expanded')).toBe('false')
  // And it stays out: three more presses must never land back in a menu. Each
  // press depends on where the one before it landed, so they run in sequence.
  const walked = await [1, 2, 3].reduce(async (sofar: Promise<string[]>) => {
    const seen = await sofar
    await page.keyboard.press('Tab')
    return [...seen, await where()]
  }, Promise.resolve([]))
  expect(walked).not.toContain('inside the menu')
  await page.close()
})

it('closes the menu when focus leaves it without a pointer', async () => {
  const page = await harness.open(fleet())
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'visible' })
  // Not every departure is a Tab or a click: assistive technology and the
  // platform both move focus on their own, and the menu holds everything
  // around it inert, so no in-page control is left to focus. The event the
  // browser would deliver is delivered directly — without it the `focusin`
  // listener could be deleted with the whole suite still green.
  await page.evaluate(() => {
    const outside = document.querySelector('.main-body')
    outside?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })
  await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'detached' })
  expect(await page.locator('[data-deeptail-connection="trigger"]').getAttribute('aria-expanded')).toBe('false')
  await page.close()
})

it('lets a finger close the drawer it opened', async () => {
  const page = await harness.open(fleet(), { mobile: true })
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-action="drawer"]').click()
  await page.locator('[data-deeptail-action="drawer-dismiss"]').waitFor({ state: 'visible' })
  // The open drawer covers the header the toggle renders in, so the toggle is
  // behind it and a tap there reaches the drawer instead. There is no Escape
  // key on a phone, so the drawer carries its own dismissal — and a real click,
  // not a programmatic focus, is what proves it can be reached.
  await page.locator('[data-deeptail-action="drawer-dismiss"]').click()
  await page.locator('[data-deeptail-action="drawer-dismiss"]').waitFor({ state: 'hidden' })
  expect(await page.locator('[data-deeptail-action="drawer"]').getAttribute('aria-expanded')).toBe('false')
  expect(await page.evaluate(() => document.querySelector('.main')?.matches('[inert]') ?? true)).toBe(false)
  await page.close()
})
