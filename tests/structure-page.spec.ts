/**
 * The type, motion and emission halves of the page-contract checks: what they
 * report for markup built right here, and how the checks are emitted as one
 * self-contained page source.
 *
 * happy-dom paints no box and no type, so the geometry and typography findings
 * need a real layout — the browser suites are the account of those, and the
 * geometry halves are held in `structure-helpers.spec.ts`. What a check reads
 * off markup built here is driven here, where the mutation runs can judge it.
 * The type and motion fixtures style their markup through a stylesheet and a
 * class, since an element style declaration is an inline style even in a
 * fixture. The shell, script and vocabulary halves live in
 * `structure-page-shell.spec.ts`.
 *
 * @module
 */

import { beforeEach, expect, it } from 'bun:test'
import {
  finiteAnimations,
  structureCheckSource,
  typographyRamp,
  waitForFiniteAnimations,
} from '../apps/deeptail/tests/structure-emit.ts'
import type { StructureFinding } from '../apps/deeptail/tests/structure-report.ts'
import { checkTypography } from '../apps/deeptail/tests/structure-typography.ts'
import { checkReducedMotion } from '../apps/deeptail/tests/structure-vocabulary.ts'
import { resetDocument } from './dom.ts'
import { collector, FAMILY_PROPERTY, paintType, surface } from './structure-double.ts'
import { SHIPPED_CHECKS } from './structure-shipped.ts'

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

/** The fixture classes, named once: the rules, the markup, and the expected
 * findings all read the same name, since a finding names the element it is
 * about by its class. */
const AT_RUNG_CLASS = 'type-at-rung'
const BETWEEN_RUNGS_CLASS = 'type-between-rungs'
const OFF_LEADING_CLASS = 'type-off-leading'
const NO_LEADING_CLASS = 'type-no-leading'
const OFF_FAMILY_CLASS = 'type-off-family'
const OFF_WEIGHT_CLASS = 'type-off-weight'
const OFF_TRACKING_CLASS = 'type-off-tracking'
const DECLARED_CASE_CLASS = 'type-declared-case'
const OFF_CASING_CLASS = 'type-off-casing'
const MOTION_OVER_CLASS = 'motion-over-budget'
const MOTION_AT_CLASS = 'motion-at-budget'

/** The declarations the type and motion cases read, as one stylesheet the
 * document carries, so a case styles an element by adding the class it names. */
const DECLARATIONS = [
  `.${AT_RUNG_CLASS} { ${AT_RUNG} }`,
  `.${BETWEEN_RUNGS_CLASS} { font-size: 15px; line-height: 24px; ${FAMILY_PROPERTY}: ${SHIPPED_FAMILY}; }`,
  `.${OFF_LEADING_CLASS} { ${AT_RUNG} line-height: 30px; }`,
  `.${NO_LEADING_CLASS} { ${AT_RUNG} line-height: normal; }`,
  `.${OFF_FAMILY_CLASS} { ${AT_RUNG} ${FAMILY_PROPERTY}: ${OFF_FAMILY}; }`,
  `.${OFF_WEIGHT_CLASS} { ${AT_RUNG} font-weight: 300; }`,
  `.${OFF_TRACKING_CLASS} { ${AT_RUNG} letter-spacing: 5.4px; }`,
  `.${DECLARED_CASE_CLASS} { ${AT_RUNG} text-transform: uppercase; }`,
  `.${OFF_CASING_CLASS} { ${AT_RUNG} text-transform: full-width; }`,
  `.${MOTION_OVER_CLASS} { transition-duration: 0.3s; }`,
  `.${MOTION_AT_CLASS} { transition-duration: 0s; }`,
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

/** One paragraph carrying the named fixture type. */
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
  root.append(paragraph(AT_RUNG_CLASS), paragraph(DECLARED_CASE_CLASS))
  root.append(...classNames.map((name) => paragraph(name)))
  document.body.append(root)
  const { findings, add } = collector()
  checkTypography(add, { scope: '[data-structure-scope]', typography: TYPOGRAPHY })
  return findings
}

/** Reads the page as one who asked for less motion, and hands back the restore. */
function underReduce() {
  const original = window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    value: (query: string) => ({ matches: query.includes('reduce'), media: query }),
    configurable: true,
  })
  return () => Object.defineProperty(window, 'matchMedia', { value: original, configurable: true })
}

