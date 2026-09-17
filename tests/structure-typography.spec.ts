/**
 * The type the page renders, measured against the scale the token sheet
 * declares: every rung, every comparison, and the line lengths a range reports.
 *
 * happy-dom renders no type of its own, so a case paints a rung of the shipped
 * ladder onto the element it measures — read out of the token sheet at runtime
 * rather than restated — and paints the line widths a range reports, since the
 * engine lays nothing out here. The browser suites remain the account of what a
 * real engine renders; what each rule decides from what it reads is driven
 * here, where the mutation runs can judge it.
 *
 * @module
 */

import { beforeEach, expect, it } from 'bun:test'
import { typographyRamp } from '../apps/deeptail/tests/structure-emit.ts'
import type { StructureFinding } from '../apps/deeptail/tests/structure-report.ts'
import {
  asReported,
  checkTypography,
  lineWidths,
  reportMeasure,
} from '../apps/deeptail/tests/structure-typography.ts'
import { resetDocument } from './dom.ts'
import {
  collector,
  FAMILY_PROPERTY,
  paintBox,
  paintLineWidths,
  paintType,
  restoreLineWidths,
  surface,
  typeDeclarations,
} from './structure-double.ts'

/**
 * The ladder the shipped token sheet declares, read once for the cases below.
 *
 * The ramp is read rather than restated: a ladder copied into this file is a
 * second ladder that agrees with the shipped one until the day it does not.
 */
const TYPOGRAPHY = await typographyRamp()

/** The rung the conforming markup is painted at: the ladder's last. */
const RUNG = TYPOGRAPHY.sizes.length - 1

/** That rung's size, the leading that pairs with it, and the shipped family. */
const RUNG_SIZE = TYPOGRAPHY.sizes[RUNG] ?? 0
const RUNG_LEADING = TYPOGRAPHY.leadings[RUNG] ?? 0
const SHIPPED_FAMILY = TYPOGRAPHY.families[0] ?? ''

/** A family no shipped sheet names, which the off-family case renders in. */
const OFF_FAMILY = ['ui-monospace', 'monospace'].join(', ')

/** The type every fixture case starts from: one rung, with the shipped family. */
const AT_RUNG = `font-size: ${String(RUNG_SIZE)}px; line-height: ${String(RUNG_LEADING)}px; ${FAMILY_PROPERTY}: ${SHIPPED_FAMILY};`

/** The tracking rung that pairs with the rung under test, in pixels. */
const RUNG_TRACKING = (TYPOGRAPHY.trackings[0] ?? 0) * RUNG_SIZE

/**
 * The fixture classes, named once: the rules, the markup, and the expected
 * findings all read the same name, since a finding names the element it is
 * about by its class.
 */
const AT_RUNG_CLASS = 'type-at-rung'
const BETWEEN_RUNGS_CLASS = 'type-between-rungs'
const OFF_LEADING_CLASS = 'type-off-leading'
const NO_LEADING_CLASS = 'type-no-leading'
const OFF_FAMILY_CLASS = 'type-off-family'
const DECLARED_WEIGHT_CLASS = 'type-declared-weight'
const BOLD_WEIGHT_CLASS = 'type-bold-weight'
const OFF_WEIGHT_CLASS = 'type-off-weight'
const ON_TRACKING_CLASS = 'type-on-tracking'
const OFF_TRACKING_CLASS = 'type-off-tracking'
const DECLARED_CASE_CLASS = 'type-declared-case'
const OFF_CASING_CLASS = 'type-off-casing'
const ONE_LINE_CLASS = 'type-one-line'

/** The declarations the type cases read, as one stylesheet the document
 * carries, so a case styles an element by adding the class it names. */
