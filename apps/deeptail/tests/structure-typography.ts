/**
 * The type the page renders, measured against the scale the token sheet
 * declares.
 *
 * The sheet gate reads what a *sheet* declares, so a value arriving from
 * anywhere else — a browser default on a control no rule styled, an injected
 * stylesheet, a `font` shorthand that resets what the ladder had set — is
 * invisible to it, and the rendered page is the only place the two spellings of
 * one decision meet. A page whose control renders at the engine's own 13.33px
 * default is a page that shipped two type scales, one of them by accident; a
 * page whose heading renders at the engine's own bold is one that shipped a
 * second weight set the same way.
 *
 * @module
 */

import { familyListOf, type TypographyRamp } from './structure-ramp.ts'
import { clippedAway, describe, pixelLength, type Report } from './structure-report.ts'

/** What the typography check reads, as the caller hands it to the page. */
interface TypographyLimits {
  /** The surfaces to read: the product's own, and every dialog frame it opens. */
  readonly scope: string
  /** The scale the page's type has to land on. */
  readonly typography: TypographyRamp
}

/**
 * A keyword the engine reports as the initial value, read as what it stands for.
 *
 * `normal` is the nought a face is drawn at and the absence of tracking, and
 * `bold` is 700. Those are the readings the CSS grammar gives them, not an
 * allowance — a page whose heading renders at the engine's own bold is
 * reported, because 700 is no rung this scale declares. A property the engine
 * reports as nothing at all is likewise read as its initial value, the same way
 * `pixelLength` reads a length it cannot measure as nought rather than
 * inventing a finding out of its own parser.
 * @param value - the computed value.
 * @param initial - what an absent declaration computes to.
 * @returns the value to compare against the scale.
 */
export function asReported(value: string, initial: string): string {
  return value.trim() === '' ? initial : value
}

/**
 * The type rung an element's text lands on, reported when it lands on none.
 * @param add - collects a finding.
 * @param element - the element carrying the text.
 * @param style - its computed style.
 * @param ramp - the scale to read against.
 * @returns the rung's index, or -1 when the size is off the ladder.
 */
export function reportSize(add: Report, element: Element, style: CSSStyleDeclaration, ramp: TypographyRamp): number {
  const size = pixelLength(style.fontSize)
  const rung = ramp.sizes.findIndex((one) => Math.abs(one - size) <= 0.01)
  if (rung === -1) {
    add(
      'off-scale-type',
      `${describe(element)} renders its text at ${style.fontSize}, which is no rung of the shipped type ladder`,
    )
  }
  return rung
}

/**
 * The line box an element's text is drawn in, against the leading rung that
 * pairs with its own size rung.
 * @param add - collects a finding.
 * @param element - the element carrying the text.
 * @param style - its computed style.
 * @param ramp - the scale to read against.
 * @param rung - the size rung the element landed on.
 */
export function reportLeading(
  add: Report,
  element: Element,
  style: CSSStyleDeclaration,
  ramp: TypographyRamp,
  rung: number,
): void {
  const box = ramp.leadings[rung]
  if (!style.lineHeight.endsWith('px')) {
    add(
      'off-scale-leading',
      `${describe(element)} renders with the engine's own ${style.lineHeight} line box rather than a rung of the ladder`,
    )
    return
  }
  if (box === undefined || Math.abs(box - pixelLength(style.lineHeight)) > 0.01) {
    add(
      'off-scale-leading',
      `${describe(element)} sets a ${style.lineHeight} line box, which is not the leading rung that pairs with its size`,
    )
  }
}

/**
 * The family an element's text renders in, against the lists the sheets declare.
 * @param add - collects a finding.
 * @param element - the element carrying the text.
 * @param style - its computed style.
 * @param ramp - the scale to read against.
 */
export function reportFamily(add: Report, element: Element, style: CSSStyleDeclaration, ramp: TypographyRamp): void {
  const family = familyListOf(style.fontFamily)
  if (!ramp.families.includes(family)) {
    add('off-scale-family', `${describe(element)} renders in ${family}, which no shipped sheet names`)
  }
}

/**
 * The weight an element's face is drawn at, against the weight ladder.
 * @param add - collects a finding.
 * @param element - the element carrying the text.
 * @param style - its computed style.
 * @param ramp - the scale to read against.
 */
export function reportWeight(add: Report, element: Element, style: CSSStyleDeclaration, ramp: TypographyRamp): void {
  const drawn = asReported(style.fontWeight, 'normal')
  const weight = drawn === 'normal' ? 400 : drawn === 'bold' ? 700 : Number(drawn)
  if (!ramp.weights.includes(weight)) {
    add(
      'off-scale-weight',
      `${describe(element)} renders at font-weight ${drawn}, which is no rung of the shipped weight ladder`,
    )
  }
}

