/**
 * What the accessibility audit itself reports, and what it must not swallow.
 *
 * The audit walks a scrolling page at several scroll positions and reduces the
 * passes: a node decided against anywhere is reported, a node undecided
 * everywhere is reported as undecided. That reduction shipped once keyed by a
 * finding's whole node list — a list axe rebuilds every time a pane moves — so
 * no two passes ever named the same thing, the intersection was empty by
 * construction, and every undecided finding on every scrolling page vanished.
 * Nothing failed, because nothing here held it.
 *
 * These are the cases that hold it. They plant their own defects rather than
 * relying on the product having one.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import type { Page } from 'playwright'
import { fleet } from './fixtures.ts'
import { type Harness, startHarness } from './harness.ts'
import { openDrawerIfPresent } from './surfaces.ts'
import { REFLOW_VIEWPORT } from './viewports.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

/**
 * The shell at the reflow floor with a dialog open, which is a page that
 * genuinely scrolls inside a clipped pane.
 * @returns the page, with the new-session dialog showing.
 */
async function scrollingDialog(): Promise<Page> {
  const page = await harness.open(fleet(), {
    mobile: true,
    width: REFLOW_VIEWPORT.width,
    height: REFLOW_VIEWPORT.height,
  })
  await page.waitForSelector('[data-deeptail-shell]')
  await openDrawerIfPresent(page)
  await page.locator('[data-deeptail-action="new-session"]').click()
  await page.locator('[data-deeptail-dialog]').waitFor({ state: 'visible' })
  return page
}

it('reports a node no scroll position can decide, on a page that scrolls', async () => {
  const page = await scrollingDialog()
  // Text over a background image is the shape axe cannot decide contrast for
  // at any scroll position: there is no sampled colour behind the glyphs. It
  // is planted outside the dialog's scroller and fixed in place, so every pass
  // sees exactly the same node — which is the whole point. If the reduction
  // ever collapses to reporting nothing undecided, this is what fails.
  await page.addStyleTag({
    content:
      '[data-deeptail-probe="undecidable"] { position: fixed; inset-block-start: 0; inset-inline-start: 0; color: rgb(119, 119, 119); background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\'%3E%3C/svg%3E"); }',
  })
  await page.evaluate(() => {
    const strip = document.createElement('p')
    strip.setAttribute('data-deeptail-probe', 'undecidable')
    strip.textContent = 'contrast over an image'
    document.body.append(strip)
  })
  const found = await harness.audit(page)
  expect(found.some((finding) => finding.id === 'color-contrast')).toBe(true)
  await page.close()
})

it('reports a violation that only one scroll position can see', async () => {
  const page = await scrollingDialog()
  // An unlabelled control at the far end of the dialog's own scroller. At rest
  // it is out of view; only a pass that scrolls there meets it. A single-pass
  // audit, or one that took the last pass rather than the union, would miss it.
  await page.evaluate(() => {
    const body = document.querySelector('[data-deeptail-dialog] .modal-body')
    const button = document.createElement('button')
    button.setAttribute('data-deeptail-probe', 'unlabelled')
    body?.append(button)
  })
  const found = await harness.audit(page)
  expect(found.some((finding) => finding.id === 'button-name')).toBe(true)
  await page.close()
})

it('is clean on that same page once the planted defects are gone', async () => {
  // The two cases above are only worth anything if the page they plant into is
  // otherwise clean: a page that already failed would pass them for free.
  const page = await scrollingDialog()
  expect(await harness.audit(page)).toEqual([])
  await page.close()
})