const DECLARATIONS = [
  `.${AT_RUNG_CLASS} { ${AT_RUNG} }`,
  `.${BETWEEN_RUNGS_CLASS} { font-size: 15px; line-height: 24px; ${FAMILY_PROPERTY}: ${SHIPPED_FAMILY}; }`,
  `.${OFF_LEADING_CLASS} { ${AT_RUNG} line-height: 30px; }`,
  `.${NO_LEADING_CLASS} { ${AT_RUNG} line-height: normal; }`,
  `.${OFF_FAMILY_CLASS} { ${AT_RUNG} ${FAMILY_PROPERTY}: ${OFF_FAMILY}; }`,
  `.${DECLARED_WEIGHT_CLASS} { ${AT_RUNG} font-weight: 500; }`,
  `.${BOLD_WEIGHT_CLASS} { ${AT_RUNG} font-weight: bold; }`,
  `.${OFF_WEIGHT_CLASS} { ${AT_RUNG} font-weight: 300; }`,
  `.${ON_TRACKING_CLASS} { ${AT_RUNG} letter-spacing: ${String(RUNG_TRACKING)}px; }`,
  `.${OFF_TRACKING_CLASS} { ${AT_RUNG} letter-spacing: 5.4px; }`,
  `.${DECLARED_CASE_CLASS} { ${AT_RUNG} text-transform: uppercase; }`,
  `.${OFF_CASING_CLASS} { ${AT_RUNG} text-transform: full-width; }`,
  `.${ONE_LINE_CLASS} { ${AT_RUNG} white-space: nowrap; text-overflow: ellipsis; }`,
].join('\n')

/** What the off-scale paragraph reports: a size between the rungs, and the line
 * box that no longer pairs with any rung at all. */
const OFF_SCALE_FINDINGS = [
  {
    rule: 'off-scale-type',
    detail: `p.${BETWEEN_RUNGS_CLASS} renders its text at 15px, which is no rung of the shipped type ladder`,
  },
  {
    rule: 'off-scale-leading',
    detail: `p.${BETWEEN_RUNGS_CLASS} sets a 24px line box, which is not the leading rung that pairs with its size`,
  },
]

/** The text the wide-line cases carry, long enough to reach the measure. */
const LONG_LINE = 'A line of text long enough to pass the measure the sheets declare'

/**
 * One paragraph carrying the named fixture type.
 * @param className - the fixture class to render at.
 * @returns the paragraph.
 */
function paragraph(className: string): HTMLParagraphElement {
  const text = document.createElement('p')
  text.textContent = 'Sessions'
  text.className = className
  return text
}

/**
 * Every finding the type check reports for one surface carrying the named
 * fixture paragraphs, with a conforming paragraph of each direction beside
 * them, so every case reads both what the rule refuses and what it leaves.
 * @param classNames - the fixture classes the off-scale paragraphs render at.
 * @returns the findings the check reported.
 */
function typeFindings(...classNames: readonly string[]): StructureFinding[] {
  const root = surface('div')
  root.append(paragraph(AT_RUNG_CLASS), paragraph(DECLARED_CASE_CLASS), paragraph(ON_TRACKING_CLASS))
  root.append(...classNames.map((name) => paragraph(name)))
  document.body.append(root)
  const { findings, add } = collector()
  checkTypography(add, { scope: '[data-structure-scope]', typography: TYPOGRAPHY })
  return findings
}

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
  resetDocument()
  const sheet = document.createElement('style')
  sheet.textContent = DECLARATIONS
  document.head.append(sheet)
})

it('refuses to paint a rung the shipped ladder does not have, or a rung with no family to paint', () => {
  expect(() => typeDeclarations(TYPOGRAPHY, TYPOGRAPHY.sizes.length)).toThrow(
    `deeptail: the shipped ladder has no rung ${String(TYPOGRAPHY.sizes.length)} or no family to paint`,
  )
  // A `null` family is the other half of the guard: the rung exists, and there
  // is still nothing to paint the text in.
  expect(() => typeDeclarations(TYPOGRAPHY, 0, { family: null })).toThrow(
    'deeptail: the shipped ladder has no rung 0 or no family to paint',
  )
  // The engine's own line box is asked for by leaving the declaration out.
  expect(typeDeclarations(TYPOGRAPHY, 0, { leading: null })).not.toContain('line-height')
})

it('reads a keyword the engine reports as nothing as what an absent declaration computes to', () => {
  expect(asReported('  ', 'normal')).toBe('normal')
  expect(asReported('uppercase', 'none')).toBe('uppercase')
})

it('reads text on a rung of the shipped ladder as conforming', () => {
  const root = surface('div')
  const text = paragraph(AT_RUNG_CLASS)
  paintType(text, TYPOGRAPHY, RUNG)
  root.append(text)
  document.body.append(root)
  const { findings, add } = collector()
  checkTypography(add, { scope: '[data-structure-scope]', typography: TYPOGRAPHY })
  expect(findings).toEqual([])
})

