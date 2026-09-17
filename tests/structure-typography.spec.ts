/**
 * The type the page renders, measured against the scale the token sheet
 * declares: every rung a decision lands on, and every comparison between them.
 *
 * happy-dom renders no type of its own, so a case paints a rung of the shipped
 * ladder onto the element it measures — read out of the token sheet at runtime
 * rather than restated — and the browser suites remain the account of what a
 * real engine renders. What each rule decides from what it reads is driven here,
 * where the mutation runs can judge it; the line lengths a range reports are
 * held in `structure-typography-measure.spec.ts`.
 *
 * @module
 */

import { beforeEach, expect, it } from 'bun:test'
import type { StructureFinding } from '../apps/deeptail/tests/structure-report.ts'
import { asReported, checkTypography } from '../apps/deeptail/tests/structure-typography.ts'
import { collector, paintType, surface, typeDeclarations } from './structure-double.ts'
import {
  AT_RUNG_CLASS,
  BETWEEN_RUNGS_CLASS,
  BOLD_WEIGHT_CLASS,
  DECLARED_CASE_CLASS,
  DECLARED_WEIGHT_CLASS,
  NO_LEADING_CLASS,
  OFF_CASING_CLASS,
  OFF_FAMILY,
  OFF_FAMILY_CLASS,
  OFF_LEADING_CLASS,
  OFF_TRACKING_CLASS,
  OFF_WEIGHT_CLASS,
  ON_TRACKING_CLASS,
  paragraph,
  RUNG,
  RUNG_PIXELS,
  resetTypeSheet,
  TYPOGRAPHY,
} from './structure-typography-fixture.ts'

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

beforeEach(() => {
  resetTypeSheet()
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
      detail: `p.${OFF_TRACKING_CLASS} renders with 5.4px letter spacing at ${String(RUNG_PIXELS)}px, which is no rung of the shipped tracking ladder`,
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
  frame.dataset.deeptailDialog = ''
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