/**
 * The tracking an element renders with, as a fraction of the type it sits beside.
 * @param add - collects a finding.
 * @param element - the element carrying the text.
 * @param style - its computed style.
 * @param ramp - the scale to read against.
 */
export function reportTracking(add: Report, element: Element, style: CSSStyleDeclaration, ramp: TypographyRamp): void {
  const spacing = asReported(style.letterSpacing, 'normal')
  const size = pixelLength(style.fontSize)
  const tracked =
    spacing === 'normal' || ramp.trackings.some((ratio) => Math.abs(ratio * size - pixelLength(spacing)) <= 0.01)
  if (!tracked) {
    add(
      'off-scale-tracking',
      `${describe(element)} renders with ${spacing} letter spacing at ${style.fontSize}, which is no rung of the shipped tracking ladder`,
    )
  }
}

/**
 * The letter case an element renders with, against the declared set.
 * @param add - collects a finding.
 * @param element - the element carrying the text.
 * @param style - its computed style.
 * @param ramp - the scale to read against.
 */
export function reportCasing(add: Report, element: Element, style: CSSStyleDeclaration, ramp: TypographyRamp): void {
  const casing = asReported(style.textTransform, 'none')
  if (!ramp.casings.includes(casing)) {
    add(
      'off-scale-casing',
      `${describe(element)} renders text-transform ${casing}, which is no case the product declares`,
    )
  }
}

/**
 * The widths of the lines an element renders, through a range over its own text
 * runs.
 *
 * A range reports one rectangle per line box: the answer is the line the reader
 * reads rather than the box the line sits in. Two shapes are left out, and both
 * are the box rather than the reading deciding — text truncated with an
 * ellipsis, where the reader is told the rest is there, and text whose own box
 * is already narrower than the maximum, where nothing can run past it.
 * @param element - the element carrying the text.
 * @param ramp - the scale whose measure is the maximum.
 * @returns one width per line box the element paints.
 */
export function lineWidths(element: Element, ramp: TypographyRamp): number[] {
  const style = getComputedStyle(element)
  if (element.getBoundingClientRect().width < ramp.measure) return []
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
 * The length of the lines an element renders, against the declared measure.
 * @param add - collects a finding.
 * @param element - the element carrying the text.
 * @param ramp - the scale to read against.
 */
export function reportMeasure(add: Report, element: Element, ramp: TypographyRamp): void {
  for (const width of lineWidths(element, ramp)) {
    if (width <= ramp.measure) continue
    add(
      'off-scale-measure',
      `${describe(element)} renders a line of ${String(Math.round(width))}px, past the ${String(ramp.measure)}px measure the sheets declare`,
    )
  }
}

/**
 * Every rendered text size, line box, family, weight, tracking, case and line
 * length lands on what the sheets declare.
 *
 * Only elements carrying their own text are read: an element that holds nothing
 * but another's text inherits whatever that text was given, so reporting it
 * too would name the tree rather than the decision. An element whose own clip
 * leaves it nothing to paint is skipped with them: the visually-hidden contract
 * keeps the text in the accessibility tree and off the canvas, so there is no
 * rendered type here for a rung to be missing from. Each element's leading is
 * read against the leading rung that pairs with its own size, and its tracking
 * against the type size it renders at, which is what makes the comparisons
 * meaningful at all — a page may use any rung, but the type and the leading on
 * one element have to be the same rung's, and a tracking is a fraction of the
 * type it sits beside.
 * @param add - collects a finding.
 * @param limits - the surfaces to read and the scale to read against.
 */
export function checkTypography(add: Report, limits: TypographyLimits): void {
  const ramp = limits.typography
  const roots = [...document.querySelectorAll(limits.scope), ...document.querySelectorAll('[data-deeptail-dialog]')]
  for (const root of roots) {
    for (const element of [root, ...root.querySelectorAll('*')]) {
      const carries = [...element.childNodes].some(
        (child) => child.nodeType === Node.TEXT_NODE && (child.textContent ?? '').trim() !== '',
      )
      if (!carries) continue
      const style = getComputedStyle(element)
      if (clippedAway(style)) continue
      const rung = reportSize(add, element, style, ramp)
      reportLeading(add, element, style, ramp, rung)
      reportFamily(add, element, style, ramp)
      reportWeight(add, element, style, ramp)
      reportTracking(add, element, style, ramp)
      reportCasing(add, element, style, ramp)
      reportMeasure(add, element, ramp)
    }
  }
}
