/**
 * The fixtures the scale-gate suites drive: the tables of refused sheets, each
 * with the exact reasons it must produce.
 *
 * Held beside the specs rather than inside them so the specs stay under the
 * file-size limit and the tables stay readable as tables; the reasons here are
 * the contract — a case names every reason it produces, not merely one of
 * them, so a rule that reported a sheet for something else as well fails.
 *
 * The ladder these sheets are written against, and the builders that write one,
 * are in `scale-ladders.ts`: a suite that needs only a rung reads that module,
 * and a suite that needs a refusal reads this one.
 *
 * @module
 */

import type { Offence } from '../scripts/offence.ts'
import { NAMED, WHOLE, withValue } from './scale-ladders.ts'

/** A label for a sheet that reads the scale rather than declaring it. */
export const SHEET = 'apps/deeptail/src/styles/shell.css'

/** Every reason one case produces, sorted so two lists compare as the same set. */
export type Reasons = readonly string[]

/** One token sheet a case drives the scale rules with, and the reasons it names. */
export interface ScaleCase {
  /** The declarations the sheet writes inside `:root`. */
  readonly writes: readonly string[]
  /** Every reason the gate gives, which the case asserts whole. */
  readonly why: Reasons
}

/** What a leading rung that is not a ratio is refused for, at whatever it holds. */
const NOT_A_RATIO = (property: string, value: string): Reasons => [
  `${property} is ${value}; a rung of --dsh-leading- is a ratio written calc(<whole> / <whole>)`,
]

/**
 * Every sheet the token-sheet rules must refuse, each with the exact reasons.
 *
 * The first three are the shapes the sheet itself carried: a second set of
 * spacing rungs named by words, a named radius off the four-pixel ladder, and a
 * name nothing in the scale claimed.
 *
 * Where a case restates a rung of the spacing ladder it restates the last one,
 * so the rise below it still steps as the ladder does and the only reason the
 * sheet produces is the one the case is about.
 */
export const REFUSED_SCALE: readonly ScaleCase[] = [
  {
    writes: [...WHOLE, ...NAMED, '--dsh-space-inset-sm: 7px'],
    why: ['--dsh-space-inset-sm is not a rung of --dsh-space-; its rungs are numbered from 0, without a gap'],
  },
  {
    writes: [...WHOLE, ...NAMED, '--dsh-radius-control: 10px'],
    why: ['--dsh-radius-control is not a rung of --dsh-radius-; its rungs are xs, sm, md, lg, xl, 2xl'],
  },
  {
    writes: [...WHOLE, ...NAMED, '--dsh-gutter-1: 4px'],
    why: [
      "--dsh-gutter-1 is neither a rung of a ladder nor one of the scale's singles; declare it in scripts/sheet-scale-vocabulary.ts, or write it as a rung",
    ],
  },
  {
    // A rung number with anything trailing it, and one with anything leading:
    // neither is a number the ladder runs on.
    writes: [...WHOLE, ...NAMED, '--dsh-space-1x: 4px', '--dsh-space-x1: 4px'],
    why: [
      '--dsh-space-1x is not a rung of --dsh-space-; its rungs are numbered from 0, without a gap',
      '--dsh-space-x1 is not a rung of --dsh-space-; its rungs are numbered from 0, without a gap',
    ],
  },
  {
    writes: [...WHOLE, ...NAMED, '--dsh-space-3: 10px'],
    why: ['--dsh-space-3 is declared 2 times; a rung of a ladder is written once'],
  },
  {
    // A named rung written twice: the same refusal the numbered ladder gives,
    // read from a family that names its rungs rather than numbers them.
    writes: [...WHOLE, ...NAMED, '--dsh-tracking-brand: 0.08em'],
    why: ['--dsh-tracking-brand is declared 2 times; a rung of a ladder is written once'],
  },
  {
    writes: [...WHOLE, ...NAMED.filter((one) => !one.startsWith('--dsh-radius-2xl'))],
    why: ['--dsh-radius-2xl is not declared; the ladder declares that rung'],
  },
  {
    writes: [...withValue(WHOLE, ['--dsh-space-9', '8.5px']), ...NAMED],
    why: ['--dsh-space-9 is 8.5px; every rung of --dsh-space- is a whole pixel'],
  },
  {
    writes: [...withValue(WHOLE, ['--dsh-space-9', '8px 4px']), ...NAMED],
    why: ['--dsh-space-9 is 8px 4px; every rung of --dsh-space- is a whole pixel'],
  },
  {
    // A ladder whose step narrows: 34px is above the 32px below it, and by less
    // than the 8px the ladder stepped before that — space-8 is 32px and space-7
    // is 24px, as the shipped sheet declares them.
    writes: [...withValue(WHOLE, ['--dsh-space-9', '34px']), ...NAMED],
    why: ['--dsh-space-9 rises 2px above --dsh-space-8, narrower than the 8px before it'],
  },
  {
    writes: [...withValue(WHOLE, ['--dsh-space-9', '32px']), ...NAMED],
    why: ['--dsh-space-9 is 32px, not above --dsh-space-8 at 32px; a ladder rises from rung to rung'],
  },
  {
    writes: ['--dsh-space-0: 2px', '--dsh-space-2: 6px', ...NAMED],
    why: ['--dsh-space-2 is numbered 2 where the ladder runs from 0 without a gap; rung 1 is not written'],
  },
  {
    writes: ['--dsh-space-0: 2px', ...NAMED],
    why: ['--dsh-space- declares one rung (--dsh-space-0); a ladder is read from two rungs up'],
  },
  {
    // Three ways a ratio is not written whole: the value is read as one value,
    // so none of these is read up to its first match.
    writes: [
      ...WHOLE,
      ...withValue(
        NAMED,
        ['--dsh-leading-sm', '18px'],
        ['--dsh-leading-md', 'calc(20 / 13) 1px'],
        ['--dsh-leading-lg', 'calc(11 / 7x)'],
      ),
    ],
    why: [
      ...NOT_A_RATIO('--dsh-leading-sm', '18px'),
      ...NOT_A_RATIO('--dsh-leading-md', 'calc(20 / 13) 1px'),
      ...NOT_A_RATIO('--dsh-leading-lg', 'calc(11 / 7x)'),
    ],
  },
  {
    // The type rung is gone, so the leading rung paired with it has nothing to
    // resolve against. The type rung the smallest leading rung pairs with is the
    // one taken, so what is left still steps evenly and no second rule fires.
    writes: [...WHOLE, ...NAMED.filter((one) => !one.startsWith('--dsh-text-sm'))],
    why: [
      '--dsh-text-sm is not declared; the ladder declares that rung',
      '--dsh-leading-sm has no --dsh-text-sm to resolve against; the two ladders pair rung for rung',
    ],
  },
  {
    writes: [...WHOLE, ...withValue(NAMED, ['--dsh-leading-sm', 'calc(3 / 5)'])],
    why: ['--dsh-leading-sm resolves to 7.20px against --dsh-text-sm at 12px; a rung lands on a whole pixel'],
  },
  {
    // A set ladder declares its vocabulary, and 700 is a weight no face in this
    // product is drawn at: membership is what is asked, not the shape of the
    // number, because a pattern admitting any three digits admits this too.
    writes: [...WHOLE, ...withValue(NAMED, ['--dsh-weight-semibold', '700'])],
    why: ['--dsh-weight-semibold is 700, which is no value of --dsh-weight-; the family declares 400, 500, 600'],
  },
  {
    // The last drawn rung restated off the ladder, so the rise below it still
    // steps and the only reason this sheet produces is the width itself.
    writes: [...WHOLE, ...withValue(NAMED, ['--dsh-border-accent', '8px'])],
    why: [
      '--dsh-border-accent is 8px, which is no drawn length; a border, a rule and a ring are drawn at 0px, 1px, 2px, 3px',
    ],
  },
]

