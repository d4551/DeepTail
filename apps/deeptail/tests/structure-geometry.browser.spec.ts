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
import { type AnswerTable, type Harness, startHarness } from './harness.ts'
import { openPairForm, openPicker } from './page-steps.ts'
import { pointerTargetFloor } from './structure-emit.ts'
import { defects } from './structure-page.ts'
import { openDrawerIfPresent, waitForRoster } from './surfaces.ts'
import { showSwitcher } from './switcher.ts'
import { pointerFlags, SMALL_PHONE_VIEWPORT, TABLET_VIEWPORT, VIEWPORTS } from './viewports.ts'

/** The smallest target any pointer admits, and so the least a row can occupy. */
const MINIMUM_ROW = await pointerTargetFloor('fine')

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

/**
 * Open a page over `table` under `view` and wait for the surface to show.
 * @param table - the registry the page boots against.
 * @param view - the pointer, width and palette the case is measured under.
 * @param shows - the selector naming the surface the case measures; the shell,
 * unless the case opens the picker or another surface.
 * @returns the page, showing the surface.
 */
async function opened(
  table: AnswerTable,
  view: Parameters<Harness['open']>[1] = {},
  shows = '[data-deeptail-shell]',
): Promise<Page> {
  const page = await harness.open(table, view)
  await page.waitForSelector(shows)
  return page
}

/**
 * Hold every control on the page to the pointer's own touch floor.
 * @param page - the page under test.
 */
async function expectTargetsMeetable(page: Page): Promise<void> {
  expect(await defects(page, true)).toBe('')
}

/**
 * Open the fleet at a known phone width.
 *
 * Three cases below measure the shell on a finger; two of them take the phone
 * the pointer flags already open, and one takes the narrow one it has to be
 * resized to, so the width is what the case says rather than a line each of
 * them restates.
 * @param phone - which designed phone width to open.
 * @returns the page, showing the shell.
 */
async function openPhone(phone: 'phone' | 'small'): Promise<Page> {
  const page = await opened(fleet(), { mobile: true })
  if (phone === 'small') {
    await page.setViewportSize({ width: SMALL_PHONE_VIEWPORT.width, height: SMALL_PHONE_VIEWPORT.height })
  }
  return page
}

it('meets the platform minimum on the menu a finger opens', async () => {
  const page = await openPhone('phone')
  await openDrawerIfPresent(page)
  await showSwitcher(page)
  // The menu's own items were never measured, because the one case that
  // measured targets never opened it.
  await expectTargetsMeetable(page)
  await page.close()
})

it('meets the Apple HIG touch minimum on the menu a finger opens, on a tablet', async () => {
  const page = await opened(fleet(), { tablet: true })
  expect(page.viewportSize()?.width).toBe(TABLET_VIEWPORT.width)
  await showSwitcher(page)
  await expectTargetsMeetable(page)
  await page.close()
})

it('meets the Apple HIG touch minimum on the pairing form, on a tablet', async () => {
  // No hosts, so the page is the picker: the pairing form is the surface
  // measured here, not the shell.
  const page = await openPicker(harness, {}, { tablet: true })
  await openPairForm(page)
  await expectTargetsMeetable(page)
  await page.close()
})

it('meets the platform touch minimum on every control a finger can reach', async () => {
  const page = await openPhone('phone')
  await openDrawerIfPresent(page)
  await waitForRoster(page)
  await expectTargetsMeetable(page)
  await page.close()
})

it('meets the Apple HIG touch minimum on a tablet', async () => {
  const page = await opened(fleet(), { tablet: true })
  expect(page.viewportSize()?.width).toBe(TABLET_VIEWPORT.width)
  await waitForRoster(page)
  await expectTargetsMeetable(page)
  await page.close()
})

it('meets the Apple HIG touch minimum on a small phone', async () => {
  const page = await openPhone('small')
  expect(page.viewportSize()?.width).toBe(SMALL_PHONE_VIEWPORT.width)
  await openDrawerIfPresent(page)
  await waitForRoster(page)
  await expectTargetsMeetable(page)
  await page.close()
})

