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
import { until } from './wait.ts'

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

it('makes the host a menu row names the selected one', async () => {
  const page = await harness.open(fleet())
  await page.waitForSelector('[data-deeptail-shell]')
  // The selection is the plane's own active-host fact, and choosing a host
  // re-reads that host's roster rather than leaving the snapshot a passing
  // outage left behind. Both are read around the press, so what moved is what
  // the action did rather than what the page already held.
  const rosterReads = async (host: string): Promise<number> =>
    (await harness.calls(page)).filter((call) => call.host === host && call.endpoint === 'session/list').length
  const menu = page.locator('[data-deeptail-connection="menu"]')
  expect(await textOf(page, '.connection-label')).toBe('Workstation')
  const before = await rosterReads('lab-2')
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await menu.locator('[data-deeptail-host="lab-2"][data-deeptail-action="select-host"]').click()
  expect(await textOf(page, '.connection-label')).toBe('Lab box')
  await until(async () => (await rosterReads('lab-2')) > before)
  expect(await rosterReads('lab-2')).toBeGreaterThan(before)
  await page.locator('[data-deeptail-connection="trigger"]').click()
  expect(await menu.locator('[data-deeptail-host="lab-2"]').getAttribute('aria-checked')).toBe('true')
  expect(await menu.locator('[data-deeptail-host="dev-1"]').getAttribute('aria-checked')).toBe('false')
  await page.close()
})

it('opens the picker from the menu’s own pair item', async () => {
  const page = await harness.open(fleet())
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await page.locator('[data-deeptail-action="pair"]').click()
  // Pairing leaves the control plane for the picker, which lists what is paired
  // and offers the form a link is pasted into. The shell going away is what
  // tells this item's action from a menu that merely closed over it.
  await page.locator('[data-deeptail-picker]').waitFor({ state: 'visible' })
  expect(await page.locator('[data-deeptail-shell]').count()).toBe(0)
  await page.getByRole('button', { name: 'Pair a host' }).click()
  await page.locator('[data-deeptail-field="link"]').waitFor({ state: 'visible' })
  await page.close()
})

it('forgets the selected host through the native registry', async () => {
  const page = await harness.open(fleet())
  await page.waitForSelector('[data-deeptail-shell]')
  const registryReads = async (): Promise<number> =>
    (await harness.commands(page)).filter((command) => command === 'list_hosts').length
  const before = await registryReads()
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await page.locator('[data-deeptail-action="unpair"]').click()
  // Forgetting a host spends the native registry and comes back over the hosts
  // that are left, rather than editing the roster the page already holds.
  expect((await harness.commands(page)).filter((command) => command === 'forget_host')).toEqual(['forget_host'])
  await until(async () => (await registryReads()) > before)
  expect(await registryReads()).toBeGreaterThan(before)
  await page.locator('[data-deeptail-shell]').waitFor({ state: 'visible' })
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
  // operator has moved on. Focus stays where the pointer put it, so the
  // assertion names what does hold focus rather than what does not.
  await page.locator('.main-body').click()
  await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'detached' })
  expect(await page.locator('[data-deeptail-connection="trigger"]').getAttribute('aria-expanded')).toBe('false')
  expect(
    await page.evaluate(() => ({
      tag: document.activeElement?.tagName ?? '',
      connection:
        document.activeElement instanceof HTMLElement
          ? (document.activeElement.dataset['deeptailConnection'] ?? '')
          : '',
    })),
  ).toEqual({ tag: 'BODY', connection: '' })
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
  expect(
    await page.evaluate(() =>
      document.activeElement instanceof HTMLElement ? document.activeElement.dataset['deeptailConnection'] : undefined,
    ),
  ).toBe('trigger')
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
  await page.waitForFunction(
    () =>
      document.activeElement instanceof HTMLElement && document.activeElement.dataset['deeptailAction'] === 'drawer',
  )
  expect(await page.evaluate(() => document.querySelector('.main')?.matches('[inert]') ?? true)).toBe(false)
  await page.close()
})

it('closes the menu when focus leaves it without a pointer', async () => {
  const page = await harness.open(fleet())
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'visible' })
  // Not every departure is a Tab or a click: assistive technology and the
  // platform both move focus on their own. The event the browser would deliver
  // is delivered directly — without it the `focusin` listener could be deleted
  // with the whole suite still green.
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
