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
import { oneHost } from './fixtures.ts'
import { type Harness, startHarness } from './harness.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('boots the shell with nothing on the console and every command answered', async () => {
  const page = await harness.open(oneHost())
  const faults: string[] = []
  page.on('pageerror', (fault) => {
    faults.push(String(fault))
  })
  page.on('console', (message) => {
    if (message.type() === 'error') faults.push(`console: ${message.text()}`)
  })
  await page.waitForSelector('[data-deeptail-shell]')
  // The boot's own work is not done when the shell is attached: the registry, the
  // grant table and the roster read all land after it, and a fault in any of them
  // arrives on the console rather than as a missing element.
  await page.locator('[data-deeptail-session="s-running"]').waitFor({ state: 'visible' })
  const commands = await harness.commands(page)
  const seated = await page.locator('[data-deeptail-session]').count()
  await page.close()
  expect(faults).toEqual([])
  expect(commands).toContain('carrier_fetch')
  expect(seated).toBe(2)
}, 60_000)

it('has answered every session read it recorded, so no call was left in flight', async () => {
  const page = await harness.open(oneHost())
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-session="s-running"]').waitFor({ state: 'visible' })
  const recorded = await harness.calls(page)
  await page.close()
  // A read the carrier recorded is a read the page sent; the roster showing the
  // rows it returned is what says the answer arrived, and a call recorded with
  // no rows is the shape the missing seeded function produced.
  expect(recorded.length).toBeGreaterThan(0)
  expect(recorded.map((call) => call.endpoint)).toContain('session/list')
}, 60_000)
