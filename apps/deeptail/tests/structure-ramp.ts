/**
 * The type scale the token sheet declares, resolved for the page to measure
 * against.
 *
 * The sheet is read rather than restated: a ladder copied into the test tree is
 * a second ladder that agrees with the shipped one until the day it does not,
 * and the check would then measure the product against a scale nobody ships.
 * The rungs come back in ladder order from the one module that declares the
 * ladders, so the leading rung at an index pairs with the type rung at the same
 * index by construction rather than by a second list of names.
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
import { pixelLength } from './structure-report.ts'

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
 *
 * One name is also the engine's to rename: `BlinkMacSystemFont` is the alias
 * this product's stack opens with, and the engine reports the family it stands
 * for as `system-ui`. Both sides of the comparison read the alias as that
 * family, so a stack the sheet declared whole is not reported as a family no
 * sheet named.
 * @param value - the declaration, or the computed value.
 * @returns one comparable string.
 */
export function familyListOf(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/\s+/gu, ' ')
    .replaceAll(/["']/gu, '')
    .replaceAll(/\bblinkmacsystemfont\b/gu, 'system-ui')
    .trim()
}

/**
 * Resolve the typography scale out of the token sheet.
 *
 * This reader runs beside the page rather than inside it, so a helper it needs
 * is declared here; what the page receives is the resolved ramp.
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
  const rungValues = (stem: string): string[] => {
    const ladder = LADDERS.find((one) => one.stem === stem)
    if (ladder === undefined) throw new Error(`deeptail: the scale declares no ${stem} family to read`)
    return ladderRungs(ladder, written).rungs.map((rung) => rung.value)
  }
  const sizes = ladderRungs(type, written).rungs.map((rung) => pixelLength(rung.value))
  const ratios = ladderRungs(leading, written).rungs
  if (sizes.length !== ratios.length) {
    throw new Error('deeptail: the leading ladder does not pair with the type ladder rung for rung')
  }
  const families = declarationsOf(text)
    .filter((declaration) => FAMILY_TOKENS.has(declaration.property))
    .map((declaration) => familyListOf(declaration.value))
  const trackings = rungValues(TRACKING).map((value) => {
    const em = TRACKING_EM.exec(value)?.[1]
    if (em === undefined) throw new Error(`deeptail: ${value} is not a tracking written as a fraction of em`)
    return Number(em)
  })
  return {
    sizes,
    leadings: sizes.map((size, index) => leadingPixels(ratios[index]?.value ?? '', size)),
    families,
    weights: rungValues(WEIGHT).map(Number),
    trackings,
    casings: [...CASINGS],
    measure: MEASURE_MAX,
  }
}
