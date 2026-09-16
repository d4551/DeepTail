/**
 * What the page shows has to be something the shipped sheets named: the classes
 * it carries, the type and font every piece of its text lands on, and the motion
 * it spends.
 *
 * A class outside the vocabulary is a styling or hooking decision made outside
 * the design system: a one-off per-page name no gate reads and no sheet styles,
 * which is exactly how a utility framework's vocabulary (`btn`, `p-4`) drifts
 * in. The page is the ground truth — a class composed at runtime shows up here
 * in its final spelling.
 *
 * Type, weight, tracking, case and measure are the same question asked of values
 * rather than names. The scale in `tokens.css` is one ladder of sizes, one of
 * leading ratios that pairs with it rung for rung, the weights a face is drawn
 * at, the tracking two display names carry, the families the product ships, and
 * the budget every surface that moves pays for its motion out of; a size, a line
 * box, a weight, a tracking or a family outside those is a decision taken
 * outside the sheet, and the page renders it whether or not a sheet declares it
 * — from an injected stylesheet, a browser default, or a rule that never named a
 * rung. A letter case is the same question with no rung to read: the declared
 * set is the whole declaration, and a case outside it is a second one. A measure
 * has no declaration site at all, so the page reports any line that runs past
 * the stated maximum whatever box the layout happened to give it.
 *
 * @module
 */

import { declarationsOf } from '../../../scripts/sheet-reader.ts'
import {
  CASINGS,
  declaredTokens,
  LADDERS,
  LEADING,
  ladderRungs,
  MEASURE_MAX,
  TRACKING,
  TYPE,
  WEIGHT,
} from '../../../scripts/sheet-scale.ts'
import { describe, pixelLength, type Report } from './structure-report.ts'

/** What the vocabulary check reads, as the caller hands it to the page. */
interface VocabularyLimits {
  /** The product surfaces the check reads, as one selector list. */
  readonly scope: string
  /** Every class name the shipped stylesheets define. */
  readonly vocabulary: readonly string[]
}

/**
 * Report every class an element carries that no shipped sheet defines.
 * @param add - collects a finding.
 * @param limits - the surfaces to read and the vocabulary to read against.
 */
function checkClassVocabulary(add: Report, limits: VocabularyLimits): void {
  const known = new Set(limits.vocabulary)
  for (const node of document.querySelectorAll(limits.scope)) {
    for (const element of [node, ...node.querySelectorAll('*')]) {
      for (const token of element.classList) {
        if (!known.has(token)) {
          add('unknown-class', `${describe(element)} carries class "${token}", which no shipped sheet defines`)
        }
      }
    }
  }
}

/** The type the shipped sheets render, as the page measures against it. */
export interface TypographyRamp {
  /** The type rungs, in ladder order, in CSS pixels. */
  readonly sizes: readonly number[]
  /** The line box each type rung's leading resolves to, rung for rung. */
  readonly leadings: readonly number[]
  /** The family lists the shipped sheets declare, normalized for comparison. */
  readonly families: readonly string[]
  /** The weights the shipped weight ladder declares, in ladder order. */
  readonly weights: readonly number[]
  /** The tracking rungs, as the fraction of the type each sits beside. */
  readonly trackings: readonly number[]
  /** The letter cases a sheet may set. */
  readonly casings: readonly string[]
  /** The longest line of text the product draws, in CSS pixels. */
  readonly measure: number
}

/** The declarations the shipped family lists are read out of. */
const FAMILY_TOKENS: ReadonlySet<string> = new Set(['--dsw-font-family', '--ds-font-family-code'])

/** A leading rung, holding a ratio between two whole numbers. */
const RATIO = /^calc\(\s*(\d+)\s*\/\s*(\d+)\s*\)$/u

/** A tracking rung, holding a fraction of the type it sits beside. */
const TRACKING_EM = /^(\d+(?:\.\d+)?)em$/u

/**
 * The pixels a leading rung's ratio resolves to against its type rung.
 *
 * The ladder states leading as a ratio rather than a length so that a reader
 * who raises their text size keeps their leading with it (WCAG 1.4.4), which
 * means the line box exists only once the ratio is taken against the type rung
 * it pairs with. A ratio that is not of that form is a token sheet this reader
 * cannot resolve, and it says so rather than guessing a line box.
 * @param ratio - the rung's value, as the token sheet writes it.
 * @param size - the type rung it pairs with, in CSS pixels.
 * @returns the line box it resolves to, in CSS pixels.
 */
