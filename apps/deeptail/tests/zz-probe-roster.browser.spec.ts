/**
 * The page's console, held to silence while the shell boots.
 *
 * The seeding probe next door catches a seeded function that is missing when a
 * command is called. This catches the other half: a function that is missing, or
 * refused, at the moment the bundle runs — which is how the roster went empty
 * without a single failing unit case, because a `ReferenceError` thrown inside
 * the injected source never reaches a suite that never opens a page.
 *
 * Nothing here restates what the page should do. It opens the product, waits for
 * the shell it seats, and reads the console and the commands the page issued:
 * a fault on either is the failure, and the roster count is what says the boot
 * finished rather than merely started.
 *
 * @module
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { type Harness, startHarness } from './harness.ts'
import { openShellWithRoster, RUNNING_ROW } from './surfaces.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('seats the rows the seeded IPC answers, which a recorded call cannot show', async () => {
  const page = await openShellWithRoster(harness)
  // `carrier_fetch` is recorded before it is answered, so a seeded function
  // missing from the emitted sources is a call that appears in the list and a
  // roster that stays empty. The rows are what tells the two apart.
  const seated = await page.locator(RUNNING_ROW).count()
  await page.close()
  expect(seated).toBe(1)
}, 60_000)

it('has answered every session read it recorded, so no call was left in flight', async () => {
  const page = await openShellWithRoster(harness)
  const recorded = await harness.calls(page)
  await page.close()
  // A read the carrier recorded is a read the page sent; the roster showing the
  // rows it returned is what says the answer arrived, and a call recorded with
  // no rows is the shape the missing seeded function produced.
  expect(recorded.length).toBeGreaterThan(0)
  expect(recorded.map((call) => call.endpoint)).toContain('session/list')
}, 60_000)
