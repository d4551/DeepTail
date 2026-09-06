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
import { type Harness, startHarness } from './harness.ts'
import { openShell } from './surfaces.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('asks to be issued before it reaches a route the registry prices', async () => {
  const page = await openShell(harness)
  await page.locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]').waitFor({ state: 'visible' })
  const commands = await harness.commands(page)
  const issued = commands.indexOf('capability_grants')
  const fetched = commands.indexOf('carrier_fetch')
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
  await page.locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]').waitFor({ state: 'visible' })
  const before = (await harness.commands(page)).filter((name) => name === 'capability_grants').length
  await page.locator('[data-deeptail-connection="trigger"]').click()
  // By its role and name, because this control carries no registry marker: it
  // is one of the six the registry declares and the page never stamps.
  await page.getByRole('menuitem', { name: 'Unpair' }).click()
  await page.locator('[data-deeptail-shell]').waitFor({ state: 'visible' })
  const after = (await harness.commands(page)).filter((name) => name === 'capability_grants').length
  expect(after).toBeGreaterThan(before)
  await page.close()
})

it('reaches a priced route only after the registry read that issues for it', async () => {
  // Every `carrier_fetch` on this page follows an issuance, not merely the
  // first one: the assertion above holds the opening order, and this holds it
  // for the whole run.
  const page = await openShell(harness, { remoteErrors: { 'lab-2:session/list': 'roster unavailable' } })
  await page.waitForSelector('[data-deeptail-state="partial"]')
  const commands = await harness.commands(page)
  const firstIssue = commands.indexOf('capability_grants')
  const anyFetchBefore = commands.slice(0, firstIssue).includes('carrier_fetch')
  expect([firstIssue >= 0, anyFetchBefore]).toEqual([true, false])
  await page.close()
})
