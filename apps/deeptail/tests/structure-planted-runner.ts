/**
 * The harness a planted-defect suite runs on, and the shapes it seats.
 *
 * A check that stays quiet on a clean page is indistinguishable from a check
 * that cannot fire, so a case opens the shell, reads a page that conforms,
 * seats one shape that does not, and drops it again. That machinery is the same
 * for every shape — what a case contributes is where the shape goes and what
 * must be reported — so it is stated once here. The tables are held apart, one
 * subject each: `structure-planted.browser.spec.ts` for what the page's markup
 * and boxes are, and `structure-planted-shell.browser.spec.ts` for what the
 * document seats and what its controls are wired to, which is the same split
 * the unit suites read those checks under.
 *
 * @module
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import type { Page } from 'playwright'
import { type Harness, startHarness } from './harness.ts'
import { defects } from './structure-page.ts'
import { openShell } from './surfaces.ts'

/** One planted shape: how to seat it, what must be reported, and what to drop. */
export interface Planted {
  /** What the case is about, as the test name. */
  readonly label: string
  /** The viewport and palette the case runs under; absent is the default. */
  readonly view?: Parameters<Harness['open']>[1]
  /** Whether the platform's coarse-pointer floor applies as well. */
  readonly strict?: boolean
  /** Seats the shape on the already-opened page. */
  readonly plant: (page: Page) => Promise<void>
  /** Reasons the report must contain once the shape is seated. */
  readonly reports: readonly string[]
  /** Probe ids to drop before the page is read again. */
  readonly drop?: readonly string[]
}

/** The harness one table of shapes runs against, started with the table. */
let harness: Harness

/**
 * Open the shell view one case plants under.
 *
 * The mutable harness is read here rather than inside the closures the
 * registration loop creates: a function a loop creates may not name a binding
 * a later turn can change, so the harness never appears inside the loop.
 * @param view - the viewport and palette the case runs under; absent is the wide fine-pointer roster.
 * @returns the page, showing the shell.
 */
export function openPlanted(view?: Parameters<Harness['open']>[1]): Promise<Page> {
  return openShell(harness, {}, view)
}

/** Drop the probe element a previous evaluation planted. */
export const DROP = (probe: string): string => `(() => {
  document.querySelector('[data-deeptail-probe="${probe}"]')?.remove()
  document.querySelector('[data-deeptail-probe="${probe}-sheet"]')?.remove()
  return document.querySelector('[data-deeptail-probe="${probe}"]') === null
})()`

/**
 * Plant a labelled button of a known CSS-pixel box, beating UA padding.
 *
 * The size is stated by an injected sheet rather than by the tag, because a
 * `style` attribute is an inline style and this repository refuses one
 * everywhere; the box the check measures is the same either way.
 * @param page - the page under test.
 * @param probe - probe id, also used for the injected sheet.
 * @param px - width and height to force.
 */
export async function plantTarget(page: Page, probe: string, px: number): Promise<void> {
  await page.evaluate(
    (args: { readonly probe: string; readonly px: number }) => {
      const node = document.createElement('button')
      node.dataset['deeptailProbe'] = args.probe
      node.dataset['deeptailProbeSize'] = ''
      node.textContent = 'target'
      document.querySelector('[data-deeptail-shell] main')?.append(node)
    },
    { probe, px },
  )
  await page.addStyleTag({
    content: `[data-deeptail-probe-size]{width:${String(px)}px;height:${String(px)}px;box-sizing:border-box}`,
  })
}

/**
 * Drive one table of shapes: one case per entry, each reading the page before
 * the shape is seated, after it, and again once it is dropped.
 *
 * The harness belongs to the table rather than to the spec, so each spec starts
 * the one it needs and every case reads a page showing the shell. A case whose
 * shape is the one that merely resembles a defect asks the opposite question —
 * the page is read again after the probe is dropped, and reported clean.
 * @param cases - the shapes this suite seats, in the order they are named.
 */
export function plantedSuite(cases: readonly Planted[]): void {
  beforeAll(async () => {
    harness = await startHarness()
  })

  afterAll(async () => {
    await harness?.stop()
  })

  for (const planted of cases) {
    it(planted.label, async () => {
      const page = await openPlanted(planted.view)
      expect(await defects(page, planted.strict === true)).toBe('')
      await planted.plant(page)
      const found = await defects(page, planted.strict === true)
      // A case with nothing to report asks the opposite question: the shape it
      // planted is the one that merely resembles a defect.
      if (planted.reports.length === 0) expect(found).toBe('')
      for (const reason of planted.reports) expect(found).toContain(reason)
      if (planted.drop !== undefined) {
        const dropped = await Promise.all(planted.drop.map((name) => page.evaluate<boolean>(DROP(name))))
        for (const gone of dropped) expect(gone).toBe(true)
        expect(await defects(page, planted.strict === true)).toBe('')
      }
      await page.close()
    })
  }
}
