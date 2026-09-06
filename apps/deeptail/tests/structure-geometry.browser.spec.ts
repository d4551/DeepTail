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
import { openDrawerIfPresent } from './surfaces.ts'
import { REFLOW_VIEWPORT, SMALL_PHONE_VIEWPORT, TABLET_VIEWPORT } from './viewports.ts'

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

it('meets the Apple HIG touch minimum on the menu a finger opens, on a tablet', async () => {
  const page = await harness.open(fleet(), { tablet: true })
  await page.waitForSelector('[data-deeptail-shell]')
  expect(page.viewportSize()?.width).toBe(TABLET_VIEWPORT.width)
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'visible' })
  expect(await defects(page, true)).toBe('')
  await page.close()
})

it('meets the Apple HIG touch minimum on the pairing form, on a tablet', async () => {
  const page = await harness.open({ hosts: [] }, { tablet: true })
  await page.waitForSelector('[data-deeptail-picker]')
  await page.getByRole('button', { name: 'Pair a host' }).click()
  await page.locator('[data-deeptail-field="link"]').waitFor({ state: 'visible' })
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

it('meets the Apple HIG touch minimum on a tablet', async () => {
  const page = await harness.open(fleet(), { tablet: true })
  await page.waitForSelector('[data-deeptail-shell]')
  expect(page.viewportSize()?.width).toBe(TABLET_VIEWPORT.width)
  await page.locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]').waitFor({ state: 'visible' })
  expect(await defects(page, true)).toBe('')
  await page.close()
})

it('meets the Apple HIG touch minimum on a small phone', async () => {
  const page = await harness.open(fleet(), { mobile: true })
  await page.waitForSelector('[data-deeptail-shell]')
  await page.setViewportSize({ width: SMALL_PHONE_VIEWPORT.width, height: SMALL_PHONE_VIEWPORT.height })
  expect(page.viewportSize()?.width).toBe(SMALL_PHONE_VIEWPORT.width)
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

it('meets the Apple HIG touch minimum on a retry a finger has to hit, on a tablet', async () => {
  const page = await harness.open(fleet({ remoteErrors: { 'lab-2:session/list': 'roster unavailable' } }), {
    tablet: true,
  })
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-state="partial"]').waitFor({ state: 'visible' })
  expect(await defects(page, true)).toBe('')
  await page.close()
})

/**
 * Open one dialog at the WCAG reflow floor and report what a reader can reach.
 *
 * The floor is the point of the case: every taller viewport seats a dialog
 * whole whatever it does, so none of them can tell a dialog that manages its
 * own overflow from one that simply overhangs the screen.
 * @param open - reaches the dialog from the shell, however that surface does it.
 * @returns the boxes, rounded, and whether the document can scroll at all.
 */
async function dialogReach(open: (page: Page) => Promise<void>): Promise<{
  viewport: number
  top: number
  bottom: number
  actionsTop: number
  actionsBottom: number
  documentScrolls: boolean
}> {
  const page = await harness.open(fleet(), {
    mobile: true,
    width: REFLOW_VIEWPORT.width,
    height: REFLOW_VIEWPORT.height,
  })
  await page.waitForSelector('[data-deeptail-shell]')
  await openDrawerIfPresent(page)
  await open(page)
  await page.locator('[data-deeptail-dialog]').waitFor({ state: 'visible' })
  const measured = await page.evaluate(() => {
    const dialog = document.querySelector('[data-deeptail-dialog]')
    const actions = dialog?.querySelector('.actions')
    if (dialog === null || actions === null || actions === undefined) {
      throw new Error('no dialog is open on this page')
    }
    const box = dialog.getBoundingClientRect()
    const row = actions.getBoundingClientRect()
    const scroller = document.scrollingElement
    return {
      viewport: window.innerHeight,
      top: Math.round(box.top),
      bottom: Math.round(box.bottom),
      actionsTop: Math.round(row.top),
      actionsBottom: Math.round(row.bottom),
      // A `position: fixed` root overflows without giving the document
      // anything to scroll, so what leaves the screen is not merely out of
      // sight — there is no gesture that brings it back.
      documentScrolls: (scroller?.scrollHeight ?? 0) > (scroller?.clientHeight ?? 0),
    }
  })
  await page.close()
  return measured
}

/** Reach the compose sheet from the roster, on a pointer that reveals the row's actions. */
async function openCompose(page: Page): Promise<void> {
  const row = page.locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]')
  await row.waitFor({ state: 'visible' })
  await row.locator('[data-deeptail-action="row-message"]').click()
}

it('seats every dialog inside the reflow floor, with its actions reachable', async () => {
  // Both dialogs, because they are built by different modules over one frame:
  // the containment lives in the frame, and a case that opened only one of
  // them would pass on a frame that had lost it for the other.
  const measured = await Promise.all(
    (
      [
        ['new session', async (page: Page) => page.locator('[data-deeptail-action="new-session"]').click()],
        ['compose', openCompose],
      ] as const
    ).map(async ([label, open]) => {
      const reach = await dialogReach(open)
      return [
        label,
        // Nothing above the top of the screen, nothing below the bottom, and
        // the action row — the one part a reader must reach to finish or
        // abandon the flow — wholly on screen.
        reach.top >= 0,
        reach.bottom <= reach.viewport,
        reach.actionsTop >= 0 && reach.actionsBottom <= reach.viewport,
        // The document itself never scrolls: the dialog absorbs its own
        // overflow. A page that scrolled here would be the shell moving under
        // a modal, which is its own defect.
        reach.documentScrolls,
      ]
    }),
  )
  expect(measured).toEqual([
    ['new session', true, true, true, false],
    ['compose', true, true, true, false],
  ])
})

it('still reports a pane that scrolls inside the dialog body', async () => {
  // The nested-scroll rule stopped counting editable controls, so that a
  // dialog may both scroll and hold a text field. This is the shape that
  // exclusion must not have blinded it to — a pane of layout inside the body's
  // scroller, which is what this sheet shipped once already before it was
  // fixed by making the dialog clip rather than scroll.
  const page = await harness.open(fleet(), {
    mobile: true,
    width: REFLOW_VIEWPORT.width,
    height: REFLOW_VIEWPORT.height,
  })
  await page.waitForSelector('[data-deeptail-shell]')
  await openDrawerIfPresent(page)
  await page.locator('[data-deeptail-action="new-session"]').click()
  await page.locator('[data-deeptail-dialog]').waitFor({ state: 'visible' })
  // The body scrolls and holds a `select`; neither is a nested pane, so the
  // dialog is clean before anything is planted.
  expect(await defects(page)).toBe('')
  // A stylesheet and a data attribute, not an inline style and not a class:
  // the class vocabulary is the shipped sheets, and a strange class would be
  // reported by a different rule than the one under test.
  await page.addStyleTag({ content: '[data-deeptail-probe="pane"] { overflow-y: auto; block-size: 20px; }' })
  await page.evaluate(() => {
    const pane = document.createElement('div')
    pane.dataset.deeptailProbe = 'pane'
    document.querySelector('[data-deeptail-dialog] .modal-body')?.append(pane)
  })
  const found = await defects(page)
  expect(found).toContain('nested-scroll')
  expect(found).toContain('which also scrolls')
  await page.close()
})
