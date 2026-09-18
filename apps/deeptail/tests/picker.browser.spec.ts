/**
 * The first-run pairing screen, driven in Chromium against the built bundle.
 *
 * The picker is reached only when no host is paired; once one is, the shell
 * takes over. These cases therefore all start from an empty registry.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import type { Page } from 'playwright'
import { HOSTS } from './fixtures.ts'
import { type Harness, startHarness, textOf } from './harness.ts'
import { choosePairHost, openPairForm, openPicker, PAIR_BUTTON, submitPairing, waitForState } from './page-steps.ts'
import { openBootNotice } from './session-steps.ts'
import { type FleetFixture, openShell, waitForLiveShell } from './surfaces.ts'
import { showSwitcher } from './switcher.ts'
import { until } from './wait.ts'

let harness: Harness

/** The origins the two fixture hosts report, in the order the list renders them. */
const ORIGINS = ['https://harness.local:3080', 'https://lab.internal:3080']

/**
 * Reach the picker's list view the way the product does: from a mounted shell,
 * by asking to pair another host.
 * @param extra - answer-table overrides for the case.
 * @returns the page, with the list rendered.
 */
async function showPicker(extra: FleetFixture = {}): Promise<Page> {
  const page = await openShell(harness, { remote: { 'session/list': { items: [] } }, ...extra })
  await showSwitcher(page)
  await choosePairHost(page)
  return page
}

/**
 * Key the picker's list, wait for the repaint a settling probe causes, and read
 * where the keys go from there.
 *
 * Every paired host's reachability answers a few frames after the rows are
 * drawn, and each answer repaints the card. A repaint that took the focused row
 * out of the document left focus on the body, where no arrow key reaches a stop
 * at all — so the case keys the list first and reads the stop after the repaint.
 * @param page - the page showing the picker's list.
 */
async function verifyStopSurvivesRepaint(page: Page): Promise<void> {
  await page.locator('[data-deeptail-host="dev-1"]').focus()
  await page.keyboard.press('ArrowDown')
  await page.waitForFunction(
    () => document.querySelector('[data-deeptail-host="lab-2"] .visually-hidden')?.textContent === 'Online',
    undefined,
    { timeout: 5000 },
  )
  const focused = page.locator(':focus')
  expect((await focused.textContent()) ?? '').toContain('Lab box')
  await page.keyboard.press('Home')
  expect((await focused.textContent()) ?? '').toContain('Workstation')
}

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('shows the empty state, not a bare list, when nothing is paired', async () => {
  const page = await openPicker(harness)
  expect(await textOf(page, '[data-deeptail-state="empty"]')).toBe('No hosts paired yet.')
  expect(await page.locator(PAIR_BUTTON).textContent()).toBe('Pair a host')
  // The empty screen is the call to action; there is no list to choose from.
  expect(await page.locator('[role="list"]').count()).toBe(0)
  await harness.shoot(page, 'picker-empty')
  await page.close()
})

it('pairs a pasted link through the native command, not by closing the form', async () => {
  const workstation = HOSTS[0]
  if (workstation === undefined) throw new Error('HOSTS is empty')
  const page = await openPicker(harness, { paired: workstation })
  await openPairForm(page)
  await page.locator('[data-deeptail-field="link"]').fill('https://harness.local:3080/?token=abc')
  await page.locator('[data-deeptail-field="name"]').fill('Workstation')
  await submitPairing(page)
  // The form closing is not the assertion: the command the submit spent and
  // the link it carried are what the product did.
  expect((await harness.commands(page)).filter((command) => command === 'pair_host')).toEqual(['pair_host'])
  expect(await page.evaluate(() => window.deeptailPairedLinks ?? [])).toEqual(['https://harness.local:3080/?token=abc'])
  await waitForLiveShell(page)
  await page.close()
})

it('rejects an empty pairing link before calling the host', async () => {
  const page = await openPicker(harness)
  await openPairForm(page)
  await submitPairing(page)
  expect(await textOf(page, '[role="alert"]')).toContain('Paste the whole link.')
  await harness.shoot(page, 'picker-validation')
  await page.close()
})

it('reports a rejected pairing without losing what was typed', async () => {
  const page = await openPicker(harness, { pairError: 'host refused the launch token' })
  await openPairForm(page)
  await submitPairing(page, 'https://harness.local:3080/?token=abc')
  expect(await textOf(page, '[role="alert"]')).toContain('host refused the launch token')
  // A failed send must not cost the operator what they typed.
  expect(await page.locator('[data-deeptail-field="link"]').inputValue()).toBe('https://harness.local:3080/?token=abc')
  await harness.shoot(page, 'picker-error')
  await page.close()
})

