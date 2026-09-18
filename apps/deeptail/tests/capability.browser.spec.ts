/**
 * What the page does about the authority that decides its calls.
 *
 * The native half refuses a priced route the page holds no live grant for, and
 * it refuses it before the call reaches a host. A page that read the registry
 * and started fetching without asking to be issued would therefore have every
 * priced call refused — so the order is not a detail, it is the difference
 * between a working shell and one that reports every roster read as a failure.
 *
 * The scripted authority in `tauri-ipc.ts` mints the same shape the Rust one
 * does, from the same registry, so what is exercised here is the page's real
 * hydration rather than a stub the ledger would have accepted regardless.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import type { Page } from 'playwright'
import { type Harness, startHarness } from './harness.ts'
import { action, waitForState } from './page-steps.ts'
import { openShell, waitForRoster } from './surfaces.ts'
import { CONNECTION_TRIGGER } from './switcher.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

/**
 * The calls the page made, in the order it made them.
 * @param page - the page under test.
 * @returns the command names the recorded ledger holds.
 */
async function callsMade(page: Page): Promise<readonly string[]> {
  return await harness.commands(page)
}

it('asks to be issued before it reaches a route the registry prices', async () => {
  const page = await openShell(harness)
  await waitForRoster(page)
  const calls = await callsMade(page)
  const issued = calls.indexOf('capability_grants')
  const fetched = calls.indexOf('carrier_fetch')
  expect(issued).toBeGreaterThanOrEqual(0)
  expect(fetched).toBeGreaterThanOrEqual(0)
  // Both happened, and issuance came first. An index comparison alone would
  // read -1 < n as "in order" for a page that never asked at all.
  expect(issued).toBeLessThan(fetched)
  await page.close()
})

it('asks again whenever the pairing set is read again', async () => {
  // Issuance is scoped to the hosts that exist when it is taken, and it is the
  // whole of what may be spent rather than an addition to it. A page that
  // issued once at boot would hold authority over a host it has since
  // forgotten, and none over one it has just paired.
  const page = await openShell(harness)
  await waitForRoster(page)
  const before = (await callsMade(page)).filter((name) => name === 'capability_grants').length
  await page.locator(CONNECTION_TRIGGER).click()
  // The switcher's own unpair item, driven by the marker the registry
  // `connection.unpair` carries on it. Forgetting a host reads the registry
  // again, and that read is where the page is issued anew for the hosts that
  // are left.
  await page.locator(action('unpair')).click()
  await page.locator('[data-deeptail-shell]').waitFor({ state: 'visible' })
  const calls = await callsMade(page)
  expect(calls.filter((name) => name === 'forget_host')).toEqual(['forget_host'])
  const after = calls.filter((name) => name === 'capability_grants').length
  expect(after).toBeGreaterThan(before)
  await page.close()
})

it('reaches a priced route only after the registry read that issues for it', async () => {
  // Every `carrier_fetch` on this page follows an issuance, not merely the
  // first one: the assertion above holds the opening order, and this holds it
  // for the whole run.
  const page = await openShell(harness, { remoteErrors: { 'lab-2:session/list': 'roster unavailable' } })
  await waitForState(page, 'partial')
  const calls = await callsMade(page)
  const firstIssue = calls.indexOf('capability_grants')
  const anyFetchBefore = calls.slice(0, firstIssue).includes('carrier_fetch')
  expect([firstIssue >= 0, anyFetchBefore]).toEqual([true, false])
  await page.close()
})
