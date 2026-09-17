/**
 * The modality the focus rules measure under.
 *
 * The engine answers `:focus-visible` by the modality of the last interaction:
 * after a pointer press, script-driven focus matches nothing, and every ring
 * the sheet declares goes unpainted while the check reads it. The driver puts
 * the page into the keyboard modality before it measures, and these cases pin
 * that: a page reached through clicks — the way every menu and drawer case
 * arrives — still reads every control's ring, and a control whose rounded
 * corners hand the corner samples to its container is not reported as buried
 * under it.
 *
 * @module
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { oneHost } from './fixtures.ts'
import { type Harness, startHarness } from './harness.ts'
import { defects } from './structure-page.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('reads every ring on a page the case reached through a pointer press', async () => {
  const page = await harness.open(oneHost({ muxHosts: ['dev-1'] }), { mobile: true })
  await page.waitForSelector('[data-deeptail-shell]')
  // The pointer press is the point: it is what puts the engine into the
  // modality where script-driven focus paints no ring of its own. The drawer
  // toggle is the control a phone layout keeps visible to click.
  await page.locator('[data-deeptail-action="drawer"]').click()
  const found = await defects(page)
  expect(found.includes('focus-invisible')).toBe(false)
  await page.close()
})

it('reports no control as buried under the container its rounded corners sit in', async () => {
  const page = await harness.open(oneHost({ muxHosts: ['dev-1'] }))
  await page.waitForSelector('[data-deeptail-shell]')
  const found = await defects(page)
  expect(found.includes('focus-obscured')).toBe(false)
  await page.close()
})