it('reports a size off the ladder, with the line box that no longer pairs with it', () => {
  expect(typeFindings(BETWEEN_RUNGS_CLASS)).toEqual(OFF_SCALE_FINDINGS)
})

it('reports a line box off the rung its own size pairs with, and stays silent on the pair', () => {
  expect(typeFindings(OFF_LEADING_CLASS)).toEqual([
    {
      rule: 'off-scale-leading',
      detail: `p.${OFF_LEADING_CLASS} sets a 30px line box, which is not the leading rung that pairs with its size`,
    },
  ])
})

it('reports the engine line box, which no rung of the ladder reaches', () => {
  expect(typeFindings(NO_LEADING_CLASS)).toEqual([
    {
      rule: 'off-scale-leading',
      detail: `p.${NO_LEADING_CLASS} renders with the engine's own normal line box rather than a rung of the ladder`,
    },
  ])
})

it('reports a family no shipped sheet names', () => {
  expect(typeFindings(OFF_FAMILY_CLASS)).toEqual([
    {
      rule: 'off-scale-family',
      detail: `p.${OFF_FAMILY_CLASS} renders in ${OFF_FAMILY}, which no shipped sheet names`,
    },
  ])
})

it('reports a weight, a tracking and a case outside the shipped scale, and reads the declared ones', () => {
  // Three decisions that were stated wherever a heading or a label was styled
  // and that nothing read: a weight, a tracking that is a fraction of the type
  // it sits beside, and a letter case.
  expect(typeFindings(DECLARED_WEIGHT_CLASS, OFF_WEIGHT_CLASS, OFF_TRACKING_CLASS, OFF_CASING_CLASS)).toEqual([
    {
      rule: 'off-scale-weight',
      detail: `p.${OFF_WEIGHT_CLASS} renders at font-weight 300, which is no rung of the shipped weight ladder`,
    },
    {
      rule: 'off-scale-tracking',
      detail: `p.${OFF_TRACKING_CLASS} renders with 5.4px letter spacing at ${String(RUNG_SIZE)}px, which is no rung of the shipped tracking ladder`,
    },
    {
      rule: 'off-scale-casing',
      detail: `p.${OFF_CASING_CLASS} renders text-transform full-width, which is no case the product declares`,
    },
  ])
})

it('reports the engine own bold, which is no rung of the shipped weight ladder', () => {
  expect(typeFindings(BOLD_WEIGHT_CLASS)).toEqual([
    {
      rule: 'off-scale-weight',
      detail: `p.${BOLD_WEIGHT_CLASS} renders at font-weight bold, which is no rung of the shipped weight ladder`,
    },
  ])
})

it('reads a dialog frame the product surfaces do not cover', () => {
  const frame = document.createElement('div')
  frame.dataset['deeptailDialog'] = ''
  frame.append(paragraph(BETWEEN_RUNGS_CLASS))
  document.body.append(frame)
  const { findings, add } = collector()
  checkTypography(add, { scope: '[data-structure-scope]', typography: TYPOGRAPHY })
  expect(findings).toEqual(OFF_SCALE_FINDINGS)
})

it('reads only the element carrying the text, and skips a box its own clip hides', () => {
  const root = surface('div')
  const holder = document.createElement('div')
  holder.className = BETWEEN_RUNGS_CLASS
  holder.append(paragraph(AT_RUNG_CLASS))
  const hidden = document.createElement('p')
  hidden.textContent = 'Sessions'
  hidden.id = 'hidden-name'
  paintType(hidden, TYPOGRAPHY, 0)
  const clip = document.createElement('style')
  clip.textContent = '#hidden-name { clip: rect(0px, 0px, 0px, 0px); }'
  root.append(holder, hidden)
  document.body.append(root, clip)
  const { findings, add } = collector()
  checkTypography(add, { scope: '[data-structure-scope]', typography: TYPOGRAPHY })
  // The holder is painted at a size off the ladder and carries no text of its
  // own, and the hidden name carries text the reader is never shown: neither
  // has rendered type for a rung to be missing from.
  expect(findings).toEqual([])
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
