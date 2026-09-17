/**
 * The rules one declaration is read against.
 *
 * Split from `sheet-gate.ts` when it outgrew the size its own rules allow a
 * file to reach. The split is along a real seam: everything here reads a
 * single declaration — its property, or its value — while what is left there
 * reads the sheet as a whole, its blocks, its nests and its at-rules.
 *
 * The rules a value is read against live in `sheet-value-rules.ts`, so this
 * file holds the question of *which* property a declaration writes.
 *
 * @module
 */

import type { Offence } from './offence.ts'
import { declarationsOf } from './sheet-reader.ts'
import { CASINGS } from './sheet-scale-vocabulary.ts'
import { valueOffences } from './sheet-value-rules.ts'

/**
 * Lengths any sheet may write on a drawn property.
 *
 * A hairline and a focus ring are drawn, not spaced: they are one device pixel
 * and two, at every density and every scale, and a nought asks for no line at
 * all. These are the values of the drawn ladder in tokens.css — a sheet reads
 * `--dsh-border-hairline` for the first of them and may write the same number
 * in place, because the two spellings are one decision and the ladder is where
 * it is named. What the rule refuses is a width that is on neither: a 4px or a
 * 7px border is a line no other surface draws, which is a decision taken
 * outside the scale rather than a rung of it.
 *
 * `scripts/check-scale.ts` reads the drawn ladder and refuses a rung that is
 * not one of these, so the two declarations cannot drift apart.
 */
export const DRAWN_LENGTHS: ReadonlySet<string> = new Set(['0px', '1px', '2px', '3px'])

/** A stacking order written as a bare number. */
const STACKING = /^-?\d+$/u

/**
 * The properties that paint a drawn width: a border, a rule or a focus ring.
 *
 * Each takes a line width, and every line width the product draws is one of the
 * drawn rungs in tokens.css. Read as a family of their own because the width of
 * a line is not a space between things: a sheet that writes `4px` here is
 * drawing a line no other surface draws, which is the decision this refuses.
 */
const DRAWN_WIDTHS: ReadonlySet<string> = new Set([
  'border',
  'border-width',
  'border-top',
  'border-bottom',
  'border-block-start',
  'border-block-end',
  'border-inline-start',
  'border-inline-end',
  'column-rule',
  'outline',
  'outline-width',
])

/**
 * A bare pixel width in a drawn value.
 *
 * Tested once per word rather than matched across the value, so the pattern
 * carries no global flag: a global pattern keeps its `lastIndex` between calls,
 * and one match would then hide the next.
 */
const DRAWN_WIDTH_BARE = /\d+px/u

/** A length written as a number of pixels. */
const PIXELS = /\b\d+px\b/gu

/** Properties whose lengths are spacing, radius or type decisions. */
const SCALED = new RegExp(
  '^(margin|padding|gap|row-gap|column-gap|inset|top|right|bottom|left' +
    '|margin-(top|right|bottom|left|block|inline)(-start|-end)?' +
    '|padding-(top|right|bottom|left|block|inline)(-start|-end)?' +
    '|inset-(block|inline)(-start|-end)?' +
    '|(min-|max-)?(width|height)|(min-|max-)?(block|inline)-size' +
    '|border-radius|font-size|line-height|grid-template-columns|grid-template-rows' +
    '|scroll-margin|scroll-padding)$',
  'u',
)

/**
 * The physical side properties, which break when the document direction
 * reverses.
 *
 * A sheet written with left and right sides is a sheet that only reads
 * correctly in one writing mode: the logical start/end spellings follow the
 * direction, so they are the only side spellings a sheet may use.
 */
export const PHYSICAL_SIDES: ReadonlySet<string> = new Set([
  'margin-left',
  'margin-right',
  'padding-left',
  'padding-right',
  'border-left',
  'border-right',
  'border-left-width',
  'border-right-width',
  'border-left-color',
  'border-right-color',
  'border-left-style',
  'border-right-style',
  'left',
  'right',
])

/**
 * The rules that read a whole value on one named property.
 *
 * Each answers with a reason or with nothing, so a property no rule owns falls
 * through to the length rules below rather than being refused for a spelling no
 * decision was taken about. A property whose whole vocabulary the product sets
 * — the letter case, the font shorthand — answers from that vocabulary, and
 * `text-align` reads the word wherever it sits in the value, which is what
 * makes `justify-all` an alignment defect as much as `justify` is.
 */
const VALUE_RULES: ReadonlyMap<string, (value: string) => string | undefined> = new Map<
  string,
  (value: string) => string | undefined
>([
  // Anchored at both ends: a value that merely opens or closes with digits is
  // not a stacking order, and reporting it as one would be a false alarm on a
  // value the scale does not own. The keyword that names no order is not one.
  [
    'z-index',
    (value) => (STACKING.test(value) ? 'a stacking order belongs to the z-index scale in tokens.css' : undefined),
  ],
  ['float', (value) => (value === 'none' ? undefined : 'float is legacy layout; use flex or grid')],
  [
    'text-align',
    (value) =>
      value.includes('justify') || value === 'left' || value === 'right'
        ? 'justified or physical text alignment is an alignment defect; use text-align start or end'
        : undefined,
  ],
  [
    'text-transform',
    (value) =>
      CASINGS.includes(value)
        ? undefined
        : `${value} is no letter case the product sets; the declared cases are ${CASINGS.join(', ')}`,
  ],
  [
    'font',
    (value) =>
      // The shorthand carries a size, a family and a leading in one value, and
      // every one of those is a rung: a `font: 14px/1.4 sans-serif` states three
      // scale decisions where no reader of the scale would look for them, which
      // is a way past the type, leading and family rules at once. `inherit`
      // takes the parent's font whole, deciding nothing, and is the one spelling
      // that says so.
      value === 'inherit'
        ? undefined
        : `${value} restates a size, a leading and a family inside the font shorthand; declare font-size, line-height and font-family as rungs, or take the parent's font whole with inherit`,
  ],
])

