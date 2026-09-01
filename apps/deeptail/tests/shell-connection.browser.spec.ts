/**
 * The host switcher: selection, dismissal, and the one host state that has a
 * recovery action.
 *
 * Every assertion is on rendered text and roles. The only substitution is the
 * Tauri IPC boundary, which no browser provides.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { HOSTS, oneHost, SESSIONS } from './fixtures.ts'
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
  expect(await page.locator('[data-deeptail-connection="menu"] [aria-current="true"]').count()).toBe(1)
  expect(await textOf(page, '[data-deeptail-connection="menu"] [aria-current="true"] .menu-label')).toBe('Workstation')
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
