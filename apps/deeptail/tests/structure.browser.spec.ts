/**
 * Structural conformance across every surface and every viewport the product
 * ships to.
 *
 * These are the defects a WCAG rule engine does not report: an interactive
 * element nested inside another, a heading level skipped, an ARIA reference
 * pointing at nothing, a layout that overflows its viewport, a label clipped by
 * its box, or a touch target under the platform minimum. The checks run in the
 * page, so they see the computed layout rather than the markup that produced it.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import type { Page } from 'playwright'
import { fleet, oneHost } from './fixtures.ts'
import { type Harness, startHarness } from './harness.ts'
import { type StructureFinding, structureCheckSource } from './structure.ts'

let harness: Harness

/** The widths the shell is designed against, narrowest first. */
const VIEWPORTS = [
  { label: 'small phone', width: 320, height: 720 },
  { label: 'phone', width: 390, height: 844 },
  { label: 'tablet', width: 768, height: 1024 },
  { label: 'laptop', width: 1280, height: 800 },
  { label: 'desktop', width: 1920, height: 1080 },
]

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

/**
 * Every structural defect on a page, as a message a reader can act on.
 * @param page - the page to inspect.
 * @param coarsePointer - whether the platform touch minimum applies.
 * @returns one line per finding.
 */
async function defects(page: Page, coarsePointer = false): Promise<string> {
  const found = await page.evaluate((source) => {
    const run = new Function(source) as () => StructureFinding[]
    return run()
  }, structureCheckSource(coarsePointer))
  return found.map((finding) => `${finding.rule}: ${finding.detail}`).join('\n')
}

it('has no structural defects on the roster at any width', async () => {
  const checked = await Promise.all(
    VIEWPORTS.map(async (viewport) => {
      const page = await harness.open(fleet())
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.waitForSelector('[data-deeptail-shell]')
      await page
        .locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]')
        .waitFor({ state: 'attached' })
      const found = await defects(page)
      await page.close()
      return [viewport.label, found]
    }),
  )
  expect(checked).toEqual(VIEWPORTS.map((viewport) => [viewport.label, '']))
})

it('meets the platform minimum on the menu a finger opens', async () => {
  const page = await harness.open(fleet(), { mobile: true })
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-action="drawer"]').click()
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'visible' })
  // The menu's own items were never measured, because the one case that
  // measured targets never opened it.
  expect(await defects(page, true)).toBe('')
  await page.close()
})

it('has no structural defects with the connection menu open', async () => {
  const page = await harness.open(fleet())
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'visible' })
  expect(await defects(page)).toBe('')
  await page.close()
})

it('has no structural defects in either dialog', async () => {
  const page = await harness.open(oneHost())
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-action="new-session"]').click()
  await page.locator('[data-deeptail-dialog]').waitFor({ state: 'visible' })
  expect(await defects(page)).toBe('')
  await page.keyboard.press('Escape')
  await page.locator('[data-deeptail-session="s-running"]').hover()
  await page.locator('[data-deeptail-session="s-running"] [data-deeptail-action="row-message"]').click()
  await page.locator('[data-deeptail-dialog]').waitFor({ state: 'visible' })
  expect(await defects(page)).toBe('')
  await page.close()
})

it('has no structural defects on the picker', async () => {
  const page = await harness.open({ hosts: [] })
  await page.waitForSelector('[data-deeptail-picker]')
  expect(await defects(page)).toBe('')
  await page.getByRole('button', { name: 'Pair a host' }).click()
  await page.locator('[data-deeptail-field="link"]').waitFor({ state: 'visible' })
  expect(await defects(page)).toBe('')
  await page.close()
})

it('meets the platform touch minimum on every control a finger can reach', async () => {
  const page = await harness.open(fleet(), { mobile: true })
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-action="drawer"]').click()
  await page.locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]').waitFor({ state: 'visible' })
  expect(await defects(page, true)).toBe('')
  await page.close()
})

/**
 * Wait for the drawer to come to rest wholly outside the viewport, which is
 * true of neither the open position nor any point along the way.
 * @param page - the page under test.
 * @param width - the viewport width.
 */
async function waitForClosedDrawer(page: Page, width: number): Promise<void> {
  await page.waitForFunction((viewport: number) => {
    const sidebar = document.querySelector('#deeptail-sidebar')
    if (sidebar === null) return false
    const box = sidebar.getBoundingClientRect()
    return Math.round(box.right) <= 0 || Math.round(box.x) >= viewport
  }, width)
}

/**
 * Wait for the drawer to come to rest wholly inside the viewport.
 * @param page - the page under test.
 */
async function waitForOpenDrawer(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const sidebar = document.querySelector('#deeptail-sidebar')
    if (sidebar === null) return false
    const box = sidebar.getBoundingClientRect()
    return Math.round(box.x) >= 0 && Math.round(box.right) <= window.innerWidth
  })
}

/**
 * The sidebar's box, as the page reports it now.
 * @param page - the page under test.
 * @returns its left and right edges, rounded.
 */
function sidebarBox(page: Page): Promise<{ x: number; right: number }> {
  return page.evaluate(() => {
    const sidebar = document.querySelector('#deeptail-sidebar')
    if (sidebar === null) return { x: 0, right: 0 }
    const box = sidebar.getBoundingClientRect()
    return { x: Math.round(box.x), right: Math.round(box.right) }
  })
}

it('slides the drawer in from the inline start in either direction', async () => {
  const measured = await Promise.all(
    (['ltr', 'rtl'] as const).map(async (direction) => {
      const page = await harness.open(fleet(), { mobile: true, direction })
      await page.waitForSelector('[data-deeptail-shell]')
      const width = page.viewportSize()?.width ?? 0
      // Closed, the drawer waits entirely outside the viewport past the inline
      // start: off the left edge under LTR, off the right under RTL. It slides
      // to get there, so both positions are measured once they have come to
      // rest rather than somewhere along the way.
      await waitForClosedDrawer(page, width)
      const closed = await sidebarBox(page)
      await page.locator('[data-deeptail-action="drawer"]').click()
      await page
        .locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]')
        .waitFor({ state: 'visible' })
      await waitForOpenDrawer(page)
      const box = await page.locator('#deeptail-sidebar').boundingBox()
      await page.close()
      return [
        direction,
        // Closed, it waits entirely outside the viewport past the inline start:
        // off the left edge under LTR, off the right under RTL.
        direction === 'ltr' ? closed.right <= 0 : closed.x >= width,
        Math.round(box?.x ?? -1) >= 0,
        Math.round((box?.x ?? 0) + (box?.width ?? 0)) <= width,
      ]
    }),
  )
  expect(measured).toEqual([
    ['ltr', true, true, true],
    ['rtl', true, true, true],
  ])
})

it('has no structural defects with the document direction reversed', async () => {
  const page = await harness.open(fleet(), { direction: 'rtl' })
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]').waitFor({ state: 'attached' })
  // Layout is flow-relative, so reversing the direction must not overflow the
  // viewport or clip a label. This is what a right-to-left locale meets.
  expect(await defects(page)).toBe('')
  await page.close()
})