function leadingPixels(ratio: string, size: number): number {
  const found = RATIO.exec(ratio)
  const numerator = Number(found?.[1])
  const denominator = Number(found?.[2])
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    throw new Error(`deeptail: ${ratio} is not a leading ratio written calc(<whole> / <whole>)`)
  }
  return (numerator * size) / denominator
}

/**
 * A family list, in the one spelling both sides of the comparison can take.
 *
 * A sheet writes a family list across several lines with the quotes the CSS
 * grammar wants; the engine hands the same list back on one line. Neither
 * spelling is the decision — the list of names is — so the comparison is made
 * on the names.
 * @param value - the declaration, or the computed value.
 * @returns one comparable string.
 */
function familyListOf(value: string): string {
  return value.replaceAll(/\s+/gu, ' ').replaceAll(/["']/gu, '').trim().toLowerCase()
}

/**
 * The values one family of the scale declares, in ladder order.
 * @param written - every token the shipped token sheet writes.
 * @param stem - the family to read.
 * @returns the values, as the sheet writes them.
 */
function declaredRungValues(written: ReadonlyMap<string, { readonly first: { readonly value: string } }>, stem: string) {
  const ladder = LADDERS.find((one) => one.stem === stem)
  if (ladder === undefined) throw new Error(`deeptail: the scale declares no ${stem} family to read`)
  return ladderRungs(ladder, written).rungs.map((rung) => rung.value)
}

/**
 * Resolve the typography scale out of the token sheet.
 *
 * The sheet is read rather than restated: a scale copied into the test tree is a
 * second ladder that agrees with the shipped one until the day it does not, and
 * the check would then measure the product against a scale nobody ships. The
 * rungs come back in ladder order from the one module that declares the
 * ladders, so the leading rung at an index pairs with the type rung at the same
 * index by construction rather than by a second list of names.
 * @param text - the token sheet's contents.
 * @returns the sizes, their line boxes, the families, the weights, the tracking
 * rungs, the letter cases, and the measure the page is read against.
 */
export function typographyRampFrom(text: string): TypographyRamp {
  const written = declaredTokens(text)
  const type = LADDERS.find((one) => one.stem === TYPE)
  const leading = LADDERS.find((one) => one.stem === LEADING)
  if (type === undefined || leading === undefined) {
    throw new Error('deeptail: the scale declares no type ladder or no leading ladder to pair it with')
  }
  const sizes = ladderRungs(type, written).rungs.map((rung) => pixelLength(rung.value))
  const ratios = ladderRungs(leading, written).rungs
  if (sizes.length !== ratios.length) {
    throw new Error('deeptail: the leading ladder does not pair with the type ladder rung for rung')
  }
  const families = declarationsOf(text)
    .filter((declaration) => FAMILY_TOKENS.has(declaration.property))
    .map((declaration) => familyListOf(declaration.value))
  const trackings = declaredRungValues(written, TRACKING).map((value) => {
    const em = TRACKING_EM.exec(value)?.[1]
    if (em === undefined) throw new Error(`deeptail: ${value} is not a tracking written as a fraction of em`)
    return Number(em)
  })
  return {
    sizes,
    leadings: sizes.map((size, index) => leadingPixels(ratios[index]?.value ?? '', size)),
    families,
    weights: declaredRungValues(written, WEIGHT).map(Number),
    trackings,
    casings: [...CASINGS],
    measure: MEASURE_MAX,
  }
}

/** What the typography check reads, as the caller hands it to the page. */
interface TypographyLimits {
  /** The surfaces to read: the product's own, and every dialog frame it opens. */
  readonly scope: string
  /** The scale the page's type has to land on. */
  readonly typography: TypographyRamp
}

/**
 * The width of every line box the text of one element paints.
 *
 * A line runs as wide as the box around it happens to be, which is why a
 * measure has no declaration site: the reading is decided by whatever the
 * layout gave the text rather than by the sheet. Each text run is measured
 * through a range, which reports one rectangle per line box, so the answer is
 * the line the reader reads rather than the box the line sits in.
 *
 * Two shapes are left out, and both are the box rather than the reading
 * deciding: text truncated with an ellipsis, where the reader is told the rest
 * is there, and text whose own box is already narrower than the maximum, where
 * nothing can run past it.
 * @param element - the element whose own text is measured.
 * @param measure - the declared maximum, in CSS pixels.
 * @returns the width of each line, in CSS pixels.
 */
function lineBoxWidths(element: Element, measure: number): number[] {
  const style = getComputedStyle(element)
  if (element.getBoundingClientRect().width < measure) return []
  if (style.whiteSpace === 'nowrap' && style.textOverflow === 'ellipsis') return []
  const range = document.createRange()
  const widths: number[] = []
  for (const child of element.childNodes) {
    if (child.nodeType !== Node.TEXT_NODE || (child.textContent ?? '').trim() === '') continue
    range.selectNodeContents(child)
    for (const rect of range.getClientRects()) {
      if (rect.width > 0) widths.push(rect.width)
    }
  }
  return widths
}

/**
 * Every rendered text size, line box, family, weight, tracking, case and line
 * length lands on what the sheets declare.
 *
 * Nothing else asks this. The sheet gate reads what a *sheet* declares, so a
 * value arriving from anywhere else — a browser default on a control no rule
 * styled, an injected stylesheet, a `font` shorthand that resets what the
 * ladder had set — is invisible to it, and the rendered page is the only place
 * the two spellings of one decision meet. A page whose control renders at the
 * engine's own 13.33px default is a page that shipped two type scales, one of
 * them by accident; a page whose heading renders at the engine's own bold is
 * one that shipped a second weight set the same way.
 *
 * Only elements carrying their own text are read: an element that holds nothing
 * but another's text inherits whatever that text was given, so reporting it
 * too would name the tree rather than the decision. Each element's leading is
 * read against the leading rung that pairs with its own size, and its tracking
 * against the type size it renders at, which is what makes the comparisons
 * meaningful at all — a page may use any rung, but the type and the leading on
 * one element have to be the same rung's, and a tracking is a fraction of the
 * type it sits beside.
 *
 * Sizes are compared to within a hundredth of a pixel, the rounding a relative
 * size leaves behind; a line box the engine chose for itself (`normal`) is
 * reported, because that is a leading no rung of the ladder reaches. A tracking
 * the engine reports as `normal` is the absence of one and reads as nought,
 * which every element that is not a display name renders at.
 * @param add - collects a finding.
 * @param limits - the surfaces to read and the scale to read against.
 */
function checkTypography(add: Report, limits: TypographyLimits): void {
  const roots = [...document.querySelectorAll(limits.scope), ...document.querySelectorAll('[data-deeptail-dialog]')]
  for (const root of roots) {
    for (const element of [root, ...root.querySelectorAll('*')]) {
      const carries = [...element.childNodes].some(
        (child) => child.nodeType === Node.TEXT_NODE && (child.textContent ?? '').trim() !== '',
      )
      if (!carries) continue
      const style = getComputedStyle(element)
      const size = pixelLength(style.fontSize)
      const rung = limits.typography.sizes.findIndex((one) => Math.abs(one - size) <= 0.01)
      if (rung === -1) {
        add(
          'off-scale-type',
          `${describe(element)} renders its text at ${style.fontSize}, which is no rung of the shipped type ladder`,
        )
      }
      const box = limits.typography.leadings[rung]
      if (!style.lineHeight.endsWith('px')) {
        add(
          'off-scale-leading',
          `${describe(element)} renders with the engine's own ${style.lineHeight} line box rather than a rung of the ladder`,
        )
      } else if (box === undefined || Math.abs(box - pixelLength(style.lineHeight)) > 0.01) {
        add(
          'off-scale-leading',
          `${describe(element)} sets a ${style.lineHeight} line box, which is not the leading rung that pairs with its size`,
        )
      }
      const family = familyListOf(style.fontFamily)
      if (!limits.typography.families.includes(family)) {
        add('off-scale-family', `${describe(element)} renders in ${family}, which no shipped sheet names`)
      }
      if (!limits.typography.weights.includes(Number(style.fontWeight))) {
        add(
          'off-scale-weight',
          `${describe(element)} renders at font-weight ${style.fontWeight}, which is no rung of the shipped weight ladder`,
        )
      }
      const tracking = style.letterSpacing.trim() === 'normal' ? 0 : pixelLength(style.letterSpacing)
      const tracked = limits.typography.trackings.some((ratio) => Math.abs(ratio * size - tracking) <= 0.01)
      if (!tracked) {
        add(
          'off-scale-tracking',
          `${describe(element)} renders with ${style.letterSpacing} letter spacing at ${style.fontSize}, which is no rung of the shipped tracking ladder`,
        )
      }
      if (!limits.typography.casings.includes(style.textTransform)) {
        add(
          'off-scale-casing',
          `${describe(element)} renders text-transform ${style.textTransform}, which is no case the product declares`,
        )
      }
      for (const width of lineBoxWidths(element, limits.typography.measure)) {
        if (width <= limits.typography.measure) continue
        add(
          'off-scale-measure',
          `${describe(element)} renders a line of ${String(Math.round(width))}px, past the ${String(limits.typography.measure)}px measure the sheets declare`,
        )
      }
    }
  }
}

/**
 * Every duration a computed multi-value declaration holds, in seconds.
 *
 * `transition-duration`, `transition-delay` and `animation-duration` are comma
 * separated lists the engine reports in whichever unit the sheet wrote, and a
 * surface can carry several at once — the shell's drawer transitions its
 * transform and its visibility separately. Reading the whole list is what keeps
 * one long duration from hiding behind a zero beside it.
 * @param value - the computed declaration.
 * @returns one entry per duration, in seconds.
 */
function durationsInSeconds(value: string): number[] {
  return value
    .split(',')
    .map((one) => {
      const text = one.trim()
      if (text.endsWith('ms')) return Number(text.slice(0, -2)) / 1000
      return text.endsWith('s') ? Number(text.slice(0, -1)) : Number.NaN
    })
    .filter((one) => Number.isFinite(one))
}

/**
 * A reader who asked for less motion gets less motion.
 *
 * `prefers-reduced-motion` is the one setting a stylesheet cannot honour by
 * itself: the sheet declares what motion costs, and every surface that moves
 * has to pay for it out of the same budget. A transition written with a literal
 * duration is a surface that never reads the budget, so it keeps moving at full
 * speed for exactly the readers the setting exists for, and nothing reports it:
 * the page is correct, accessible and still animating.
 *
 * The budget is the page's own `--ds-transition-duration`, read from the live
 * document rather than assumed, so the rule measures against whatever the sheet
 * declares for this reader: under `reduce` that token holds the near-zero value
 * the sheet substitutes, and a surface that reads it cannot exceed it. A page
 * that names no budget leaves this check nothing to measure against, and every
 * duration above zero is then over it — stated in the finding, because that is
 * the fact the reader is living with.
 * @param add - collects a finding.
 * @param limits - the product surfaces to read.
 */
function checkReducedMotion(add: Report, limits: { readonly scope: string }): void {
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const declared = getComputedStyle(document.documentElement).getPropertyValue('--ds-transition-duration').trim()
  const budget = durationsInSeconds(declared)[0] ?? 0
  const report = (node: Element, what: string, durations: readonly number[]): void => {
    for (const duration of durations) {
      if (duration <= budget) continue
      add(
        'motion-not-reduced',
        `${describe(node)} runs a ${what} of ${String(duration)}s while the reader asked for less motion, where the page's own budget is ${String(budget)}s`,
      )
    }
  }
  for (const root of document.querySelectorAll(limits.scope)) {
    for (const element of [root, ...root.querySelectorAll('*')]) {
      const style = getComputedStyle(element)
      report(element, 'transition', durationsInSeconds(style.transitionDuration))
      report(element, 'transition delay', durationsInSeconds(style.transitionDelay))
      if (style.animationName !== 'none') report(element, 'animation', durationsInSeconds(style.animationDuration))
    }
  }
}

export { checkClassVocabulary, checkReducedMotion, checkTypography, durationsInSeconds, familyListOf }
