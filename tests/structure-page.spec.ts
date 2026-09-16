/**
 * The page-contract halves of the browser-suite structure helpers: what the
 * shell, script, class-vocabulary, type, and motion checks report for markup
 * built right here, and how the checks are emitted as one self-contained page
 * source.
 *
 * happy-dom paints no box and no type, so the geometry and typography findings
 * need a real layout — the browser suites are the account of those, and the
 * geometry halves are held in `structure-helpers.spec.ts`. What a check reads
 * off markup built here is driven here, where the mutation runs can judge it.
 * The type and motion fixtures style their markup through a stylesheet and a
 * class, the way the product itself styles, since an element style declaration
 * is an inline style even in a fixture.
 */

import { beforeEach, expect, it } from 'bun:test'
import {
  finiteAnimations,
  structureCheckSource,
  typographyRamp,
  waitForFiniteAnimations,
} from '../apps/deeptail/tests/structure-emit.ts'
import type { StructureFinding } from '../apps/deeptail/tests/structure-report.ts'
import { checkInlineScripts, checkOneOffScripts, checkShell } from '../apps/deeptail/tests/structure-shell.ts'
import {
  checkClassVocabulary,
  checkReducedMotion,
  checkTypography,
} from '../apps/deeptail/tests/structure-vocabulary.ts'
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

/**
 * The declarations the type and motion cases read, as one stylesheet the
 * document carries. A declaration lives in a stylesheet even here, so a case
 * styles an element by adding the class the rule names — the same convention
 * the geometry suites follow.
 */
const DECLARATIONS = [
  `.type-between-rungs { font-size: 15px; line-height: 24px; ${FAMILY_PROPERTY}: ${SHIPPED_FAMILY}; }`,
  `.type-off-leading { font-size: ${String(RUNG_SIZE)}px; line-height: 30px; ${FAMILY_PROPERTY}: ${SHIPPED_FAMILY}; }`,
  `.type-no-leading { font-size: ${String(RUNG_SIZE)}px; ${FAMILY_PROPERTY}: ${SHIPPED_FAMILY}; }`,
  `.type-off-family { font-size: ${String(RUNG_SIZE)}px; line-height: ${String(RUNG_LEADING)}px; ${FAMILY_PROPERTY}: ${OFF_FAMILY}; }`,
  '.motion-over-budget { transition-duration: 0.3s; }',
  '.motion-at-budget { transition-duration: 0s; }',
].join('\n')

/**
 * What the off-scale paragraph reports: the size, which is no rung of the
 * ladder, and the line box that no longer pairs with any rung at all.
 */
const OFF_SCALE_FINDINGS = [
  { rule: 'off-scale-type', detail: 'p renders its text at 15px, which is no rung of the shipped type ladder' },
  {
    rule: 'off-scale-leading',
    detail: 'p sets a 24px line box, which is not the leading rung that pairs with its size',
  },
]

/**
 * One paragraph carrying text at 15px — a size between the ladder's rungs —
 * with a line box and a family the shipped sheets do name, so a case that
 * paints it isolates exactly the defect its name says.
 * @returns the off-scale paragraph.
 */
function offScaleText(): HTMLParagraphElement {
  const text = document.createElement('p')
  text.textContent = 'Sessions'
  text.className = 'type-between-rungs'
  return text
}

/**
 * One paragraph carrying the named fixture type, handed to the type check.
 * @param className - the fixture class the paragraph renders at.
 * @returns the findings the check reported.
 */
function typeFindings(className: string): StructureFinding[] {
  const root = surface('div')
  const text = document.createElement('p')
  text.textContent = 'Sessions'
  text.className = className
  root.append(text)
  document.body.append(root)
  const { findings, add } = collector()
  checkTypography(add, { scope: '[data-structure-scope]', typography: TYPOGRAPHY })
  return findings
}

/**
 * Reads the page as one who asked for less motion, and hands back the way to
 * put the engine's own answer back once the case has run.
 * @returns the restore.
 */
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
  mover.className = 'motion-over-budget'
  const still = document.createElement('div')
  still.className = 'motion-at-budget'
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

it('reports an empty document, which is a first paint that never seated', () => {
  const { findings, add } = collector()
  checkShell(add, { scope: '[data-deeptail-shell], [data-deeptail-picker]' })
  expect(findings).toEqual([
    {
      rule: 'empty-root',
      detail: 'the document has no product surface; first paint must seat the shell or the picker',
    },
  ])
})

it('reads one shell with one main as conforming', () => {
  const shell = document.createElement('div')
  shell.dataset['deeptailShell'] = ''
  shell.append(document.createElement('main'))
  document.body.append(shell)
  const { findings, add } = collector()
  checkShell(add, { scope: '[data-deeptail-shell]' })
  expect(findings).toEqual([])
})

