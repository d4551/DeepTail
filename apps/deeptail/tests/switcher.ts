/**
 * The host switcher's choreography: the control that opens it, the menu it
 * opens, and the states a suite drives it through.
 *
 * The shell openers it builds on live in `surfaces.ts`, so a suite that only
 * reads the shell is not loaded with this; what is here is what is specific to
 * the switcher.
 *
 * @module
 */

import type { Page } from 'playwright'
import type { Harness } from './harness.ts'
import type { OpenOptions } from './page-steps.ts'
import { type FleetFixture, openShell } from './surfaces.ts'

/** The switcher's control, which is painted with the shell and lives on. */
export const CONNECTION_TRIGGER = '[data-deeptail-connection="trigger"]'

/** The switcher's menu, which exists only while the switcher is open. */
export const CONNECTION_MENU = '[data-deeptail-connection="menu"]'

/**
 * Open the switcher on a page that is already showing the shell.
 *
 * Twelve suites drive this same two-step choreography, and a suite that states
 * it by hand can settle on a menu that has not painted yet — the click lands on
 * the trigger and the assertion races the paint. Stated once, the wait is part
 * of opening rather than something each case has to remember.
 * @param page - the page showing the shell.
 */
export async function showSwitcher(page: Page): Promise<void> {
  await page.locator(CONNECTION_TRIGGER).click()
  await page.locator(CONNECTION_MENU).waitFor({ state: 'visible' })
}

/**
 * Open the shell and the switcher over it, settled at the open state.
 * @param harness - the suite's browser harness.
 * @param fixture - the registry the page boots against.
 * @param view - the viewport and palette the case is measured under.
 * @returns the page, showing the shell with the switcher open.
 */
export async function openSwitcher(harness: Harness, fixture: FleetFixture = {}, view?: OpenOptions): Promise<Page> {
  const page = await openShell(harness, fixture, view)
  await showSwitcher(page)
  return page
}

/**
 * Wait until the switcher's menu has left the document.
 *
 * Dismissal is asserted by absence, and the absence is what the wait states: a
 * case that went on to read the trigger would otherwise read it while the menu
 * is still up.
 * @param page - the page showing the shell.
 */
export async function dismissSwitcher(page: Page): Promise<void> {
  await page.locator(CONNECTION_MENU).waitFor({ state: 'detached' })
}
