/**
 * The scale the token sheet declares: its ladders, their rungs, and the names
 * the sheet may write.
 *
 * A bare length is refused outside `tokens.css`, so a new one has to be named
 * there first — but nothing read the file it had to be named in. A family could
 * carry a second ladder beside its own, which is how six odd spacing rungs and
 * three named radii off the four-pixel one stood in that sheet: legal by virtue
 * of being written in the one file no rule read. A reason given in place of a
 * value is the shape this module exists to refuse.
 *
 * Each ladder is declared here once, as data: the rung names it has, in order,
 * and what a rung of it holds. The values stay in the sheet, one place apiece.
 * What this half reads is the names; the values those rungs hold are read in
 * `check-scale.ts`, and the values that are decisions rather than rungs are
 * declared in `sheet-scale-vocabulary.ts` and read through here.
 *
 * @module
 */

import type { Offence } from './offence.ts'
import { blocksOf } from './sheet-reader.ts'
import { CASINGS, MEASURE_MAX, SINGLES } from './sheet-scale-vocabulary.ts'

export { CASINGS, MEASURE_MAX, SINGLES }

/** The custom-property namespace this scale owns, and the palette's is not. */
export const OWNED = '--dsh-'

/** The spacing family. Numbered: rung names run from nought without a gap. */
export const SPACING = '--dsh-space-'

/** The radius family. */
export const RADIUS = '--dsh-radius-'

/** The type family, which the leading family mirrors rung for rung. */
export const TYPE = '--dsh-text-'

/** The leading family, holding a ratio against its type rung rather than a length. */
export const LEADING = '--dsh-leading-'

/** The tracking family. */
export const TRACKING = '--dsh-tracking-'

/** The font-weight family, whose rungs hold the number a face is drawn at. */
export const WEIGHT = '--dsh-weight-'

/** The control-height family: the heights the shell's controls stand at. */
export const CONTROL = '--dsh-control-'

/** The drawn-width family: the line widths a border, a rule or a focus ring is painted at. */
export const BORDER = '--dsh-border-'

/** A numbered rung name: a whole number, written without a leading nought. */
const DIGITS = /^(?:0|[1-9]\d*)$/u

/** How a ladder names its rungs. */
type RungNames = { readonly kind: 'numbered' } | { readonly kind: 'named'; readonly names: readonly string[] }

/**
 * One ladder of the scale: a family of names and what each rung of it holds.
 *
 * Three kinds of rung are read. A `px` rung holds a whole number of pixels and
 * the ladder is read as a rising staircase. A `ratio` rung holds a fraction of
 * the rung it pairs with, resolved against it. A `set` rung holds one of the
 * family's own decisions — the number a face is drawn at, the tracking a
 * display name carries — where the family is a set rather than a staircase, so
 * there is no order to read and membership is what is asked.
 */
export type Ladder =
  | { readonly stem: string; readonly rungs: RungNames; readonly unit: 'px' }
  | {
      readonly stem: string
      readonly rungs: RungNames
      readonly unit: 'ratio'
      /** The stem of the ladder each rung resolves against, rung for rung. */
      readonly resolves: string
    }
  | {
      readonly stem: string
      readonly rungs: RungNames
      readonly unit: 'set'
      /**
       * Every value a rung of this family may hold.
       *
       * A set is a closed vocabulary, so the membership is declared rather than
       * the shape: `/^\d{3}$/` admits 700 as readily as 400, and a weight no
       * face in this product is drawn at would then read as a rung of the
       * weight ladder. The values are written here and the declarations stay in
       * the sheet, which is what keeps one decision in one place.
       */
      readonly vocabulary: readonly string[]
    }

/** A ladder whose rungs hold a length, and so land on a pixel the reader can compare. */
export type MeasuredLadder = Extract<Ladder, { readonly unit: 'px' | 'ratio' }>

/** The type rungs, which the leading ladder pairs with one for one. */
export const TYPE_RUNGS: readonly string[] = ['sm', 'md', 'lg', 'body', 'title']

/** The weights the product draws a face at, rung for rung. */
export const WEIGHT_VALUES: readonly string[] = ['400', '500', '600']

/** The tracking a display name carries, rung for rung. */
export const TRACKING_VALUES: readonly string[] = ['0.04em', '0.08em']

/**
 * The ladders the token sheet declares.
 *
 * A rung name is written here and its value is written in the sheet, so a value
 * has one home and the membership of a ladder has one home. A family that
 * states its rungs as numbers takes whatever the sheet writes, in numeric
 * order; a family that names them declares the whole set, and a name the sheet
 * leaves unwritten is refused. A set family declares its vocabulary as well,
 * which is the whole of what a rung of it may hold.
 *
 * The leading ladder is written above the type ladder it resolves against, so a
 * reader that read each ladder as it met it would resolve against a type ladder
 * it had not read yet. The gate reads them in two passes for that reason.
 */
export const LADDERS: readonly Ladder[] = [
  { stem: LEADING, rungs: { kind: 'named', names: TYPE_RUNGS }, unit: 'ratio', resolves: TYPE },
  { stem: SPACING, rungs: { kind: 'numbered' }, unit: 'px' },
  { stem: RADIUS, rungs: { kind: 'named', names: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] }, unit: 'px' },
  { stem: TYPE, rungs: { kind: 'named', names: TYPE_RUNGS }, unit: 'px' },
  { stem: CONTROL, rungs: { kind: 'named', names: ['xs', 'sm', 'md', 'lg', 'xl'] }, unit: 'px' },
  { stem: BORDER, rungs: { kind: 'named', names: ['hairline', 'ring', 'accent'] }, unit: 'px' },
  // A weight is a numbered face, and a tracking is a fraction of the type it
  // sits beside: both are sets of decisions rather than staircases, so each is
  // read as one of the family's own values and not as a rise.
  {
    stem: WEIGHT,
    rungs: { kind: 'named', names: ['regular', 'medium', 'semibold'] },
    unit: 'set',
    vocabulary: WEIGHT_VALUES,
  },
  {
    stem: TRACKING,
    rungs: { kind: 'named', names: ['brand', 'wordmark'] },
    unit: 'set',
    vocabulary: TRACKING_VALUES,
  },
]

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
function rungNames(ladder: Ladder): string {
  return ladder.rungs.kind === 'named' ? ladder.rungs.names.join(', ') : 'numbered from 0, without a gap'
}

/** A property's rung name within the ladder that claims it, when its name is one of that ladder's rungs. */
function rungNameOf(ladder: Ladder, property: string): string | undefined {
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
function repeatedUnder(label: string, property: string, held: Held): Offence[] {
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
