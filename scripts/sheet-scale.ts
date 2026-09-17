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
 * Reading the sheet against those declarations is `sheet-tokens.ts`, which
 * answers what a sheet writes; the values a rung holds are then read in
 * `check-scale.ts`, and the values that are decisions rather than rungs are
 * declared in `sheet-scale-vocabulary.ts` and read through here.
 *
 * @module
 */

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

export {
  absentRungs,
  declaredTokens,
  type Held,
  ladderRungs,
  outsideScale,
  type Placement,
  type Rung,
  repeatedUnder,
  rungNameOf,
  rungNames,
} from './sheet-tokens.ts'
