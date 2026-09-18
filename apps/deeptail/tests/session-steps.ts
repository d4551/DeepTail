/**
 * What a case does once a session is on the page: open it in the session's own
 * client, wait for the bar the client appends, and reach the boot notice the
 * application falls back to when the registry will not read.
 *
 * Kept beside `surfaces.ts` rather than in it: that module is the layer that
 * opens a surface, and this one is the layer a case drives afterwards.
 *
 * @module
 */

import type { Page } from 'playwright'
import { unreadableRegistry } from './fixtures.ts'
import type { Harness } from './harness.ts'
import { action, waitForState } from './page-steps.ts'
import { pairUntilBootNotice } from './pair-until.ts'
import { FLEET_ROW } from './surfaces.ts'

/** The bar the shell appends beside a booted client. */
const RETURN_BAR = '[data-deeptail-return]'

/**
 * Open the running session in the harness client, which replaces the page.
 * @param page - the page showing the shell with its roster row visible.
 */
export async function openRunningSession(page: Page): Promise<void> {
  await page.locator(`${FLEET_ROW} ${action('row-open')}`).click()
}

/**
 * Wait for the bar a booted client appends, which is the way back to the fleet.
 *
 * The bar is the client's own chrome rather than something the control plane
 * paints, so it exists only once a session has opened: a client that fails to
 * boot leaves the control plane and its own error instead, which is why the
 * wait is a step of its own rather than part of opening the session.
 * @param page - the page that opened a running session.
 */
export async function waitForReturnBar(page: Page): Promise<void> {
  await page.locator(RETURN_BAR).waitFor({ state: 'attached' })
}

/**
 * Open the application where it has fallen back to its boot notice.
 *
 * The registry refuses the read rather than being empty, so the notice is
 * reached by the product retrying and giving up, not by a fixture that started
 * broken.
 * @param harness - the suite's browser harness.
 * @returns the page, showing the notice.
 */
export async function openBootNotice(harness: Harness): Promise<Page> {
  const page = await harness.open(unreadableRegistry())
  await pairUntilBootNotice(page, 4)
  await waitForState(page, 'boot-error')
  return page
}
