/**
 * The measure the shipped sheets declare: the line widths a range reports, and
 * what the rule makes of them.
 *
 * happy-dom lays nothing out, so a case paints the line widths a range reports
 * — through `paintLineWidths`, the way the rest of these suites paint what an
 * engine computes — and the browser suites remain the account of what a real
 * engine measures. What each rule decides from those widths is driven here,
 * where the mutation runs can judge it; the rungs of the ladder themselves are
 * held in `structure-typography.spec.ts`.
 *
 * @module
 */

import { beforeEach, expect, it } from 'bun:test'
import { lineWidths, reportMeasure } from '../apps/deeptail/tests/structure-typography.ts'
import { collector, paintBox, paintLineWidths, paintType, restoreLineWidths } from './structure-double.ts'
import { ONE_LINE_CLASS, paragraph, RUNG, resetTypeSheet, TYPOGRAPHY } from './structure-typography-fixture.ts'

/** The text the wide-line cases carry, long enough to reach the measure. */
const LONG_LINE = 'A line of text long enough to pass the measure the sheets declare'

/**
 * One painted paragraph whose own text is the string given, with a box wide
 * enough for the measure rule to read its lines.
 * @param text - the text it carries.
 * @param className - the fixture class it renders at, none by default.
 * @returns the paragraph.
 */
function wideLine(text: string, className = ''): HTMLParagraphElement {
  const line = paragraph(className)
  line.textContent = text
  paintType(line, TYPOGRAPHY, RUNG)
  paintBox(line, { top: 0, left: 0, right: TYPOGRAPHY.measure + 20, bottom: 40 })
  return line
}

beforeEach(() => {
  resetTypeSheet()
})

it('reads the widths a range reports, one per line box the element itself paints', () => {
  const line = wideLine(LONG_LINE)
  document.body.append(line)
  paintLineWidths([700, 0, 420])
  expect(lineWidths(line, TYPOGRAPHY)).toEqual([700, 420])
  restoreLineWidths()
  // With no layout engine, the range reports nothing at all.
  expect(lineWidths(line, TYPOGRAPHY)).toEqual([])
})

it('reads a box narrower than the measure, and a truncated line, as no line to measure', () => {
  const narrow = wideLine(LONG_LINE)
  paintBox(narrow, { top: 0, left: 0, right: TYPOGRAPHY.measure - 1, bottom: 40 })
  const truncated = wideLine(LONG_LINE, ONE_LINE_CLASS)
  document.body.append(narrow, truncated)
  paintLineWidths([700])
  expect(lineWidths(narrow, TYPOGRAPHY)).toEqual([])
  expect(lineWidths(truncated, TYPOGRAPHY)).toEqual([])
  restoreLineWidths()
})

it('reports a line past the measure the sheets declare, and reads one at it as conforming', () => {
  const line = wideLine(LONG_LINE)
  line.id = 'long-line'
  document.body.append(line)
  paintLineWidths([700])
  const { findings, add } = collector()
  reportMeasure(add, line, TYPOGRAPHY)
  restoreLineWidths()
  expect(findings).toEqual([
    {
      rule: 'off-scale-measure',
      detail: `p#long-line renders a line of 700px, past the ${String(TYPOGRAPHY.measure)}px measure the sheets declare`,
    },
  ])
  paintLineWidths([TYPOGRAPHY.measure])
  const atMeasure = collector()
  reportMeasure(atMeasure.add, line, TYPOGRAPHY)
  restoreLineWidths()
  expect(atMeasure.findings).toEqual([])
})
