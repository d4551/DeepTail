/**
 * Structural conformance of the layout: what a finger reaches, and what scrolls.
 *
 * Geometry is the half no rule engine reports. A control can be labelled,
 * reachable and correctly nested and still be too small to hit, or sit in a
 * pane that scrolls inside another pane so the wheel moves the wrong box. Both
 * are read from the computed layout at the widths the shell ships to.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import type { Page } from 'playwright'
import { fleet, oneHost } from './fixtures.ts'
import { type Harness, startHarness } from './harness.ts'
import { defects } from './structure-page.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
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

it('reports a pane that scrolls inside a pane that also scrolls', async () => {
  const page = await harness.open(oneHost())
  await page.waitForSelector('[data-deeptail-shell]')
  expect(await defects(page)).toBe('')
  // A stylesheet, not an inline style: the shell already clips on this axis, so
  // making it scroll is what puts one scroll container inside another.
  await page.addStyleTag({ content: '.main { overflow-y: auto; }' })
  const found = await defects(page)
  expect(found).toContain('nested-scroll')
  expect(found).toContain('which also scrolls')
  await page.close()
})

it('reports a control drawn over another control', async () => {
  // Both controls render on the wide roster: the new-session action in the
  // roster's section header and the connection trigger beside it. On the
  // narrow layout the roster is the closed drawer — translated off the canvas
  // and inert — so the pair is seated on the layout that holds both in play.
  const page = await harness.open(fleet())
  await page.waitForSelector('[data-deeptail-shell]')
  expect(await defects(page)).toBe('')
  // A stylesheet, not an inline style: seating the new-session action on the
  // connection trigger puts two targets in the same pixels, and the click lands
  // on whichever of them is drawn on top.
  await page.addStyleTag({
    content:
      '[data-deeptail-action="new-session"], [data-deeptail-connection="trigger"] { position: fixed; inset-block-start: 0; inset-inline-start: 0; margin: 0; }',
  })
  const found = await defects(page)
  expect(found).toContain('overlapping-targets')
  expect(found).toContain('overlaps')
  await page.close()
})

it('meets the touch minimum on a retry a finger has to hit', async () => {
  const page = await harness.open(fleet({ remoteErrors: { 'lab-2:session/list': 'roster unavailable' } }), {
    mobile: true,
  })
  await page.waitForSelector('[data-deeptail-shell]')
  // The roster lives in the drawer on this layout, so the strip is only on
  // screen — and only measurable — once the drawer is open.
  await page.locator('[data-deeptail-action="drawer"]').click()
  await page.locator('[data-deeptail-state="partial"]').waitFor({ state: 'visible' })
  // The retry inherits the strip's 12px type. Left unpadded it was an 18px
  // target, and no case had ever rendered it while the floor was being applied.
  expect(await defects(page, true)).toBe('')
  await page.close()
})
