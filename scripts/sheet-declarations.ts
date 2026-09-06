/**
 * The rules one declaration is read against.
 *
 * Split from `sheet-gate.ts` when it outgrew the size its own rules allow a
 * file to reach. The split is along a real seam: everything here reads a
 * single declaration — its property, or its value — while what is left there
 * reads the sheet as a whole, its blocks, its nests and its at-rules.
 *
 * @module
 */

import { scanColour } from './colour-gate.ts'
import type { Offence } from './offence.ts'
import { declarationsOf } from './sheet-reader.ts'

/**
 * Lengths any sheet may write.
 *
 * A hairline and a focus ring are drawn, not spaced: they are one device pixel
 * and two, at every density and every scale, and naming them would be naming
 * the same number twice. Everything else is a spacing, radius or type decision
 * and belongs to the scale.
 */
const DRAWN_LENGTHS = new Set(['0px', '1px', '2px', '3px'])

/** A stacking order written as a bare number. */
const STACKING = /^-?\d+$/u

/** A `url()` that loads from outside the shipped bundle. */
// No `g` flag: this is tested with RegExp.test across declarations, and a
// global regex keeps lastIndex between calls, so one match would hide the next.
const REMOTE_URL_VALUE = /url\(\s*["']?(?:https?:)?\/\//iu

/**
 * The viewport units that report a box the reader cannot see.
 *
 * `vh` is the *large* viewport: on a mobile browser it is measured as though
 * the retractable chrome were retracted, so a box sized by it is taller than
 * what is on screen whenever the chrome is showing, and its tail is unreachable
 * — the menu's pinned footer sat exactly there. `vw` has the same shape of
 * problem with a classic scrollbar. The dynamic units (`dvh`, `dvw`) track what
 * is actually visible, and `svh`/`lvh` name a specific end of that range on
 * purpose, so all of those are allowed and only the two that quietly lie are
 * refused.
 */
const STATIC_VIEWPORT_UNIT = /\b\d+(?:\.\d+)?(vh|vw)\b/u

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
const PHYSICAL_SIDES = new Set([
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
 * The rules that are about what a declaration's value says.
 *
 * Every declaration answers these, custom properties included. While they did
 * not, a custom property was a way past every rule in this file at once: the
 * engine substitutes the value wherever it is read, so `--x: 100vh` is a static
 * viewport height, `--x: #ff0000` is a raw colour and `--x: 37px` is a length
 * off the scale, each of them exactly as much so as writing it in place.
 * @param label - the path to report offences under.
 * @param value - what the property is set to.
 * @param line - the line it is written on.
 * @returns the offences, or an empty list.
 */
function valueOffences(label: string, value: string, line: number): Offence[] {
  const offences: Offence[] = []
  const viewportUnit = STATIC_VIEWPORT_UNIT.exec(value)
  if (viewportUnit !== null) {
    offences.push({
      label,
      line,
      why: `${viewportUnit[0]} is measured against a viewport the reader may not have; use the dynamic unit d${viewportUnit[1] ?? ''}`,
    })
  }
  if (REMOTE_URL_VALUE.test(value)) {
    offences.push({
      label,
      line,
      why: 'a remote URL loads an asset no local install ships; ship the asset in the bundle',
    })
  }
  offences.push(...scanColour(label, value, line))
  return offences
}

/**
 * Every declaration a sheet writes that it may not write.
 * @param label - the path to report offences under.
 * @param text - the sheet's contents, comments already blanked.
 * @returns one offence per rejected declaration.
 */
export function declarationOffences(label: string, text: string): Offence[] {
  const offences: Offence[] = []
  for (const { property, value, line } of declarationsOf(text)) {
    offences.push(...valueOffences(label, value, line))
    if (property.startsWith('--')) {
      // A custom property names a value, so no property rule reads it; the
      // length it holds is still a length, and outside the token sheet it is
      // one written out rather than read from the scale.
      const lengths = [...value.matchAll(PIXELS)].map((found) => found[0]).filter((px) => !DRAWN_LENGTHS.has(px))
      if (lengths.length > 0) {
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