/**
 * Wait for the drawer to come to rest at one end of its travel.
 *
 * It slides to get there, so a measurement taken anywhere along the way is a
 * position no reader is ever shown: off the viewport's own edge past the inline
 * start when closed, wholly inside it when open.
 * @param page - the page under test.
 * @param rest - which end to wait for.
 * @param width - the viewport width the drawer is resting against.
 */
async function waitForDrawerRest(page: Page, rest: 'outside' | 'inside', width: number): Promise<void> {
  await page.waitForFunction(
    (args: { readonly rest: 'outside' | 'inside'; readonly viewport: number }) => {
      const sidebar = document.querySelector('#deeptail-sidebar')
      if (sidebar === null) return false
      const box = sidebar.getBoundingClientRect()
      const outside = Math.round(box.right) <= 0 || Math.round(box.x) >= args.viewport
      const inside = Math.round(box.x) >= 0 && Math.round(box.right) <= args.viewport
      return args.rest === 'outside' ? outside : inside
    },
    { rest, viewport: width },
  )
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
      const page = await opened(fleet(), { mobile: true, direction })
      const width = page.viewportSize()?.width ?? 0
      // Closed, the drawer waits entirely outside the viewport past the inline
      // start: off the left edge under LTR, off the right under RTL. It slides
      // to get there, so both positions are measured once they have come to
      // rest rather than somewhere along the way.
      await waitForDrawerRest(page, 'outside', width)
      const closed = await sidebarBox(page)
      await openDrawerIfPresent(page)
      await page
        .locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]')
        .waitFor({ state: 'visible' })
      await waitForDrawerRest(page, 'inside', width)
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
  const page = await opened(oneHost())
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
  const page = await opened(fleet())
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
  const page = await opened(fleet({ remoteErrors: { 'lab-2:session/list': 'roster unavailable' } }), { mobile: true })
  // The roster lives in the drawer on this layout, so the strip is only on
  // screen — and only measurable — once the drawer is open.
  await openDrawerIfPresent(page)
  await page.locator('[data-deeptail-state="partial"]').waitFor({ state: 'visible' })
  // The retry inherits the strip's 12px type. Left unpadded it was an 18px
  // target, and no case had ever rendered it while the floor was being applied.
  await expectTargetsMeetable(page)
  await page.close()
})

it('meets the Apple HIG touch minimum on a retry a finger has to hit, on a tablet', async () => {
  const page = await opened(fleet({ remoteErrors: { 'lab-2:session/list': 'roster unavailable' } }), { tablet: true })
  await page.locator('[data-deeptail-state="partial"]').waitFor({ state: 'visible' })
  await expectTargetsMeetable(page)
  await page.close()
})

it('keeps the roster on screen at every designed view', async () => {
  // The pane the shell exists to show. At the reflow floor the drawer's fixed
  // chrome filled the screen and the roster was laid out past the bottom edge,
  // then clipped away by the sidebar's own `overflow: hidden` — content lost,
  // not content scrolled. Nothing caught it: axe had its own reason to be
  // green, and no case had ever asked where the roster actually was.
  const seen = await Promise.all(
    VIEWPORTS.map(async (viewport) => {
      const page = await opened(fleet(), {
        ...pointerFlags(viewport),
        width: viewport.width,
        height: viewport.height,
      })
      await openDrawerIfPresent(page)
      const box = await page.evaluate(() => {
        const roster = document.querySelector('.roster')
        // A missing roster reports as off screen with no height, which is what
        // it is: the pane the shell exists to show is not there.
        if (roster === null) return { within: false, height: 0 }
        const edges = roster.getBoundingClientRect()
        // Wholly inside the window on the block axis, not merely intersecting
        // it: one pixel of the roster on screen satisfied "on screen" while the
        // rest of it sat past the edge, which is the defect this case is about.
        return {
          within: edges.top >= 0 && edges.bottom <= window.innerHeight,
          height: Math.round(edges.height),
        }
      })
      await page.close()
      // Tall enough for one row of the platform's minimum target, because a
      // roster too short to show a row is a roster the reader cannot use.
      return [viewport.label, box.within, box.height >= MINIMUM_ROW]
    }),
  )
  expect(seen).toEqual(VIEWPORTS.map((viewport) => [viewport.label, true, true]))
})
