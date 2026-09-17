/**
 * The tokens a sheet declares, read out of one stylesheet.
 *
 * Split from `sheet-scale.ts` along the seam the two halves already had: that
 * module declares the scale — the ladders, their rung names, and what a rung of
 * each may hold — and this one reads the sheet and answers what it finds. Every
 * rule about a declaration being repeated, being outside the scale, or being a
 * rung the ladder declares but the sheet leaves unwritten lives here.
 *
 * The reader is `sheet-reader.ts`, which parses the block structure; this
 * module is the layer that decides which of those declarations the scale owns.
 *
 * @module
 */

import type { Offence } from './offence.ts'
import { blocksOf } from './sheet-reader.ts'
import { LADDERS, type Ladder, OWNED, SINGLES } from './sheet-scale.ts'

/** A numbered rung name: a whole number, written without a leading nought. */
const DIGITS = /^(?:0|[1-9]\d*)$/u

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

/** One rung of a ladder, as the sheet writes it. */
export interface Rung {
  /** The whole custom-property name. */
  readonly property: string
  /** The rung's name within its family. */
  readonly name: string
  /** What the sheet sets it to. */
  readonly value: string
  /** The one-based line it is written on. */
  readonly line: number
}

/**
 * Every `--dsh-` custom property the sheet writes, by name.
 * @param text - the sheet's contents.
 * @returns one entry per property, with its declarations in source order.
 */
export function declaredTokens(text: string): Map<string, Held> {
  const written = new Map<string, Held>()
  for (const block of blocksOf(text)) {
    for (const { property, value, line } of block.declarations) {
      if (!property.startsWith(OWNED)) continue
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

/** What a ladder's rungs are called, for a report. */
export function rungNames(ladder: Ladder): string {
  return ladder.rungs.kind === 'named' ? ladder.rungs.names.join(', ') : 'numbered from 0, without a gap'
}

/** A property's rung name within the ladder that claims it, when its name is one of that ladder's rungs. */
export function rungNameOf(ladder: Ladder, property: string): string | undefined {
  const name = property.slice(ladder.stem.length)
  if (ladder.rungs.kind === 'named') return ladder.rungs.names.includes(name) ? name : undefined
  return DIGITS.test(name) ? name : undefined
}

/** The numbered rung names a sheet writes for a numbered ladder, in numeric order. */
function numberedNames(ladder: Ladder, written: ReadonlyMap<string, Held>): string[] {
  return [...written.keys()]
    .filter((property) => property.startsWith(ladder.stem) && DIGITS.test(property.slice(ladder.stem.length)))
    .map((property) => property.slice(ladder.stem.length))
    .toSorted((left, right) => Number(left) - Number(right))
}

/**
 * Every name the sheet writes under one selector twice.
 *
 * A value written twice under one selector is a decision the cascade hides: the
 * second wins, and the reader cannot tell which of the two was meant. The same
 * name under two selectors is the cascade working — a direction or a theme
 * rebinds a value — so only a repeat within one selector is refused.
 * @param label - the path to report offences under.
 * @param property - the custom property's whole name.
 * @param held - its declarations, in source order.
 * @returns one offence per repeat.
 */
export function repeatedUnder(label: string, property: string, held: Held): Offence[] {
  const seen = new Set<string>()
  const offences: Offence[] = []
  for (const one of held.all) {
    if (!seen.has(one.selector)) {
      seen.add(one.selector)
      continue
    }
    offences.push({
      label,
      line: one.line,
      why: `${property} is declared twice under ${one.selector}; the second replaces the first, so neither is the one decision`,
    })
  }
  return offences
}

/**
 * Every declaration the sheet writes outside the scale.
 *
 * Three questions read one name apiece: whether a ladder claims it, whether
 * that ladder's rungs include it, and — for a rung — whether it is written once.
 * @param label - the path to report offences under.
 * @param written - every `--dsh-` property the sheet writes, by name.
 * @returns one offence per rejected declaration.
 */
export function outsideScale(label: string, written: ReadonlyMap<string, Held>): Offence[] {
  const offences: Offence[] = []
  for (const [property, held] of written) {
    const ladder = LADDERS.find((one) => property.startsWith(one.stem))
    if (ladder === undefined) {
      offences.push(
        ...(SINGLES.includes(property)
          ? repeatedUnder(label, property, held)
          : [
              {
                label,
                line: held.first.line,
                why: `${property} is neither a rung of a ladder nor one of the scale's singles; declare it in scripts/sheet-scale-vocabulary.ts, or write it as a rung`,
              },
            ]),
      )
      continue
    }
    if (rungNameOf(ladder, property) === undefined) {
      offences.push({
        label,
        line: held.first.line,
        why: `${property} is not a rung of ${ladder.stem}; its rungs are ${rungNames(ladder)}`,
      })
      continue
    }
    if (held.all.length > 1) {
      offences.push({
        label,
        line: held.first.line,
        why: `${property} is declared ${String(held.all.length)} times; a rung of a ladder is written once`,
      })
    }
  }
  return offences
}

/** Every rung of one ladder, in ladder order, and the names it declares that the sheet leaves unwritten. */
export function ladderRungs(
  ladder: Ladder,
  written: ReadonlyMap<string, Held>,
): { readonly rungs: Rung[]; readonly absent: string[] } {
  const names = ladder.rungs.kind === 'named' ? [...ladder.rungs.names] : numberedNames(ladder, written)
  const rungs: Rung[] = []
  const absent: string[] = []
  for (const name of names) {
    const property = `${ladder.stem}${name}`
    const first = written.get(property)?.first
    if (first === undefined) {
      absent.push(name)
      continue
    }
    rungs.push({ property, name, value: first.value, line: first.line })
  }
  return { rungs, absent }
}

/** The rungs a named ladder declares and the sheet leaves unwritten. */
export function absentRungs(label: string, ladder: Ladder, absent: readonly string[]): Offence[] {
  return absent.map((name) => ({
    label,
    line: 1,
    why: `${ladder.stem}${name} is not declared; the ladder declares that rung`,
  }))
}
