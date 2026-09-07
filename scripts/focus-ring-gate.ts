/**
 * The rules the focus ring is read against.
 *
 * The ring was read only as a keyboard nicety, and it is an invariant: a
 * control that hides the user agent's ring and never restores it is
 * unreachable by keyboard in any meaningful sense. This module is the ring
 * half of the sheet gate, split from it the day the sheet gate outgrew the
 * size its own rules allow a file to reach.
 *
 * @module
 */

import { blocksOf, type Declaration } from './sheet-reader.ts'

/** The properties that can paint a focus ring. */
export const RING_PROPERTIES: ReadonlySet<string> = new Set(['outline', 'outline-width', 'outline-style', 'box-shadow'])

/** A value that paints nothing. */
export const BLANK_VALUES: ReadonlySet<string> = new Set(['none', '0', '0px'])

/** What a rule's body does to the focus ring. */
interface RingEffect {
  /** True when it switches the user agent's outline off. */
  readonly hides: boolean
  /** True when it paints a ring of its own. */
  readonly paints: boolean
}

/**
 * What one rule's declarations do to the focus ring.
 *
 * The declarations are read rather than matched with a lookahead: a pattern
 * that reads `outline:` and then asserts the value is not `none` can satisfy
 * the assertion by matching fewer spaces, and reads `outline: none` as a ring.
 * They come from the shared sheet reader rather than a second split of the
 * rule's text — this module had its own, which is one more notion of where a
 * declaration ends, and it read a semicolon inside a quoted value as the end
 * of one.
 * @param declarations - the rule's declarations, as the sheet reader read them.
 * @returns whether it hides a ring and whether it paints one.
 */
function ringEffect(declarations: readonly Declaration[]): RingEffect {
  let hides = false
  let paints = false
  for (const { property, value } of declarations) {
    // The reader refuses a declaration with no value, so a value that arrives
    // here has one; checking again would be a branch no test could reach.
    const painted = value.toLowerCase()
    if (!RING_PROPERTIES.has(property)) continue
    if (BLANK_VALUES.has(painted)) {
      if (property === 'outline' || property === 'outline-style') hides = true
      continue
    }
    paints = true
  }
  return { hides, paints }
}

/**
 * What every selector in a sheet does to the focus ring, across every rule it
 * appears in.
 *
 * Combined rather than read rule by rule: a selector whose outline one rule
 * switches off and another paints a shadow ring on has a ring, and reading the
 * two apart reported it as having none.
 * @param text - the sheet's contents.
 * @returns one entry per selector, with what its rules together do.
 */
function ringEffects(text: string): Map<string, RingEffect> {
  const effects = new Map<string, RingEffect>()
  for (const block of blocksOf(text)) {
    // An at-rule's block holds descriptors rather than a selector's
    // declarations, so it can neither hide a ring nor paint one.
    if (block.atRule) continue
    const effect = ringEffect(block.declarations)
    for (const one of block.prelude.split(',')) {
      const base = one.trim()
      if (base === '') continue
      const held = effects.get(base)
      effects.set(base, {
        hides: effect.hides || held?.hides === true,
        paints: effect.paints || held?.paints === true,
      })
    }
  }
  return effects
}

/**
 * Selectors that switch the focus ring off without writing one back.
 *
 * `select` and `textarea` shipped that way, hidden by a class rule while the
 * rule that gave the ring back named elements the class did not cover. The
 * restoration is required on the selector that did the hiding, so the two are
 * read together rather than one relying on a coincidence in the other.
 *
 * Every rule a selector appears in is combined before it is judged, because a
 * sheet is read that way: a selector whose outline one rule switches off and
 * another paints a shadow ring on has a ring, and reading the two rules apart
 * reported it as having none — as it did for the idiomatic custom ring, an
 * `outline: none` and a `box-shadow` written together on `:focus-visible`.
 * @param text - the sheet's contents.
 * @returns each selector that hides the ring and restores nothing.
 */
export function unringedSelectors(text: string): string[] {
  const effects = ringEffects(text)
  const hidden: string[] = []
  for (const [selector, effect] of effects) {
    if (!effect.hides || effect.paints) continue
    // The state that paints it back is the same selector focused from the
    // keyboard; a ring painted on any other state is one this selector does
    // not get when it is merely focused.
    if (effects.get(`${selector}:focus-visible`)?.paints !== true) hidden.push(selector)
  }
  return hidden
}
