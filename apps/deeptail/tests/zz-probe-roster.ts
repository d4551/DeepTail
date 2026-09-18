/**
 * The faults a page reports while it boots, and the boot held to silence.
 *
 * A bundle that throws inside the injected source empties the roster with no
 * failing unit case behind it: the `ReferenceError` happens in the page, and the
 * suite that never opens one never sees it. The two channels a page speaks
 * through are both read here — an uncaught error, and a console error a module
 * logged instead of throwing — and the case drives a real boot with them
 * attached before anything is awaited, so a fault raised by the boot itself is
 * caught rather than reported as silence.
 *
 * The collector is exported because the other browser suites open the product
 * too, and a second copy of these listeners would let one of them drift into
 * reading only half the channel.
 *
 * @module
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import type { Page } from 'playwright'
import { type Harness, startHarness } from './harness.ts'
import { openShellWithRoster, RUNNING_ROW } from './surfaces.ts'

/**
 * Watch one page's faults from the moment it is handed over.
 *
 * The listeners are attached before anything is awaited, so a fault raised by
 * the boot itself is caught: a collector attached once the shell had seated
 * would report silence for a page that had already thrown.
 * @param page - the page to watch.
 * @returns the faults it reports, in the order they arrive.
 */
export function collectFaults(page: Page): string[] {
  const faults: string[] = []
  page.on('pageerror', (fault) => {
    faults.push(String(fault))
  })
  page.on('console', (message) => {
    // `type()` passes nothing and is the console message's own member; the
    // superseded call the face refuses is the text-taking `type(text)`.
    if (message.type() === 'error') faults.push(`console: ${message.text()}`)
  })
  return faults
}

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('boots the shell with a fault on neither channel, and seats its rows', async () => {
  // The fault collector is attached to the page before the shell is awaited, so
  // what it holds is the boot's own report rather than a window that opened
  // after the interesting part had already happened.
  const page = await openShellWithRoster(harness)
  const faults = collectFaults(page)
  await page.locator(RUNNING_ROW).waitFor({ state: 'visible' })
  const seated = await page.locator(RUNNING_ROW).count()
  await page.close()
  expect(faults).toEqual([])
  expect(seated).toBe(1)
}, 60_000)
