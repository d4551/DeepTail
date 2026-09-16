/**
 * How far a selector may reach through the DOM.
 *
 * Split from `sheet-gate.ts` when it outgrew the size the linter allows one
 * file. Depth is its own decision: everything else that gate states is about a
 * declaration, and this is the one rule about the selector.
 *
 * @module
 */

import { rulesetsOf } from './sheet-reader.ts'

/** How a selector may reach from one compound to the next. */
const COMBINATORS = /\s*[>+~]\s*|\s+/gu

/**
 * The most compounds a selector may chain.
 *
 * Every chain past three is layout reaching through the DOM rather than
 * through a class: it couples a rule to a structure the markup can change
 * without the sheet ever being told, and it is how a sheet grows a branch per
 * page instead of a class per role.
 */
export const MAX_COMPOUNDS = 3

/**
 * How many compounds one comma-separated selector chains.
 * @param one - a single selector, no commas.
 * @returns the count of compounds the selector reaches through.
 */
function compoundsOf(one: string): number {
  return one.split(COMBINATORS).filter((compound) => compound !== '').length
}

/**
 * Every selector that chains more compounds than the design allows.
 *
 * @param text - the sheet's contents.
 * @returns one entry per over-deep selector, with the line its rule opens on.
 */
export function deepSelectors(text: string): { readonly selector: string; readonly line: number }[] {
  return rulesetsOf(text)
    .flatMap((rule) => rule.selector.split(',').map((one) => ({ selector: one.trim(), line: rule.line }) as const))
    .filter((one) => compoundsOf(one.selector) > MAX_COMPOUNDS)
    .map((one) => ({ selector: one.selector, line: one.line }))
}
