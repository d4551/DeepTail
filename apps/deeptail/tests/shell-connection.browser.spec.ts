/**
 * The host switcher: selection, dismissal, and the one host state that has a
 * recovery action.
 *
 * Every assertion is on rendered text, roles and focus, driven through the real
 * controls. The only substitution is the Tauri IPC boundary, which no browser
 * provides.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import type { Page } from 'playwright'
import { HOSTS, oneHost } from './fixtures.ts'
import { type Harness, startHarness, textOf } from './harness.ts'
import { openShell } from './surfaces.ts'
import { CONNECTION_MENU, CONNECTION_TRIGGER, dismissSwitcher, openSwitcher, showSwitcher } from './switcher.ts'
import { until } from './wait.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

/**
 * The cases that all begin on the same scene: the paired fleet with the
 * switcher open.
 *
 * The scene is opened once, here, rather than restated per case — the seven
 * hand-written copies had already drifted, and each had to remember that the
 * menu paints a frame after the press.
 */
describe('the switcher over the paired fleet', () => {
  let page: Page

  beforeEach(async () => {
    page = await openSwitcher(harness)
  })

  afterEach(async () => {
    await page.close()
  })

  it('marks the active host with a trailing check, not a fill', async () => {
    const menu = page.locator(CONNECTION_MENU)
    expect(await menu.getAttribute('role')).toBe('menu')
    // Choosing one host from a set is a radio group, so the selection is spoken
    // as a checked state rather than drawn as a fill.
    expect(await menu.locator('[aria-checked="true"]').count()).toBe(1)
    expect(await textOf(page, `${CONNECTION_MENU} [aria-checked="true"] .menu-label`)).toBe('Workstation')
    expect(await menu.locator('[role="menuitemradio"]').count()).toBe(HOSTS.length)
    await harness.shoot(page, 'connection-menu')
  })

  it('closes the connection menu on Escape', async () => {
    const trigger = page.locator(CONNECTION_TRIGGER)
    expect(await trigger.getAttribute('aria-expanded')).toBe('true')
    await page.keyboard.press('Escape')
    expect(await trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('takes the rows the open menu covers out of play', async () => {
    // A row the menu overlaps is partially covered, so it is not a target while
    // the menu is open. The browser refuses the press for the same reason this
    // counts: the row sits inside a subtree the menu marked inert.
    const covered = page.locator('[inert] [data-deeptail-session="s-running"] .session-open')
    // Every control the running row carries, not a hand-counted one: what the
    // case proves is that none of them is reachable while the menu is over them.
    expect(await covered.count()).toBeGreaterThan(0)
    await page.locator(CONNECTION_TRIGGER).click()
    await dismissSwitcher(page)
    // Dismissing the menu puts them back.
    expect(await covered.count()).toBe(0)
  })
})

/**
 * The cases that begin on the same scene and go on to spend the menu: an item
 * that leaves the shell for the picker, and the dismissals that decide where
 * focus lands afterwards.
 */
describe('the switcher’s items and the focus it leaves', () => {
  let page: Page

  beforeEach(async () => {
    page = await openSwitcher(harness)
  })

  afterEach(async () => {
    await page.close()
  })

  it('opens the picker from the menu’s own pair item', async () => {
    await page.locator('[data-deeptail-action="pair"]').click()
    // Pairing leaves the control plane for the picker, which lists what is
    // paired and offers the form a link is pasted into. The shell going away is
    // what tells this item's action from a menu that merely closed over it.
    await page.locator('[data-deeptail-picker]').waitFor({ state: 'visible' })
    expect(await page.locator('[data-deeptail-shell]').count()).toBe(0)
    await page.getByRole('button', { name: 'Pair a host' }).click()
    await page.locator('[data-deeptail-field="link"]').waitFor({ state: 'visible' })
  })

  it('dismisses the menu when a pointer lands outside it, without taking focus back', async () => {
    // An open menu overlaps what is behind it, so it must not stay open once the
    // operator has moved on. Focus stays where the pointer put it, so what this
    // names is the control that must not be holding it.
    await page.locator('.main-body').click()
    await dismissSwitcher(page)
    expect(await page.locator(`${CONNECTION_TRIGGER}:focus`).count()).toBe(0)
  })

  it('hands focus back to the trigger when the operator dismisses from inside', async () => {
    // Escape is a dismissal the operator made from inside the menu, so it
    // returns them to the control they opened it from.
    await page.keyboard.press('Escape')
    await page.locator(`${CONNECTION_TRIGGER}:focus`).waitFor({ state: 'attached' })
  })

  it('closes the menu when the operator presses the trigger a second time', async () => {
    // The trigger is the menu's own switch, so a second press on it is a
    // dismissal the operator made deliberately — which is why focus comes back
    // to the control they pressed rather than staying where the menu left it.
    await page.locator(CONNECTION_TRIGGER).click()
    await page.locator(`${CONNECTION_TRIGGER}:focus`).waitFor({ state: 'attached' })
  })
})

it('reports a revoked token as needing re-pairing and offers the way out', async () => {
  const page = await openShell(harness, oneHost({ remoteStatuses: { 'session/list': 401 } }))
  // The state is spoken, not merely coloured, so the dot is never the only cue.
  expect(await textOf(page, '.connection-trigger')).toContain('Needs re-pairing')
  await showSwitcher(page)
  expect(await textOf(page, '[data-deeptail-action="repair"]')).toBe('Re-pair this host')
  await harness.shoot(page, 'connection-unauthorized')
  await page.close()
})

it('keeps the operator on their row when a fleet event repaints the open menu', async () => {
  const page = await openSwitcher(harness, { muxHosts: HOSTS.map((host) => host.id) })
  await page.keyboard.press('ArrowDown')
  // Focus is read off the document's own focus target rather than a handle held
  // across the repaint: the rebuild replaces the nodes, and a handle taken
  // before it would name the row that used to hold focus.
  const spoken = page.locator(':focus')
  expect(await spoken.count()).toBe(1)
  expect((await spoken.textContent()) ?? '').toContain('Lab box')
  // A forwarded event repaints the switcher — the roster's own rebuild keeps
  // focus by row, and the menu owes the operator the same rather than yanking
  // them back to the first host every time a row arrives.
  await harness.forward(page, 'api-session/added', [
    { sessionId: 's-arrived', updatedAt: Date.now(), running: false, blank: false },
  ])
  await page.locator('[data-deeptail-session="s-arrived"]').waitFor({ state: 'visible' })
  expect(await spoken.count()).toBe(1)
  expect((await spoken.textContent()) ?? '').toContain('Lab box')
  await page.close()
})

it('makes the host a menu row names the selected one', async () => {
  const page = await openShell(harness)
  // The selection is the plane's own active-host fact, and choosing a host
  // re-reads that host's roster rather than leaving the snapshot a passing
  // outage left behind. Both are read around the press, so what moved is what
  // the action did rather than what the page already held.
  const rosterReads = async (host: string): Promise<number> =>
    (await harness.calls(page)).filter((call) => call.host === host && call.endpoint === 'session/list').length
  const menu = page.locator(CONNECTION_MENU)
  expect(await textOf(page, '.connection-label')).toBe('Workstation')
  const before = await rosterReads('lab-2')
  await showSwitcher(page)
  await menu.locator('[data-deeptail-host="lab-2"][data-deeptail-action="select-host"]').click()
  expect(await textOf(page, '.connection-label')).toBe('Lab box')
  await until(async () => (await rosterReads('lab-2')) > before)
  expect(await rosterReads('lab-2')).toBeGreaterThan(before)
  await showSwitcher(page)
  expect(await menu.locator('[data-deeptail-host="lab-2"]').getAttribute('aria-checked')).toBe('true')
  expect(await menu.locator('[data-deeptail-host="dev-1"]').getAttribute('aria-checked')).toBe('false')
  await page.close()
})

it('forgets the selected host through the native registry', async () => {
  const page = await openShell(harness)
  const registryReads = async (): Promise<number> =>
    (await harness.commands(page)).filter((command) => command === 'list_hosts').length
  const before = await registryReads()
  await showSwitcher(page)
  await page.locator('[data-deeptail-action="unpair"]').click()
  // Forgetting a host spends the native registry and comes back over the hosts
  // that are left, rather than editing the roster the page already holds.
  expect((await harness.commands(page)).filter((command) => command === 'forget_host')).toEqual(['forget_host'])
  await until(async () => (await registryReads()) > before)
  expect(await registryReads()).toBeGreaterThan(before)
  await page.locator('.group-name').first().waitFor({ state: 'visible' })
  await page.close()
})

it('opens the pairing form under the name of the host being re-paired', async () => {
  const page = await openShell(harness, { remoteStatuses: { 'lab-2:session/list': 401 } })
  await showSwitcher(page)
  await page.locator('[data-deeptail-action="repair"]').click()
  await page.locator('[data-deeptail-field="link"]').waitFor({ state: 'visible' })
  // Re-pairing replaces the record it names, so the form carries that host's
  // name rather than opening blank for whatever is pasted next.
  expect(await page.locator('[data-deeptail-field="name"]').inputValue()).toBe('Lab box')
  await page.close()
})

it('holds the pane behind the open drawer out of reach', async () => {
  const page = await openShell(harness, {}, { mobile: true })
  await page.locator('[data-deeptail-action="drawer"]').click()
  // Opening moves focus into the drawer on the next frame, so the assertion
  // waits for that rather than racing it.
  await page.locator('.sidebar :focus').waitFor({ state: 'attached' })
  // The scrim covers the whole main pane, the drawer toggle included, so a
  // control left focusable behind it is one the reader can reach but neither
  // see nor click. The pane is inert while the drawer is open, and the browser
  // refuses the focus a control inside it would otherwise take.
  expect(await page.locator('.main').getAttribute('inert')).not.toBeNull()
  await page.locator('[data-deeptail-action="drawer"]').focus()
  expect(await page.locator('.main :focus').count()).toBe(0)
  // Escape and the scrim both sit outside the inert pane, so the drawer always
  // has a way out, and closing it hands the toggle back.
  await page.keyboard.press('Escape')
  await page.locator('[data-deeptail-action="drawer"]:focus').waitFor({ state: 'attached' })
  expect(await page.locator('.main').getAttribute('inert')).toBeNull()
  await page.close()
})

it('lets a finger close the drawer it opened', async () => {
  const page = await openShell(harness, {}, { mobile: true })
  await page.locator('[data-deeptail-action="drawer"]').click()
  await page.locator('[data-deeptail-action="drawer-dismiss"]').waitFor({ state: 'visible' })
  // The open drawer covers the header the toggle renders in, so the toggle is
  // behind it and a tap there reaches the drawer instead. There is no Escape
  // key on a phone, so the drawer carries its own dismissal — and a real click,
  // not a programmatic focus, is what proves it can be reached.
  await page.locator('[data-deeptail-action="drawer-dismiss"]').click()
  await page.locator('[data-deeptail-action="drawer-dismiss"]').waitFor({ state: 'hidden' })
  expect(await page.locator('[data-deeptail-action="drawer"]:focus').count()).toBe(1)
  expect(await page.locator('.main').getAttribute('inert')).toBeNull()
  await page.close()
})