/**
 * The cases that begin on the picker's list view over the paired fleet.
 *
 * The view is reached once, here, rather than restated per case: reaching it
 * means mounting the shell and asking it to pair another host, which every copy
 * had to remember in full.
 */
describe('the picker list', () => {
  let page: Page

  beforeEach(async () => {
    page = await showPicker()
  })

  afterEach(async () => {
    await page.close()
  })

  it('lists every paired host with its origin and spoken state', async () => {
    expect(await page.locator('.row-label').allTextContents()).toEqual(['Workstation', 'Lab box'])
    expect(await page.locator('.row-origin').allTextContents()).toEqual(ORIGINS)
    // `select_host` answers, so the probe resolves the row to a reachable host.
    // Each row's probe settles a few frames after the list paints, so the read
    // must wait for the settled word rather than race the first paint.
    await page.waitForFunction(
      () => document.querySelector('[data-deeptail-host="dev-1"] .visually-hidden')?.textContent === 'Online',
      undefined,
      { timeout: 5000 },
    )
    // The live region announces the host count — hosts, not sessions, which is
    // what a count announced through the sessions dictionary said.
    expect(await page.locator('[data-deeptail-picker] [role="status"]').textContent()).toBe('2 hosts')
    await harness.shoot(page, 'picker-list')
  })

  it('moves the roving tab stop across host rows', async () => {
    // Focus is read off the document's own focus target, so what the keys moved
    // is what the case reads.
    const focused = page.locator(':focus')
    await page.locator('[data-deeptail-host="dev-1"]').focus()
    await page.keyboard.press('ArrowDown')
    expect((await focused.textContent()) ?? '').toContain('Lab box')
    await page.keyboard.press('Home')
    expect((await focused.textContent()) ?? '').toContain('Workstation')
  })

  it('keeps the stop answering the keys when the list repaints under the reader', async () => {
    await verifyStopSurvivesRepaint(page)
  })

  it('resolves the chosen host and clears the picker', async () => {
    await page.locator('[data-deeptail-host="lab-2"]').click()
    // Choosing a host hands the page to the shell: the only dismissal there is.
    await waitForLiveShell(page)
    expect(await page.locator('[data-deeptail-picker]').count()).toBe(0)
  })
})

it('reports a host that cannot be reached as needing re-pairing', async () => {
  const page = await showPicker({ selectError: 'device token rejected' })
  // `select_host` failing is what the picker turns into the unauthorized dot.
  expect(await textOf(page, '[data-deeptail-host="dev-1"] .visually-hidden')).toBe('Needs re-pairing')
  await harness.shoot(page, 'picker-unauthorized')
  await page.close()
})

it('shows a retryable alert when the host list cannot be read', async () => {
  const page = await harness.open({ listError: 'registry unavailable' })
  const strip = page.locator('[data-deeptail-state="error"]')
  await waitForState(page, 'error')
  expect(await strip.getAttribute('role')).toBe('alert')
  // The host's own message is shown rather than a generic stand-in.
  expect(await textOf(page, '[data-deeptail-state="error"]')).toContain('registry unavailable')
  const reads = async (): Promise<number> =>
    (await harness.commands(page)).filter((command) => command === 'list_hosts').length
  const before = await reads()
  await page.getByRole('button', { name: 'Retry' }).click()
  // Retry re-reads the registry rather than merely being present: the number of
  // registry reads has to go up, watched through the recorded invocations the
  // harness already exposes. Asserting that some call had happened would pass
  // with the handler removed, because the first read already happened.
  await until(async () => (await reads()) > before)
  expect(await reads()).toBeGreaterThan(before)
  await page.locator('[data-deeptail-state="error"]').waitFor({ state: 'visible' })
  await harness.shoot(page, 'picker-list-error')
  await page.close()
})

it('translates into Chinese for a zh browser', async () => {
  const page = await openPicker(harness, {}, { locale: 'zh-CN' })
  expect(await textOf(page, '[data-deeptail-state="empty"]')).toBe('尚未配对任何主机。')
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('zh-CN')
  await harness.shoot(page, 'picker-zh')
  await page.close()
})

it('renders the dark palette from the harness tokens', async () => {
  const page = await openPicker(harness, {}, { dark: true })
  expect(await page.evaluate(() => document.body.dataset['dsDarkTheme'] !== undefined)).toBe(true)
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(21, 21, 23)')
  await harness.shoot(page, 'picker-dark')
  await page.close()
})

it('retries the registry from the boot notice through the named action', async () => {
  const page = await openBootNotice(harness)
  const reads = async (): Promise<number> =>
    (await harness.commands(page)).filter((command) => command === 'list_hosts').length
  const before = await reads()
  await page.locator('[data-deeptail-action="boot-retry"]').click()
  await until(async () => (await reads()) > before)
  expect(await reads()).toBeGreaterThan(before)
  await page.close()
})
