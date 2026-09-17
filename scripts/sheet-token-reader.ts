/**
 * The `--dsh-` custom properties one sheet writes, by name.
 *
 * The scale is declared in `sheet-scale.ts` and read by `check-scale.ts`; this
 * is the step between them, and the only one that touches the sheet's text. A
 * custom property may be declared more than once — a direction or a theme
 * rebinds a value, which is the cascade working — so every declaration is kept
 * in source order beside the one the rules read, and the rules that refuse a
 * repeat can see the difference between a rebinding and a duplicate.
 *
 * @module
 */

import { blocksOf } from './sheet-reader.ts'

/** Where one declaration of a custom property sits in the sheet. */
export interface Placement {
  /** What the declaration sets the property to. */
  readonly value: string
  /** The one-based line it is written on. */
  readonly line: number
  /** The selector of the block it sits in. */
  readonly selector: string
}

/** Every declaration of one custom property, and the one the cascade reads first. */
export interface Held {
  /** The declaration written first, which the rules read. */
  readonly first: Placement
  /** Every declaration of the property, in source order. */
  readonly all: readonly Placement[]
}

/**
 * Every `--dsh-` custom property the sheet writes, by name.
 * @param text - the sheet's contents.
 * @param owned - the custom-property namespace to read.
 * @returns one entry per property, with its declarations in source order.
 */
export function declaredTokens(text: string, owned: string): Map<string, Held> {
  const written = new Map<string, Held>()
  for (const block of blocksOf(text)) {
    for (const { property, value, line } of block.declarations) {
      if (!property.startsWith(owned)) continue
      const placement: Placement = { value, line, selector: block.prelude }
      const seen = written.get(property)
      written.set(
        property,
        seen === undefined
          ? { first: placement, all: [placement] }
          : { first: seen.first, all: [...seen.all, placement] },
      )
    }
  }
  return written
}
