/**
 * The host switcher: selection, dismissal, and the one host state that has a
 * recovery action.
 *
 * Every assertion is on rendered text and roles. The only substitution is the
 * Tauri IPC boundary, which no browser provides.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { fleet, HOSTS, oneHost, SESSIONS } from './fixtures.ts'
import { type Harness, startHarness, textOf } from './harness.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('marks the active host with a trailing check, not a fill', async () => {
  const page = await harness.open({ hosts: HOSTS, remote: { 'session/list': { items: SESSIONS } } })
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
  const page = await harness.open({ hosts: HOSTS, remote: { 'session/list': { items: SESSIONS } } })
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
    remote: { 'session/list': { items: SESSIONS } },
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
    remote: { 'session/list': { items: SESSIONS } },
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

it('dismisses the menu when focus leaves it', async () => {
  const page = await harness.open(fleet(), { mobile: true })
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-action="drawer"]').click()
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'visible' })
  // An open menu overlaps what is behind it, so it must not stay open once the
  // operator has moved on. The drawer toggle sits in the main pane, which the
  // open menu leaves reachable.
  await page.locator('[data-deeptail-action="drawer"]').focus()
  await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'detached' })
  expect(await page.locator('[data-deeptail-connection="trigger"]').getAttribute('aria-expanded')).toBe('false')
  await page.close()
})
