/**
 * The rules one declaration is read against.
 *
 * Split from `sheet-gate.ts` when it outgrew the size its own rules allow a
 * file to reach. The split is along a real seam: everything here reads a
 * single declaration, while what is left there reads the sheet as a whole,
 * its blocks, its nests and its at-rules.
 *
 * It outgrew that size again when the motion rule arrived, and the seam this
 * time is the one the file already named: what is left here reads the property
 * a declaration writes, and `sheet-values.ts` reads what its value says —
 * which every declaration answers, a custom property included.
 *
 * @module
 */

import type { Offence } from './offence.ts'
import { declarationsOf } from './sheet-reader.ts'
import { valueOffences } from './sheet-values.ts'

/**
 * Lengths any sheet may write.
 *
 * A hairline and a focus ring are drawn, not spaced: they are one device pixel
 * and two, at every density and every scale, and naming them would be naming
 * the same number twice. Everything else is a spacing, radius or type decision
 * and belongs to the scale.
 */
export const DRAWN_LENGTHS: ReadonlySet<string> = new Set(['0px', '1px', '2px', '3px'])

/** A stacking order written as a bare number. */
const STACKING = /^-?\d+$/u

/** A length written as a number of pixels. */
const PIXELS = /\b\d+px\b/gu

/** A duration written as a number of seconds or milliseconds. */
const DURATIONS = /\b\d+(?:\.\d+)?m?s\b/gu

/**
 * The durations any sheet may write.
 *
 * No time at all is not a duration decision: `visibility 0s` says the change
 * is not animated, which is the same statement at every speed. Everything else
 * is a speed, and a speed belongs to the motion scale.
 */
const NO_DURATION: ReadonlySet<string> = new Set(['0s', '0ms'])

/** Properties whose values carry a duration. */
const TIMED = /^(?:transition|animation)(?:-duration|-delay)?$/u

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
 * The typographic properties whose values are decisions, not lengths.
 *
 * `font-size` and `line-height` are lengths, so the scale rule above already
 * reads them. Weight and tracking are neither lengths nor colours, so nothing
 * read them at all: seven weights and two trackings were written out across
 * five sheets, and a heading could be one emphasis in one region and another
 * elsewhere with nothing saying which was meant.
 *
 * The `font` shorthand is here for a second reason: it sets the weight, the
 * size and the leading at once under a property name neither this rule nor the
 * length rule matched, so `font: 600 14px/20px` slipped past both at once.
 */
const TYPOGRAPHIC: ReadonlySet<string> = new Set(['font', 'font-weight', 'letter-spacing'])

/**
 * What a typographic property may say without naming a token.
 *
 * `inherit` takes the decision from the box above, and `normal` is the initial
 * value a reset states on purpose. Neither picks a value of its own, so neither
 * is a decision this scale has to hold.
 */
const TYPOGRAPHIC_KEYWORDS: ReadonlySet<string> = new Set(['inherit', 'normal'])

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
 * The rules that are about which property a declaration writes.
 *
 * These read the property name, so a custom property — which names a value
 * rather than a box — is not one of them, and asks its own question below.
 * @param label - the path to report offences under.
 * @param property - the property being written.
 * @param value - what it is set to.
 * @param line - the line it is written on.
 * @returns the offences, or an empty list.
 */
function propertyOffences(label: string, property: string, value: string, line: number): Offence[] {
  if (property === 'z-index') {
    return STACKING.test(value)
      ? [{ label, line, why: 'a stacking order belongs to the z-index scale in tokens.css' }]
      : []
  }
  if (property === 'float') return [{ label, line, why: 'float is legacy layout; use flex or grid' }]
  if (PHYSICAL_SIDES.has(property)) {
    return [
      {
        label,
        line,
        why: `${property} is a physical side; use the logical start or end spelling so the direction follows the writing mode`,
      },
    ]
  }
  if (TYPOGRAPHIC.has(property) && !value.includes('var(') && !TYPOGRAPHIC_KEYWORDS.has(value.trim())) {
    return [
      {
        label,
        line,
        why: `${value} in ${property} is written out rather than read from the scale in tokens.css`,
      },
    ]
  }
  if (TIMED.test(property)) return timedOffences(label, property, value, line)
  if (property === 'text-align' && (value.includes('justify') || value === 'left' || value === 'right')) {
    return [
      {
        label,
        line,
        why: 'justified or physical text alignment is an alignment defect; use text-align start or end',
      },
    ]
  }
  return scaledLengthOffences(label, property, value, line)
}

/**
 * What a custom property holds that belongs to a scale, outside the sheet that
 * defines the scales.
 *
 * A custom property names a value, so no property rule reads it — the engine
 * substitutes it wherever it is read, and whatever it holds is exactly as much
 * a decision as writing that value in place. Both scales are read: a length
 * off the spacing scale, and a speed the reduced-motion setting cannot reach.
 * @param label - the path to report offences under.
 * @param value - what the custom property is set to.
 * @param line - the line it is written on.
 * @returns the offences, or an empty list.
 */
function customValueOffences(label: string, value: string, line: number): Offence[] {
  const offences: Offence[] = []
  const lengths = [...value.matchAll(PIXELS)].map((found) => found[0]).filter((px) => !DRAWN_LENGTHS.has(px))
  if (lengths.length > 0) {
    offences.push({
      label,
      line,
      why: `${lengths.join(', ')} is written out rather than read from the scale in tokens.css`,
    })
  }
  const times = [...value.matchAll(DURATIONS)].map((found) => found[0]).filter((time) => !NO_DURATION.has(time))
  if (times.length > 0) {
    offences.push({
      label,
      line,
      why: `${times.join(', ')} is written out rather than read from the motion scale in tokens.css, so the reduced-motion setting cannot reach it`,
    })
  }
  return offences
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
      if (!defines) offences.push(...customValueOffences(label, value, line))
      continue
    }
    offences.push(...propertyOffences(label, property, value, line))
  }
  return offences
}

/**
 * The durations a declaration writes out rather than reading from the scale.
 *
 * This is an accessibility rule as much as a duplication one. The reduced
 * motion setting is honoured by redefining `--ds-transition-duration` under
 * `prefers-reduced-motion`, so motion that reads its speed from the scale
 * slows to a stop for a viewer who asked for that and motion that spells its
 * own speed does not — it keeps running, at full speed, past the one place
 * that setting is answered. Nothing read a time value at all: a spinner turned
 * at a speed written into the rule, and any sheet could add another.
 * @param label - the path to report offences under.
 * @param property - the property being written.
 * @param value - what it is set to.
 * @param line - the line it is written on.
 * @returns the offences, or an empty list.
 */
function timedOffences(label: string, property: string, value: string, line: number): Offence[] {
  const written = [...value.matchAll(DURATIONS)].map((found) => found[0]).filter((time) => !NO_DURATION.has(time))
  if (written.length === 0) return []
  return [
    {
      label,
      line,
      why: `${written.join(', ')} in ${property} is written out rather than read from the motion scale in tokens.css, so the reduced-motion setting cannot reach it`,
    },
  ]
}

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