/**
 * Every drawn width a sheet states outside the drawn ladder.
 *
 * A width is read as a whole value rather than as a length inside a value: the
 * shapes a border takes are `none`, a width, a style and a colour in any order,
 * so the width is the one token in the value that is either a drawn rung, a
 * keyword CSS names, or nought.
 * @param label - the path to report offences under.
 * @param property - the property being written.
 * @param value - what it is set to.
 * @param line - the line it is written on.
 * @returns the offences, or an empty list.
 */
function drawnWidthOffences(label: string, property: string, value: string, line: number): Offence[] {
  const words = value.split(/\s+/u).filter((word) => word !== '')
  const bare = words.filter((word) => DRAWN_WIDTH_BARE.test(word) && !DRAWN_LENGTHS.has(word))
  if (bare.length === 0) return []
  return [
    {
      label,
      line,
      why: `drawn-width: ${bare.join(', ')} on ${property} is not a drawn rung; a border, a rule and a ring are drawn at ${[...DRAWN_LENGTHS].join(', ')} in tokens.css`,
    },
  ]
}

/**
 * The widths a scaled property states outside the scale.
 *
 * A length on a spacing, radius or type property is a decision the scale owns:
 * `grid-template-columns` is named apart, because a track is a layout rather
 * than a space between things.
 * @param label - the path to report offences under.
 * @param property - the property being written.
 * @param value - what it is set to.
 * @param line - the line it is written on.
 * @returns the offences, or an empty list.
 */
function scaledLengthOffences(label: string, property: string, value: string, line: number): Offence[] {
  if (!SCALED.test(property)) return []
  const lengths = [...value.matchAll(PIXELS)].map((found) => found[0]).filter((px) => !DRAWN_LENGTHS.has(px))
  if (lengths.length === 0) return []
  if (property === 'grid-template-columns' || property === 'grid-template-rows') {
    return [
      {
        label,
        line,
        why: `hardcoded-grid: ${lengths.join(', ')} in ${property} belongs to the scale in tokens.css`,
      },
    ]
  }
  return [{ label, line, why: `${lengths.join(', ')} is written out rather than read from the scale in tokens.css` }]
}

/**
 * The rules that are about which property a declaration writes.
 *
 * These read the property name, so a custom property — which names a value
 * rather than a box — is not one of them, and asks its own question where a
 * value is read instead. A physical side is refused first, because the spelling
 * is the defect whatever the value is; the word rules follow, and a length rule
 * has the last word on a property that takes a drawn or a scaled width.
 * @param label - the path to report offences under.
 * @param property - the property being written.
 * @param value - what it is set to.
 * @param line - the line it is written on.
 * @returns the offences, or an empty list.
 */
function propertyOffences(label: string, property: string, value: string, line: number): Offence[] {
  if (PHYSICAL_SIDES.has(property)) {
    return [
      {
        label,
        line,
        why: `${property} is a physical side; use the logical start or end spelling so the direction follows the writing mode`,
      },
    ]
  }
  const refusal = VALUE_RULES.get(property)?.(value)
  const fromWord: Offence[] = refusal === undefined ? [] : [{ label, line, why: refusal }]
  const fromLength = DRAWN_WIDTHS.has(property)
    ? drawnWidthOffences(label, property, value, line)
    : scaledLengthOffences(label, property, value, line)
  return [...fromWord, ...fromLength]
}

/**
 * Every declaration a sheet writes that it may not write.
 * @param label - the path to report offences under.
 * @param text - the sheet's contents, comments already blanked.
 * @param defines - whether this sheet is the one whose custom properties
 * define the scale and the palette. A pixel length or a colour function on a
 * custom property of that sheet states the scale or the palette; the same
 * value on any other property of any sheet is a decision made outside the one
 * place that owns it.
 * @returns one offence per rejected declaration.
 */
export function declarationOffences(label: string, text: string, defines: boolean): Offence[] {
  const offences: Offence[] = []
  for (const { property, value, line } of declarationsOf(text)) {
    const custom = property.startsWith('--')
    offences.push(...valueOffences(label, value, line, defines && custom))
    if (custom) {
      // A custom property names a value, so no property rule reads it; the
      // length it holds is still a length, and outside the sheet that defines
      // the scale it is one written out rather than read from it.
      const lengths = [...value.matchAll(PIXELS)].map((found) => found[0]).filter((px) => !DRAWN_LENGTHS.has(px))
      if (lengths.length > 0 && !defines) {
        offences.push({
          label,
          line,
          why: `${lengths.join(', ')} is written out rather than read from the scale in tokens.css`,
        })
      }
      continue
    }
    offences.push(...propertyOffences(label, property, value, line))
  }
  return offences
}
