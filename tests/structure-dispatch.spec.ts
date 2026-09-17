/**
 * The entry point the page runs: what it reports for a page that conforms, and
 * that every check it ships is called, on a page carrying one defect for each.
 *
 * The checks are driven one at a time by their own suites; what is driven here
 * is the wiring — that the entry point calls each of them, that each reports
 * through the one collector the page receives, and that the findings arrive in
 * the order the calls are made. A check dropped from the call list stops
 * reporting here, which is the failure this suite exists for: every structural
 * rule on the page would otherwise be silently absent while its own suite
 * stayed green.
 *
 * @module
 */

import { beforeEach, expect, it } from 'bun:test'
import { findStructureDefects } from '../apps/deeptail/tests/structure.ts'
import type { StructureFinding } from '../apps/deeptail/tests/structure-report.ts'
import { resetDocument } from './dom.ts'
import { conformingShell, LIMITS, plantedPage, plantMarkupDefects } from './structure-dispatch-page.ts'

/** What the conforming page reports once the markup defects are planted in it. */
const MARKUP_FINDINGS: StructureFinding[] = [
  { rule: 'duplicate-id', detail: 'div#dup repeats id "dup"' },
  { rule: 'dangling-aria-reference', detail: 'div aria-controls points at missing "missing-pane"' },
  { rule: 'item-outside-list', detail: 'div#orphan sits outside a list' },
  { rule: 'unnamed-group', detail: 'fieldset#bare groups controls under no name' },
]

/**
 * Every defect the planted page carries, as the entry point reports them: one
 * for each check, in the order the entry point calls the checks.
 */
const PLANTED_FINDINGS: StructureFinding[] = [
  { rule: 'duplicate-id', detail: 'div#dup repeats id "dup"' },
  { rule: 'nested-interactive', detail: 'button#join sits inside a#invite' },
  { rule: 'heading-skip', detail: 'h1 is followed by h3' },
  { rule: 'dangling-aria-reference', detail: 'div#trigger aria-controls points at missing "missing-pane"' },
  { rule: 'item-outside-list', detail: 'div#orphan sits outside a list' },
  { rule: 'unnamed-group', detail: 'fieldset#bare groups controls under no name' },
  { rule: 'unknown-class', detail: 'div#stranger.one-off carries class "one-off", which no shipped sheet defines' },
  {
    rule: 'off-scale-type',
    detail: 'p#off-scale renders its text at 15px, which is no rung of the shipped type ladder',
  },
  {
    rule: 'off-scale-leading',
    detail: 'p#off-scale sets a 18px line box, which is not the leading rung that pairs with its size',
  },
  { rule: 'horizontal-overflow', detail: 'document scrolls to 900 in 600' },
  { rule: 'clipped-content', detail: 'div#cut is cut off by the box it sits in, on the block axis' },
  { rule: 'nested-scroll', detail: 'div#inner-pane scrolls inside div#outer-pane, which also scrolls' },
  { rule: 'overlapping-targets', detail: 'button#first overlaps button#second' },
  { rule: 'target-size', detail: 'button#small is 20x20, under 44' },
  { rule: 'alignment', detail: 'div#physical uses physical or justified text-align left' },
  {
    rule: 'sibling-misalignment',
    detail: "div#adrift shares div#lead's line without sharing its top, bottom or centre",
  },
  {
    rule: 'inconsistent-gutter',
    detail: "div#adrift-row sits 24px below the row above, where the list's own rhythm is 10px",
  },
  { rule: 'nested-grid', detail: 'div#inner-grid is a grid inside div#grid, which is also a grid' },
  { rule: 'split-shell', detail: 'div#shell contains 2 main landmarks' },
  {
    rule: 'dialog-contract',
    detail:
      'div#rogue is a dialog the shared frame did not build, so nothing holds its mask, its naming and its dismissal together',
  },
  { rule: 'inline-script', detail: 'script is an inline script inside div#shell' },
  { rule: 'inline-script', detail: 'script loads /src/injected.ts; the page has one module entry' },
  {
    rule: 'motion-not-reduced',
    detail:
      "div#mover runs a transition of 0.3s while the reader asked for less motion, where the page's own budget is 0s",
  },
  { rule: 'focus-invisible', detail: 'button#unringed takes focus and paints no outline or shadow for it' },
]

/** Putting the engine's own reader preference back after a case took it. */
type RestoreReader = () => undefined

/**
 * Reads the page as one who asked for less motion.
 * @returns the restore, which puts the engine's own reader preference back.
 */
function askForLessMotion(): RestoreReader {
  const original = window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    value: (query: string) => ({ matches: query.includes('reduce'), media: query }),
    configurable: true,
  })
  return () => {
    Object.defineProperty(window, 'matchMedia', { value: original, configurable: true })
  }
}

beforeEach(() => {
  resetDocument()
})

it('reads a conforming page as conforming, and wires the markup checks into one report', () => {
  const shell = conformingShell()
  expect(findStructureDefects(LIMITS)).toEqual([])
  plantMarkupDefects(shell)
  expect(findStructureDefects(LIMITS)).toEqual(MARKUP_FINDINGS)
})

it('runs every check the page ships, in the order the entry point calls them', () => {
  plantedPage()
  const restoreReader = askForLessMotion()
  const doc = document.documentElement
  Object.defineProperty(doc, 'scrollWidth', { value: 900, configurable: true })
  Object.defineProperty(doc, 'clientWidth', { value: 600, configurable: true })
  const findings = findStructureDefects(LIMITS)
  Reflect.deleteProperty(doc, 'scrollWidth')
  Reflect.deleteProperty(doc, 'clientWidth')
  restoreReader()
  expect(findings).toEqual(PLANTED_FINDINGS)
})