it('reports a split shell, a nested shell, and a shell without exactly one main', () => {
  const first = document.createElement('div')
  first.dataset['deeptailShell'] = ''
  const nested = document.createElement('div')
  nested.dataset['deeptailShell'] = ''
  first.append(nested)
  const second = document.createElement('div')
  second.dataset['deeptailShell'] = ''
  const crowded = document.createElement('div')
  crowded.dataset['deeptailShell'] = ''
  crowded.append(document.createElement('main'), document.createElement('main'))
  document.body.append(first, second, crowded)
  const { findings, add } = collector()
  checkShell(add, { scope: '[data-deeptail-shell]' })
  expect(findings).toEqual([
    { rule: 'split-shell', detail: 'the document has 4 [data-deeptail-shell] roots; a document carries one' },
    { rule: 'nested-shell', detail: 'div contains another shell div' },
    { rule: 'shell-without-main', detail: 'div has no main landmark' },
    { rule: 'shell-without-main', detail: 'div has no main landmark' },
    { rule: 'shell-without-main', detail: 'div has no main landmark' },
    { rule: 'split-shell', detail: 'div contains 2 main landmarks' },
  ])
})

it('reports every script hanging off a product surface, inline or sourced', () => {
  const root = document.createElement('div')
  root.dataset['deeptailPicker'] = ''
  const inline = document.createElement('script')
  const sourced = document.createElement('script')
  sourced.setAttribute('src', '/src/injected.ts')
  root.append(inline, sourced)
  document.body.append(root)
  const { findings, add } = collector()
  checkInlineScripts(add, { scope: '[data-deeptail-picker]' })
  expect(findings).toEqual([
    { rule: 'inline-script', detail: 'script is an inline script inside div' },
    { rule: 'inline-script', detail: 'script loads /src/injected.ts from inside div; the page has one module entry' },
  ])
})

it('reports a sourced one-off outside the product surfaces, and stays silent for harness scripts', () => {
  const root = document.createElement('div')
  root.dataset['deeptailShell'] = ''
  const inside = document.createElement('script')
  inside.setAttribute('src', '/src/other.ts')
  root.append(inside)
  const harness = document.createElement('script')
  const shipped = document.createElement('script')
  shipped.setAttribute('src', '/src/main.ts')
  const chunk = document.createElement('script')
  chunk.setAttribute('src', '/assets/index-B1x2y3.js')
  const oneOff = document.createElement('script')
  oneOff.setAttribute('src', '/src/injected.ts')
  document.body.append(root, harness, shipped, chunk, oneOff)
  const { findings, add } = collector()
  checkOneOffScripts(add, { scope: '[data-deeptail-shell]' })
  expect(findings).toEqual([
    { rule: 'inline-script', detail: 'script loads /src/injected.ts; the page has one module entry' },
  ])
})

it('reports every class no shipped sheet defines, and stays silent for the vocabulary', () => {
  const root = surface('div')
  root.className = 'session-row'
  const child = document.createElement('button')
  child.className = 'picker-field one-off'
  root.append(child)
  document.body.append(root)
  const { findings, add } = collector()
  checkClassVocabulary(add, { scope: '[data-structure-scope]', vocabulary: ['session-row', 'picker-field'] })
  expect(findings).toEqual([
    {
      rule: 'unknown-class',
      detail: 'button.picker-field.one-off carries class "one-off", which no shipped sheet defines',
    },
  ])
})

it('reads text on a rung of the shipped ladder as conforming', () => {
  const root = surface('div')
  const text = document.createElement('p')
  text.textContent = 'Sessions'
  paintType(text, TYPOGRAPHY, RUNG)
  root.append(text)
  document.body.append(root)
  const { findings, add } = collector()
  checkTypography(add, { scope: '[data-structure-scope]', typography: TYPOGRAPHY })
  expect(findings).toEqual([])
})

it('reports a size off the ladder, with the line box that no longer pairs with it', () => {
  const root = surface('div')
  root.append(offScaleText())
  document.body.append(root)
  const { findings, add } = collector()
  checkTypography(add, { scope: '[data-structure-scope]', typography: TYPOGRAPHY })
  expect(findings).toEqual(OFF_SCALE_FINDINGS)
})

it('reports a line box off the rung its own size pairs with, and stays silent on the pair', () => {
  expect(typeFindings('type-off-leading')).toEqual([
    {
      rule: 'off-scale-leading',
      detail: 'p sets a 30px line box, which is not the leading rung that pairs with its size',
    },
  ])
})

it('reports the engine line box, which no rung of the ladder reaches', () => {
  expect(typeFindings('type-no-leading')).toEqual([
    {
      rule: 'off-scale-leading',
      detail: "p renders with the engine's own normal line box rather than a rung of the ladder",
    },
  ])
})

it('reports a family no shipped sheet names', () => {
  expect(typeFindings('type-off-family')).toEqual([
    { rule: 'off-scale-family', detail: `p renders in ${OFF_FAMILY}, which no shipped sheet names` },
  ])
})

it('reads a dialog frame the product surfaces do not cover', () => {
  const frame = document.createElement('div')
  frame.dataset['deeptailDialog'] = ''
  frame.append(offScaleText())
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
      detail: "div runs a transition of 0.3s while the reader asked for less motion, where the page's own budget is 0s",
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
  expect(coarse).toContain('"target":44')
  expect(coarse).toContain('"vocabulary":["session-row"]')
  expect(coarse).toContain('"sizes":[12,13,14,16,18]')
  expect(coarse).toContain('"leadings":[18,20,22,24,26]')
  expect(coarse).toContain('[data-deeptail-picker]')
  expect(coarse).toContain('a[href]')
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
