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

import { type Block, blocksOf, type Declaration } from './sheet-reader.ts'

/** The properties that can paint a focus ring. */
const RING_PROPERTIES = new Set(['outline', 'outline-width', 'outline-style', 'box-shadow'])

/** A value that paints nothing. */
const BLANK_VALUES = new Set(['none', '0', '0px'])

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
    const painted = value.toLowerCase()
    if (!RING_PROPERTIES.has(property) || painted === '') continue
    if (BLANK_VALUES.has(painted)) {
      if (property === 'outline' || property === 'outline-style') hides = true
      continue
    }
    paints = true
  }
  return { hides, paints }
}

/**
 * Selectors that switch the focus ring off without writing one back.
 *
 * `select` and `textarea` shipped that way, hidden by a class rule while the
 * rule that gave the ring back named elements the class did not cover. The
 * restoration is required on the selector that did the hiding, so the two are
 * read together rather than one relying on a coincidence in the other.
 * @param text - the sheet's contents.
 * @returns each selector that hides the ring and restores nothing.
 */
export function unringedSelectors(text: string): string[] {
  const rules: readonly Block[] = blocksOf(text).filter((block) => !block.atRule && block.prelude !== '')
  const restored = new Set<string>()
  for (const rule of rules) {
    if (!ringEffect(rule.declarations).paints) continue
    for (const one of rule.prelude.split(',')) {
      const base = one.trim()
      if (base.endsWith(':focus-visible')) restored.add(base.slice(0, -':focus-visible'.length))
    }
  }
  const hidden: string[] = []
  for (const rule of rules) {
    if (!ringEffect(rule.declarations).hides) continue
    for (const one of rule.prelude.split(',')) {
      const base = one.trim()
      if (base !== '' && !restored.has(base)) hidden.push(base)
    }
  }
  return hidden
}
