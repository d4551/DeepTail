/**
 * The token scale the scale-gate suites drive their readers with.
 *
 * This is the canonical ladder the sheet gates already declare for this
 * product: a whole spacing family numbered from nought without a gap, and named
 * families for radius, type, leading, tracking, weight, drawn width and control
 * height. Held apart from the refusal tables in `scale-fixtures.ts` so the table
 * of cases stays readable as a table and the ladder is written once, rather than
 * restated by every suite that reads a rung.
 *
 * @module
 */

/** The rungs of one ladder, each written as a name and the value it holds. */
function rungs(stem: string, pairs: readonly (readonly [name: string, value: string])[]): string[] {
  return pairs.map(([name, value]) => `--${stem}-${name}: ${value}`)
}

/** A ladder whose rungs are numbered, holding the values a case declares. */
function numbered(values: readonly number[]): string[] {
  return values.map((px, index) => `--dsh-space-${String(index)}: ${String(px)}px`)
}

/** Every rung of the ladders that name their rungs, and one of the sheet's singles. */
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

/**
 * The rungs a case declares, with each named one holding another value.
 *
 * The match is on the whole name and not on its head, because rung names share
 * heads: `--dsh-border-ring` begins with `--dsh-border-` and so does
 * `--dsh-border-hairline`, and a prefix match rewrites whichever is written
 * first — a case that then reports the defect it did not plant, or reports
 * nothing at all.
 *
 * Every restatement is applied in one pass, so restating two rungs never writes
 * one of them twice: a case that did would be refused for the repeat rather
 * than for the value it planted.
 * @param declarations - the rungs, as the sheet writes them.
 * @param changes - one whole name and the value to restate it at, per change.
 * @returns the rungs, with each named one holding its new value.
 */
export function withValue(
  declarations: readonly string[],
  ...changes: readonly (readonly [property: string, value: string])[]
): string[] {
  const restated = new Map(changes)
  return declarations.map((one) => {
    const written = one.slice(0, one.indexOf(':'))
    const value = restated.get(written)
    return value === undefined ? one : `${written}: ${value}`
  })
}
