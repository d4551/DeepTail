/**
 * One pixel ladder, read rung by rung.
 *
 * Split from `check-scale.ts` along the seam the two halves already had: that
 * module answers every rule the token sheet carries, and this one answers the
 * rules that only exist once a rung has been resolved to a pixel — a rung that
 * states no whole pixel, a ratio rung with no type rung to resolve against, a
 * rung that does not rise above the one before it, and a ladder of one rung,
 * which is not a ladder.
 *
 * The set-valued ladders — a weight, a tracking, a casing — are deliberately
 * not here: they hold decisions rather than distances, so they carry no pixel
 * to land on, and the question asked of them belongs where the family's own
 * vocabulary is.
 *
 * @module
 */

import type { Offence } from './offence.ts'
import type { MeasuredLadder, Rung } from './sheet-scale.ts'

/** A rung holding a whole number of pixels. */
const PIXELS = /^(\d+)px$/u

/** A leading rung, holding a ratio: two whole numbers between `calc(` and `)`. */
const RATIO = /^calc\(\s*(\d+)\s*\/\s*(\d+)\s*\)$/u

/** What a rung resolves to, or why it resolves to nothing. */
type Resolved = { readonly ok: true; readonly px: number } | { readonly ok: false; readonly why: string }

/** One rung and the pixel it landed on. */
interface Landed {
  readonly rung: Rung
  readonly px: number
}

/** What reading one ladder found. */
export interface LadderRead {
  /** The offences the ladder's own declarations carry. */
  readonly offences: readonly Offence[]
  /** The pixel each rung landed on, by whole property name. */
  readonly pixels: ReadonlyMap<string, number>
}

/**
 * An empty map of pixels, by whole property name.
 *
 * The two readers that accumulate pixels both need one, and a map written out
 * at each of them is the same declaration twice: what it holds is this module's
 * currency, so it is named here once.
 * @returns the map.
 */
export function pixelMap(): Map<string, number> {
  return new Map<string, number>()
}

/**
 * What one rung resolves to.
 * @param ladder - the ladder the rung belongs to.
 * @param rung - the rung, as the sheet writes it.
 * @param paired - the pixels the ladder this one resolves against landed on, by property.
 * @returns the pixel it resolves to, or why it resolves to nothing.
 */
function resolvedRung(ladder: MeasuredLadder, rung: Rung, paired: ReadonlyMap<string, number>): Resolved {
  if (ladder.unit === 'px') {
    const digits = PIXELS.exec(rung.value)?.at(1)
    if (digits === undefined) {
      return { ok: false, why: `${rung.property} is ${rung.value}; every rung of ${ladder.stem} is a whole pixel` }
    }
    return { ok: true, px: Number(digits) }
  }
  const found = RATIO.exec(rung.value)
  const numerator = found?.at(1)
  const denominator = found?.at(2)
  if (numerator === undefined || denominator === undefined) {
    return {
      ok: false,
      why: `${rung.property} is ${rung.value}; a rung of ${ladder.stem} is a ratio written calc(<whole> / <whole>)`,
    }
  }
  const against = paired.get(`${ladder.resolves}${rung.name}`)
  if (against === undefined) {
    return {
      ok: false,
      why: `${rung.property} has no ${ladder.resolves}${rung.name} to resolve against; the two ladders pair rung for rung`,
    }
  }
  const px = (Number(numerator) * against) / Number(denominator)
  if (!Number.isInteger(px)) {
    return {
      ok: false,
      why: `${rung.property} resolves to ${px.toFixed(2)}px against ${ladder.resolves}${rung.name} at ${String(against)}px; a rung lands on a whole pixel`,
    }
  }
  return { ok: true, px }
}

/**
 * Every rung that does not rise above the one before it, or that rises by less.
 * @param label - the path to report offences under.
 * @param landed - the rungs the ladder landed on, in ladder order.
 * @returns one offence per rung out of the ladder's order.
 */
function outOfOrder(label: string, landed: readonly Landed[]): Offence[] {
  const offences: Offence[] = []
  let previous: Landed | undefined
  let step: number | undefined
  for (const one of landed) {
    if (previous !== undefined) {
      const rise = one.px - previous.px
      if (rise <= 0) {
        offences.push({
          label,
          line: one.rung.line,
          why: `${one.rung.property} is ${String(one.px)}px, not above ${previous.rung.property} at ${String(previous.px)}px; a ladder rises from rung to rung`,
        })
      } else if (step !== undefined && rise < step) {
        offences.push({
          label,
          line: one.rung.line,
          why: `${one.rung.property} rises ${String(rise)}px above ${previous.rung.property}, narrower than the ${String(step)}px before it`,
        })
      }
      step = rise
    }
    previous = one
  }
  return offences
}

/**
 * Read one pixel ladder: every rung's value, the order they land in, and what a
 * rung states when it states no pixel.
 * @param label - the path to report offences under.
 * @param ladder - the ladder to read.
 * @param rungs - its rungs, in ladder order.
 * @param paired - the pixels of the ladder a ratio rung resolves against.
 * @returns what it found.
 */
export function readLadder(
  label: string,
  ladder: MeasuredLadder,
  rungs: readonly Rung[],
  paired: ReadonlyMap<string, number>,
): LadderRead {
  const offences: Offence[] = []
  const pixels = pixelMap()
  if (rungs.length === 1) {
    for (const only of rungs) {
      offences.push({
        label,
        line: only.line,
        why: `${ladder.stem} declares one rung (${only.property}); a ladder is read from two rungs up`,
      })
    }
  }
  const landed: Landed[] = []
  for (const rung of rungs) {
    const read = resolvedRung(ladder, rung, paired)
    if (!read.ok) {
      offences.push({ label, line: rung.line, why: read.why })
      continue
    }
    landed.push({ rung, px: read.px })
    pixels.set(rung.property, read.px)
  }
  offences.push(...outOfOrder(label, landed))
  return { offences, pixels }
}
