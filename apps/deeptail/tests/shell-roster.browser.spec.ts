/**
 * The roster the control plane exists to render: sessions from every paired host,
 * grouped by host, and each of the four states it can be in.
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

it('lists a host and its sessions, announcing run state as text', async () => {
  const page = await harness.open(oneHost())
  await page.waitForSelector('[data-deeptail-shell]')
  expect(await textOf(page, '.group-name')).toBe('Workstation')
  expect(await textOf(page, '[data-deeptail-session="s-running"] .session-title')).toBe('Refactor the loader')
  // The dot is aria-hidden, so run state has to reach a reader as text.
  expect(await textOf(page, '[data-deeptail-session="s-running"] .visually-hidden')).toBe('Running')
  expect(await textOf(page, '[data-deeptail-session="s-idle"] .visually-hidden')).toBe('Idle')
  await harness.shoot(page, 'shell-ready')
  await page.close()
})

it('offers Stop only on a running session', async () => {
  const page = await harness.open(oneHost())
  await page.waitForSelector('[data-deeptail-shell]')
  expect(await page.locator('[data-deeptail-session="s-running"] [data-deeptail-action="row-stop"]').count()).toBe(1)
  expect(await page.locator('[data-deeptail-session="s-idle"] [data-deeptail-action="row-stop"]').count()).toBe(0)
  await page.close()
})

it('groups sessions by host across the fleet', async () => {
  const page = await harness.open({ hosts: HOSTS, remote: { 'session/list': { items: SESSIONS } } })
  await page.waitForSelector('[data-deeptail-shell]')
  expect(await page.locator('.host-group').count()).toBe(2)
  const names = await page.locator('.group-name').allTextContents()
  expect(names).toEqual(['Workstation', 'Lab box'])
  await harness.shoot(page, 'fleet-multi-host')
  await page.close()
})

it('keeps working hosts visible when one fails', async () => {
  const page = await harness.open({
    hosts: HOSTS,
    remote: { 'session/list': { items: SESSIONS } },
    // Scoped to one host, or this is a total outage wearing the name of a
    // partial one and the assertions below cannot tell the difference.
    remoteErrors: { 'lab-2:session/list': 'roster unavailable' },
  })
  await page.waitForSelector('[data-deeptail-state="partial"]')
  // Partial failure is a warning beside content, never a blanked screen: the
  // host that answered must still be showing its rows.
  expect(await textOf(page, '[data-deeptail-state="partial"]')).toContain('roster unavailable')
  expect(await page.locator('[data-deeptail-state="partial"]').count()).toBe(1)
  expect(await textOf(page, '[data-deeptail-session="s-running"] .session-title')).toBe('Refactor the loader')
  expect(await page.locator('.session-row').count()).toBe(SESSIONS.length)
  await harness.shoot(page, 'fleet-partial-failure')
  await page.close()
})

it('shows loading, never empty, while a roster read is still in flight', async () => {
  const page = await harness.open({
    hosts: HOSTS.slice(0, 1),
    remote: { 'session/list': { items: [] } },
    remotePending: ['session/list'],
  })
  await page.waitForSelector('[data-deeptail-shell]')
  // The read never settles, so the anti-flash rule is observable: an empty
  // roster must read as loading until its list actually resolves.
  expect(await textOf(page, '[data-deeptail-state="loading"]')).toBe('Loading sessions…')
  expect(await page.locator('[data-deeptail-state="empty"]').count()).toBe(0)
  await harness.shoot(page, 'fleet-loading')
  await page.close()
})

it('reads an empty roster as loading until it settles', async () => {
  const page = await harness.open({ hosts: HOSTS.slice(0, 1), remote: { 'session/list': { items: [] } } })
  await page.waitForSelector('[data-deeptail-state="empty"]')
  expect(await textOf(page, '[data-deeptail-state="empty"]')).toBe('No sessions on this host yet.')
  await harness.shoot(page, 'fleet-empty')
  await page.close()
})

it('renders the dark palette and the sidebar fill from the harness tokens', async () => {
  const page = await harness.open(oneHost(), { dark: true })
  await page.waitForSelector('[data-deeptail-shell]')
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(21, 21, 23)')
  expect(
    await page.evaluate(() => {
      const sidebar = document.querySelector('.sidebar')
      return sidebar === null ? '' : getComputedStyle(sidebar).backgroundColor
    }),
  ).toBe('rgb(27, 27, 28)')
  await harness.shoot(page, 'shell-dark')
  await page.close()
})

it('fits a phone viewport without horizontal overflow', async () => {
  const page = await harness.open(oneHost(), { mobile: true })
  await page.waitForSelector('[data-deeptail-shell]')
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(
    false,
  )
  await harness.shoot(page, 'shell-mobile')
  await page.close()
})

it('drives native chrome from the same attribute as the palette', async () => {
  const light = await harness.open(fleet())
  await light.waitForSelector('[data-deeptail-shell]')
  // `color-scheme` is a stylesheet rule keyed off the dark attribute, so the UA
  // widgets and the palette cannot disagree.
  expect(await light.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('light')
  expect(await light.evaluate(() => document.body.dataset.dsDarkTheme !== undefined)).toBe(false)
  await light.close()

  const dark = await harness.open(fleet(), { dark: true })
  await dark.waitForSelector('[data-deeptail-shell]')
  expect(await dark.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('dark')
  expect(await dark.evaluate(() => document.body.dataset.dsDarkTheme !== undefined)).toBe(true)
  await dark.close()
})
