/**
 * What the page shows has to be something the shipped sheets named: the classes
 * it carries, the type every piece of its text lands on, and the motion it
 * spends.
 *
 * A class outside the vocabulary is a styling or hooking decision made outside
 * the design system: a one-off per-page name no gate reads and no sheet styles,
 * which is exactly how a utility framework's vocabulary (`btn`, `p-4`) drifts
 * in. The page is the ground truth — a class composed at runtime shows up here
 * in its final spelling.
 *
 * Type and motion are the same question asked of values rather than names. The
 * scale in `tokens.css` is one ladder of sizes, one of leading ratios that
 * pairs with it rung for rung, the families the product ships, and the budget
 * every surface that moves pays for its motion out of; a size, a line box, a
 * family or a duration outside those is a decision taken outside the sheet, and
 * the page renders it whether or not a sheet declares it — from an injected
 * stylesheet, a browser default, or a rule that never named a rung.
 *
 * @module
 */

import { declarationsOf } from '../../../scripts/sheet-reader.ts'
import { declaredTokens, LADDERS, ladderRungs } from '../../../scripts/sheet-scale.ts'
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
}

/** The declarations the shipped family lists are read out of. */
const FAMILY_TOKENS: ReadonlySet<string> = new Set(['--dsw-font-family', '--ds-font-family-code'])

/** A leading rung, holding a ratio between two whole numbers. */
const RATIO = /^calc\(\s*(\d+)\s*\/\s*(\d+)\s*\)$/u

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
 * Resolve the typography ladder out of the token sheet.
 *
 * The sheet is read rather than restated: a ramp copied into the test tree is a
 * second ladder that agrees with the shipped one until the day it does not, and
 * the check would then measure the product against a scale nobody ships. The
 * rungs come back in ladder order from the one module that declares the
 * ladders, so the leading rung at an index pairs with the type rung at the same
 * index by construction rather than by a second list of names.
 * @param text - the token sheet's contents.
 * @returns the sizes, their line boxes, and the shipped family lists.
 */
export function typographyRampFrom(text: string): TypographyRamp {
  const written = declaredTokens(text)
  const type = LADDERS.find((one) => one.stem === '--dsh-text-')
  const leading = LADDERS.find((one) => one.stem === '--dsh-leading-')
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
  return {
    sizes,
    leadings: sizes.map((size, index) => leadingPixels(ratios[index]?.value ?? '', size)),
    families,
  }
}

/** What the typography check reads, as the caller hands it to the page. */
interface TypographyLimits {
  /** The surfaces to read: the product's own, and every dialog frame it opens. */
  readonly scope: string
  /** The ladder the page's type has to land on. */
  readonly typography: TypographyRamp
}

/**
 * Every rendered text size, line box and family lands on a rung of the scale.
 *
 * Nothing else asks this. The sheet gate reads what a *sheet* declares, so a
 * value arriving from anywhere else — a browser default on a control no rule
 * styled, an injected stylesheet, a `font` shorthand that resets what the
 * ladder had set — is invisible to it, and the rendered page is the only place
 * the two spellings of one decision meet. A page whose control renders at the
 * engine's own 13.33px default is a page that shipped two type scales, one of
 * them by accident.
 *
 * Only elements carrying their own text are read: an element that holds nothing
 * but another's text inherits whatever that text was given, so reporting it
 * too would name the tree rather than the decision. Each element's leading is
 * read against the leading rung that pairs with its own size, which is what
 * makes the comparison meaningful at all — a page may use any rung, but the
 * type and the leading on one element have to be the same rung's.
 *
 * Sizes are compared to within a hundredth of a pixel, the rounding a relative
 * size leaves behind; a line box the engine chose for itself (`normal`) is
 * reported, because that is a leading no rung of the ladder reaches.
 * @param add - collects a finding.
 * @param limits - the surfaces to read and the ladder to read against.
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
