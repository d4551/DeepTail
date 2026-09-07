/**
 * The rules a declaration's value is read against, whatever property holds it.
 *
 * Split from `sheet-declarations.ts` along the seam that file already named:
 * these rules read the value alone and are answered for every declaration, a
 * custom property included, while the rules left there read which property is
 * being written and are answered only for the properties that name a box.
 *
 * That every declaration answers these is the whole point of the split being
 * along this line. While custom properties did not, one was a way past every
 * rule in the gate at once: the engine substitutes the value wherever it is
 * read, so `--x: 100vh` is a static viewport height, `--x: #ff0000` is a raw
 * colour and `--x: 37px` is a length off the scale, each of them exactly as
 * much so as writing it in place.
 *
 * @module
 */

import { scanColour } from './colour-gate.ts'
import type { Offence } from './offence.ts'

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

/**
 * The rules that are about what a declaration's value says.
 * @param label - the path to report offences under.
 * @param value - what the property is set to.
 * @param line - the line it is written on.
 * @param paletteDefinition - whether this declaration is one of the palette's
 * own definitions, which is the one place a colour function states the palette
 * rather than second-guessing it.
 * @returns the offences, or an empty list.
 */
export function valueOffences(label: string, value: string, line: number, paletteDefinition: boolean): Offence[] {
  const offences: Offence[] = []
  const viewportUnit = STATIC_VIEWPORT_UNIT.exec(value)
  if (viewportUnit !== null) {
    offences.push({
      label,
      line,
      // The dynamic spelling is the static one with a `d` in front, read off
      // what was found rather than off a capture that has to be defended
      // against being absent when the pattern cannot leave it so.
      why: `${viewportUnit[0]} is measured against a viewport the reader may not have; use the dynamic unit d${viewportUnit[0].slice(-2)}`,
    })
  }
  if (REMOTE_URL_VALUE.test(value)) {
    offences.push({
      label,
      line,
      why: 'a remote URL loads an asset no local install ships; ship the asset in the bundle',
    })
  }
  offences.push(...scanColour(label, value, line, paletteDefinition))
  return offences
}
