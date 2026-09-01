/**
 * The first-run pairing screen, driven in Chromium against the built bundle.
 *
 * The picker is reached only when no host is paired; once one is, the shell
 * takes over. These cases therefore all start from an empty registry.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import type { Page } from 'playwright'
import { HOSTS } from './fixtures.ts'
import { type AnswerTable, type Harness, startHarness, textOf } from './harness.ts'

let harness: Harness

/**
 * Reach the picker's list view the way the product does: from a mounted shell,
 * by asking to pair another host.
 * @param extra - answer-table overrides for the case.
 * @returns the page, with the list rendered.
 */
async function openPickerFromShell(extra: Partial<AnswerTable> = {}): Promise<Page> {
  const page = await harness.open({ hosts: HOSTS, remote: { 'session/list': { items: [] } }, ...extra })
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await page.getByRole('menuitem', { name: 'Pair a host' }).click()
  await page.waitForSelector('[data-deeptail-state="ready"]')
  return page
}

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('shows the empty state, not a bare list, when nothing is paired', async () => {
  const page = await harness.open({ hosts: [] })
  expect(await textOf(page, '[data-deeptail-state="empty"]')).toBe('No hosts paired yet.')
  expect(await page.locator('button.button-primary').textContent()).toBe('Pair a host')
  // The empty screen is the call to action; there is no list to choose from.
  expect(await page.locator('[role="list"]').count()).toBe(0)
  await harness.shoot(page, 'picker-empty')
  await page.close()
})

it('rejects an empty pairing link before calling the host', async () => {
  const page = await harness.open({ hosts: [] })
  await page.locator('button.button-primary').click()
  await page.locator('[data-deeptail-action="pair-submit"]').click()
  expect(await textOf(page, '[role="alert"]')).toContain('Paste the whole link.')
  await harness.shoot(page, 'picker-validation')
  await page.close()
})

it('reports a rejected pairing without losing what was typed', async () => {
  const page = await harness.open({ hosts: [], pairError: 'host refused the launch token' })
  await page.locator('button.button-primary').click()
  await page.locator('[data-deeptail-field="link"]').fill('https://harness.local:3080/?token=abc')
  await page.locator('[data-deeptail-action="pair-submit"]').click()
  expect(await textOf(page, '[role="alert"]')).toContain('host refused the launch token')
  // A failed send must not cost the operator what they typed.
  expect(await page.locator('[data-deeptail-field="link"]').inputValue()).toBe('https://harness.local:3080/?token=abc')
  await harness.shoot(page, 'picker-error')
  await page.close()
})

it('lists every paired host with its origin and spoken state', async () => {
  const page = await openPickerFromShell()
  // Rendered text, not a fixture echo: label, origin and the state a screen
  // reader hears beside the decorative dot.
  expect(await page.locator('.row-label').allTextContents()).toEqual(['Workstation', 'Lab box'])
  expect(await page.locator('.row-origin').allTextContents()).toEqual([
    'https://harness.local:3080',
    'https://lab.internal:3080',
  ])
  // `select_host` answers, so the probe resolves the row to a reachable host.
  expect(await textOf(page, '[data-deeptail-host="dev-1"] .visually-hidden')).toBe('Online')
  await harness.shoot(page, 'picker-list')
  await page.close()
})

it('moves the roving tab stop across host rows', async () => {
  const page = await openPickerFromShell()
  await page.locator('[data-deeptail-host="dev-1"]').focus()
  await page.keyboard.press('ArrowDown')
  expect(await page.evaluate(() => document.activeElement?.textContent?.trim() ?? null)).toContain('Lab box')
  await page.keyboard.press('Home')
  expect(await page.evaluate(() => document.activeElement?.textContent?.trim() ?? null)).toContain('Workstation')
  await page.close()
})

it('resolves the chosen host and clears the picker', async () => {
  const page = await openPickerFromShell()
  await page.locator('[data-deeptail-host="lab-2"]').click()
  // Choosing a host hands the page to the shell, which is the only way the
  // picker can be dismissed.
  await page.waitForSelector('[data-deeptail-shell]')
  expect(await page.locator('[data-deeptail-picker]').count()).toBe(0)
  await page.close()
})

it('reports a host that cannot be reached as needing re-pairing', async () => {
  const page = await openPickerFromShell({ selectError: 'device token rejected' })
  // `select_host` failing is what the picker turns into the unauthorized dot.
  expect(await textOf(page, '[data-deeptail-host="dev-1"] .visually-hidden')).toBe('Needs re-pairing')
  await harness.shoot(page, 'picker-unauthorized')
  await page.close()
})

it('shows a retryable alert when the host list cannot be read', async () => {
  const page = await harness.open({ listError: 'registry unavailable' })
  const strip = page.locator('[data-deeptail-state="error"]')
  await strip.waitFor({ state: 'visible' })
  expect(await strip.getAttribute('role')).toBe('alert')
  // The host's own message is shown rather than a generic stand-in.
  expect(await textOf(page, '[data-deeptail-state="error"]')).toContain('registry unavailable')
  // Retry re-reads the registry rather than merely being present: the number of
  // registry reads has to go up. Asserting that some call had happened would
  // pass with the handler removed, because the first read already happened.
  const reads = async (): Promise<number> =>
    (await harness.commands(page)).filter((command) => command === 'list_hosts').length
  const before = await reads()
  await page.getByRole('button', { name: 'Retry' }).click()
  await page.waitForFunction(
    (had: number) =>
      ((window as unknown as { deeptailInvokedCommands?: string[] }).deeptailInvokedCommands ?? []).filter(
        (command) => command === 'list_hosts',
      ).length > had,
    before,
  )
  expect(await reads()).toBeGreaterThan(before)
  await page.locator('[data-deeptail-state="error"]').waitFor({ state: 'visible' })
  await harness.shoot(page, 'picker-list-error')
  await page.close()
})

it('translates into Chinese for a zh browser', async () => {
  const page = await harness.open({ hosts: [] }, { locale: 'zh-CN' })
  expect(await textOf(page, '[data-deeptail-state="empty"]')).toBe('尚未配对任何主机。')
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('zh-CN')
  await harness.shoot(page, 'picker-zh')
  await page.close()
})

it('renders the dark palette from the harness tokens', async () => {
  const page = await harness.open({ hosts: [] }, { dark: true })
  await page.waitForSelector('[data-deeptail-state="empty"]')
  expect(await page.evaluate(() => document.body.dataset.dsDarkTheme !== undefined)).toBe(true)
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(21, 21, 23)')
  await harness.shoot(page, 'picker-dark')
  await page.close()
})
