/**
 * The fixtures the scale-gate suites drive: the ladders a case declares, and
 * the tables of refused sheets with the exact reasons each must produce.
 *
 * Held beside the specs rather than inside them so the specs stay under the
 * file-size limit and the tables stay readable as tables; the reasons here are
 * the contract — a case names every reason it produces, not merely one of
 * them, so a rule that reported a sheet for something else as well fails.
 *
 * @module
 */

import type { Offence } from '../scripts/offence.ts'

/** A label for a sheet that reads the scale rather than declaring it. */
export const SHEET = 'apps/deeptail/src/styles/shell.css'

/** The rungs of one ladder, each written as a name and the value it holds. */
function rungs(stem: string, pairs: readonly (readonly [name: string, value: string])[]): string[] {
  return pairs.map(([name, value]) => `--${stem}-${name}: ${value}`)
}

/** A ladder whose rungs are numbered, holding the values a case declares. */
function numbered(values: readonly number[]): string[] {
  return values.map((px, index) => `--dsh-space-${String(index)}: ${String(px)}px`)
}

/** Every rung of the ladders that name their rungs, and two of the sheet's singles. */
export const NAMED: readonly string[] = [
  ...rungs('dsh-radius', [
    ['xs', '4px'],
    ['sm', '8px'],
    ['md', '12px'],
    ['lg', '16px'],
    ['xl', '20px'],
    ['2xl', '24px'],
  ]),
  ...rungs('dsh-text', [
    ['sm', '12px'],
    ['md', '13px'],
    ['lg', '14px'],
    ['body', '16px'],
    ['title', '18px'],
  ]),
  ...rungs('dsh-leading', [
    ['sm', 'calc(3 / 2)'],
    ['md', 'calc(20 / 13)'],
    ['lg', 'calc(11 / 7)'],
    ['body', 'calc(3 / 2)'],
    ['title', 'calc(13 / 9)'],
  ]),
  ...rungs('dsh-tracking', [
    ['brand', '0.04em'],
    ['wordmark', '0.08em'],
  ]),
  ...rungs('dsh-weight', [
    ['regular', '400'],
    ['medium', '500'],
    ['semibold', '600'],
  ]),
  ...rungs('dsh-border', [
    ['hairline', '1px'],
    ['ring', '2px'],
    ['accent', '3px'],
  ]),
  ...rungs('dsh-control', [
    ['xs', '34px'],
    ['sm', '36px'],
    ['md', '38px'],
    ['lg', '40px'],
    ['xl', '60px'],
  ]),
  '--dsh-dot-size: 12px',
]

/** The whole spacing ladder, as the product ships it. */
export const WHOLE = numbered([2, 4, 6, 8, 12, 16, 20, 24, 32, 48])

/** A token sheet holding the declarations a case writes, one per line. */
export function tokens(...declarations: readonly string[]): string {
  return `:root {\n${declarations.map((one) => `  ${one};`).join('\n')}\n}\n`
}

/** The rungs a case declares, with one of them holding another value. */
export function withValue(declarations: readonly string[], property: string, value: string): string[] {
  return declarations.map((one) => (one.startsWith(property) ? `${property}: ${value}` : one))
}

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
const NOT_A_RATIO = (value: string): Reasons => [
  `--dsh-leading-sm is ${value}; a rung of --dsh-leading- is a ratio written calc(<whole> / <whole>)`,
]

/**
 * Every sheet the token-sheet rules must refuse, each with the exact reasons.
 *
 * The first three are the shapes the sheet itself carried: a second set of
 * spacing rungs named by words, a named radius off the four-pixel ladder, and a
 * name nothing in the scale claimed.
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
      "--dsh-gutter-1 is neither a rung of a ladder nor one of the scale's singles; declare it in scripts/sheet-scale.ts, or write it as a rung",
    ],
  },
  {
    // A rung number with anything trailing it, and one with anything leading.
    writes: [...WHOLE, ...NAMED, '--dsh-space-1x: 4px'],
    why: ['--dsh-space-1x is not a rung of --dsh-space-; its rungs are numbered from 0, without a gap'],
  },
  {
    writes: [...WHOLE, ...NAMED, '--dsh-space-x1: 4px'],
    why: ['--dsh-space-x1 is not a rung of --dsh-space-; its rungs are numbered from 0, without a gap'],
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
    writes: [...numbered([2, 4, 6, 8, 12, 16, 20, 24, 32, 8.5]), ...NAMED],
    why: ['--dsh-space-9 is 8.5px; every rung of --dsh-space- is a whole pixel'],
  },
  {
    // Two lengths on one declaration is not the one length a rung holds. The
    // last rung, so what is left above it still steps as the ladder does.
    writes: [...withValue(WHOLE, '--dsh-space-9', '8px 4px'), ...NAMED],
    why: ['--dsh-space-9 is 8px 4px; every rung of --dsh-space- is a whole pixel'],
  },
  {
    writes: [...numbered([2, 4, 6, 8, 7, 12]), ...NAMED],
    why: ['--dsh-space-4 is 7px, not above --dsh-space-3 at 8px; a ladder rises from rung to rung'],
  },
  {
    // Two rungs the same height: the step is nought, which is not a rise.
    writes: [...numbered([2, 4, 6, 8, 8, 12]), ...NAMED],
    why: ['--dsh-space-4 is 8px, not above --dsh-space-3 at 8px; a ladder rises from rung to rung'],
  },
  {
    writes: [...numbered([2, 4, 6, 12, 14]), ...NAMED],
    why: ['--dsh-space-4 rises 2px above --dsh-space-3, narrower than the 6px before it'],
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
    writes: [...WHOLE, ...withValue(NAMED, '--dsh-leading-sm', '18px')],
    why: NOT_A_RATIO('18px'),
  },
  {
    // A ratio with anything after it, anything before it, and anything that is
    // not a whole number where the denominator belongs.
    writes: [...WHOLE, ...withValue(NAMED, '--dsh-leading-sm', 'calc(3 / 2) 1px')],
    why: NOT_A_RATIO('calc(3 / 2) 1px'),
  },
  {
    writes: [...WHOLE, ...withValue(NAMED, '--dsh-leading-sm', '0 calc(3 / 2)')],
    why: NOT_A_RATIO('0 calc(3 / 2)'),
  },
  {
    writes: [...WHOLE, ...withValue(NAMED, '--dsh-leading-sm', 'calc(3 / 2x)')],
    why: NOT_A_RATIO('calc(3 / 2x)'),
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
    writes: [...WHOLE, ...withValue(NAMED, '--dsh-leading-sm', 'calc(3 / 5)')],
    why: ['--dsh-leading-sm resolves to 7.20px against --dsh-text-sm at 12px; a rung lands on a whole pixel'],
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
