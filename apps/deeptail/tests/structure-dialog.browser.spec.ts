/**
 * What a dialog does at the box WCAG 2.2 SC 1.4.10 names.
 *
 * Every viewport above the reflow floor is tall enough to seat a dialog whole
 * whatever it does, so none of them can tell a dialog that manages its own
 * overflow from one that simply overhangs the screen. These cases are the ones
 * that can: a stylesheet that had lost its scroll containment put the heading
 * above the top of the window and the action row below the bottom, with a
 * `position: fixed` root leaving the document nothing to scroll to either.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import type { Page } from 'playwright'
import { fleet } from './fixtures.ts'
import { type Harness, startHarness } from './harness.ts'
import { defects } from './structure-page.ts'
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
        ['new session', (page: Page) => page.locator('[data-deeptail-action="new-session"]').click()],
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

it('still reports two controls that overlap inside the dialog’s own scroller', async () => {
  // The overlap rule now measures painted boxes rather than laid-out ones, so
  // a control scrolled out of a pane no longer reads as covering what is drawn
  // where its rectangle happens to fall. That narrowing must not reach a pair
  // that really is drawn over each other *inside* the pane — both painted,
  // both reachable, one unusable where they meet.
  const page = await harness.open(fleet(), {
    mobile: true,
    width: REFLOW_VIEWPORT.width,
    height: REFLOW_VIEWPORT.height,
  })
  await page.waitForSelector('[data-deeptail-shell]')
  await openDrawerIfPresent(page)
  await page.locator('[data-deeptail-action="new-session"]').click()
  await page.locator('[data-deeptail-dialog]').waitFor({ state: 'visible' })
  expect(await defects(page)).toBe('')
  // Pinned to the top of the body's visible box, where the pane paints them
  // both: this is an overlap a reader meets, not one only the layout has.
  await page.addStyleTag({
    content:
      '[data-deeptail-dialog] .modal-body { position: relative; } [data-deeptail-dialog] .modal-body .input, [data-deeptail-dialog] .modal-body .select { position: absolute; inset-block-start: 0; inset-inline-start: 0; inline-size: 80px; block-size: 30px; margin: 0; }',
  })
  const found = await defects(page)
  expect(found).toContain('overlapping-targets')
  await page.close()
})