/** One declaration a shipped sheet writes, and the reasons the reader rules refuse it. */
export interface ReaderCase {
  /** What the sheet writes. */
  readonly writes: string
  /** Every reason the gate gives, which the case asserts whole. */
  readonly why: Reasons
}

/** What a value that is no rung of the type ladder is refused for. */
const NOT_A_TYPE_RUNG = (value: string): Reasons => [
  `${value} is not a rung of the type ladder in tokens.css; read one of --dsh-text-<rung>`,
]

/** Every decision a shipped sheet must read from the scale, each with its exact reasons. */
export const REFUSED_READER: readonly ReaderCase[] = [
  { writes: '.a { font-size: 1rem; }', why: NOT_A_TYPE_RUNG('font-size: 1rem') },
  {
    writes: '.a { line-height: 1.5; }',
    why: ['line-height: 1.5 is not a rung of the leading ladder in tokens.css; read one of --dsh-leading-<rung>'],
  },
  {
    writes: '.a { letter-spacing: 0.1em; }',
    why: [
      'letter-spacing: 0.1em is not a rung of the tracking ladder in tokens.css; read one of --dsh-tracking-<rung>',
    ],
  },
  {
    writes: '.a { font-size: var(--dsh-leading-sm); }',
    why: NOT_A_TYPE_RUNG('font-size: var(--dsh-leading-sm)'),
  },
  {
    // A read with anything before the rung, and one with anything after it.
    writes: '.a { font-size: var(x--dsh-text-sm); }',
    why: NOT_A_TYPE_RUNG('font-size: var(x--dsh-text-sm)'),
  },
  {
    writes: '.a { font-size: var(--dsh-text-sm)x; }',
    why: NOT_A_TYPE_RUNG('font-size: var(--dsh-text-sm)x'),
  },
  {
    writes: '.a {\n  font-size: var(--dsh-text-sm);\n  line-height: var(--dsh-leading-lg);\n}\n',
    why: [
      '--dsh-leading-lg is not the rung that pairs with --dsh-text-sm; a type rung pairs with the leading rung of the same name',
    ],
  },
]

/** The reason one offence gives. */
export const reason = (offence: Offence): string => offence.why

/**
 * Every case in a table the reader answered with something other than the
 * reasons it names.
 * @param cases - the cases, each naming every reason it must produce.
 * @param read - how one case's text is read for reasons.
 * @returns one line per case that was misreported, empty when every one held.
 */
export function misreported<Case extends { readonly why: Reasons }>(
  cases: readonly Case[],
  read: (one: Case) => Reasons,
): readonly string[] {
  return cases.flatMap((one) => {
    const wanted = [...one.why].toSorted().join(' | ')
    const found = [...read(one)].toSorted().join(' | ') || 'nothing'
    return wanted === found ? [] : [`${wanted}: reported ${found}`]
  })
}