/**
 * One surface carrying a transition over the page's own budget beside one at
 * it, handed to the motion check.
 * @returns the findings the check reported.
 */
function motionFindings(): StructureFinding[] {
  const root = surface('div')
  const mover = document.createElement('div')
  mover.className = MOTION_OVER_CLASS
  const still = document.createElement('div')
  still.className = MOTION_AT_CLASS
  root.append(mover, still)
  document.body.append(root)
  const { findings, add } = collector()
  checkReducedMotion(add, { scope: '[data-structure-scope]' })
  return findings
}

beforeEach(() => {
  resetDocument()
  const sheet = document.createElement('style')
  sheet.textContent = DECLARATIONS
  document.head.append(sheet)
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
  expect(typeFindings(OFF_WEIGHT_CLASS, OFF_TRACKING_CLASS, OFF_CASING_CLASS)).toEqual([
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

it('reads a dialog frame the product surfaces do not cover', () => {
  const frame = document.createElement('div')
  frame.dataset['deeptailDialog'] = ''
  frame.append(paragraph(BETWEEN_RUNGS_CLASS))
  document.body.append(frame)
  const { findings, add } = collector()
  checkTypography(add, { scope: '[data-structure-scope]', typography: TYPOGRAPHY })
  expect(findings).toEqual(OFF_SCALE_FINDINGS)
})

it('reports motion over the page budget under reduce, and stays silent at or under it', () => {
  const restore = underReduce()
  const findings = motionFindings()
  restore()
  expect(findings).toEqual([
    {
      rule: 'motion-not-reduced',
      detail: `div.${MOTION_OVER_CLASS} runs a transition of 0.3s while the reader asked for less motion, where the page's own budget is 0s`,
    },
  ])
})

it('stays silent for a reader who never asked for less motion', () => {
  expect(motionFindings()).toEqual([])
})

it('emits the checks as one self-contained page source, with the limits passed in the call', async () => {
  const coarse = await structureCheckSource(true, ['session-row'])
  // The source is an async IIFE: it settles the page's fonts and running
  // animations before it measures, so a finding read mid-flight cannot name a
  // defect the finished layout does not have.
  expect(coarse.startsWith('(async () => {')).toBe(true)
  expect(coarse.endsWith('})()')).toBe(true)
  expect(coarse).toContain('await waitForFiniteAnimations()')
  expect(coarse).toContain('await document.fonts.ready')
  expect(coarse).toContain('await Promise.allSettled')
  expect(coarse).toContain('[data-deeptail-picker]')
  expect(coarse).toContain('a[href]')
  // Every declaration read out of the token sheet travels with them: a scale
  // the page never receives would measure nothing, and one restated here would
  // measure against a scale nobody ships.
  for (const held of [
    '"sizes":[12,13,14,16,18]',
    '"leadings":[18,20,22,24,26]',
    '"weights":[400,500,600]',
    '"trackings":[0.04,0.08]',
    '"casings":["none","uppercase","lowercase","capitalize"]',
    '"measure":640',
    '"target":44',
    '"vocabulary":["session-row"]',
  ]) {
    expect(coarse).toContain(held)
  }
  const fine = await structureCheckSource(false, [])
  expect(fine).toContain('"target":24')
  expect(fine).toContain('"vocabulary":[]')
  // Every check the page runs is shipped in that source, by name — the helpers
  // the checks call included, since the source carries nothing else.
  expect(SHIPPED_CHECKS.filter((name) => !coarse.includes(`function ${name}`))).toEqual([])
})

it('drops infinite animations and keeps ones that finish', () => {
  const spinning = {
    effect: { getComputedTiming: () => ({ iterations: Number.POSITIVE_INFINITY }) },
    finished: Promise.resolve(),
  }
  const once = {
    effect: { getComputedTiming: () => ({ iterations: 1 }) },
    finished: Promise.resolve(),
  }
  const none = { effect: null, finished: Promise.resolve() }
  expect(finiteAnimations([spinning, once, none])).toEqual([once])
})

it('settles the layout without waiting on a spinner', async () => {
  Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: Promise.resolve() } })
  Object.defineProperty(document, 'getAnimations', { configurable: true, value: () => [] })
  await waitForFiniteAnimations()
})
