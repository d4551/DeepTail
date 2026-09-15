/**
 * Pair through the picker until the boot notice appears, or the rounds run out.
 *
 * Two suites drive the same pairing flow — the marker census and the picker's
 * own cases — so the recursion lives here once. Written as one round calling
 * the next rather than as a loop: each round can only begin once the one
 * before it has been answered, and the application's own retry count is what
 * decides how many there are.
 *
 * @module
 */

import type { Page } from 'playwright'
import { until } from './wait.ts'

/**
 * Pair until the boot notice appears, or the rounds run out.
 * @param page - the page showing the picker.
 * @param roundsLeft - how many more times to pair before giving up.
 */
export async function pairUntilBootNotice(page: Page, roundsLeft: number): Promise<void> {
  if (roundsLeft <= 0) return
  if ((await page.locator('[data-deeptail-state="boot-error"]').count()) > 0) return
  await page.waitForSelector('[data-deeptail-picker]')
  await page.getByRole('button', { name: 'Pair a host' }).click()
  await page.locator('[data-deeptail-field="link"]').waitFor({ state: 'visible' })
  await page.locator('[data-deeptail-field="link"]').fill('https://harness.local:3080/pair#token')
  await page.locator('[data-deeptail-action="pair-submit"]').click()
  await until(async () => {
    if ((await page.locator('[data-deeptail-state="boot-error"]').count()) > 0) return true
    return (
      (await page.locator('[data-deeptail-picker]').count()) > 0 &&
      (await page.locator('[data-deeptail-action="pair-submit"]').count()) === 0
    )
  })
  await pairUntilBootNotice(page, roundsLeft - 1)
}
