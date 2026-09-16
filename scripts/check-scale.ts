/**
 * The gate that reads the scale: the values its rungs hold, and the rungs a
 * shipped sheet reads.
 *
 * `sheet-scale.ts` declares the scale — its ladders, their rungs, and the names
 * the token sheet may write. This half reads what those rungs hold: every rung
 * a whole pixel, a ratio rung resolved against the type rung it pairs with, the
 * rungs read in the order they land, each step at least as wide as the step
 * before it, and a numbered family with no hole in it. A ladder of one rung is
 * not a ladder, and is refused as one.
 *
 * It also reads every other sheet as a reader of the scale: a type, leading or
 * tracking decision that states a value of its own is a decision taken outside
 * the sheet the scale lives in, and a block that states both a type rung and a
 * leading rung pairs them by name.
 *
 * Both readers are pure functions over one sheet's text, so a suite can drive
 * each against the shape it exists to refuse rather than only against the tree.
 *
 * @module
 */

import { STYLE_EXTENSIONS } from './extensions.ts'
import { CONSOLE, type Gate, readGate, reportGate } from './gate-runner.ts'
import type { Offence } from './offence.ts'
import { TOKEN_SHEET } from './sheet-gate.ts'
import { blocksOf } from './sheet-reader.ts'
import {
  absentRungs,
  declaredTokens,
  LADDERS,
  type Ladder,
  LEADING,
  ladderRungs,
  type MeasuredLadder,
  outsideScale,
  type Rung,
  TRACKING,
  TYPE,
  WEIGHT,
} from './sheet-scale.ts'

/** A rung holding a whole number of pixels. */
const PIXELS = /^(\d+)px$/u

/** A leading rung, holding a ratio: two whole numbers between `calc(` and `)`. */
const RATIO = /^calc\(\s*(\d+)\s*\/\s*(\d+)\s*\)$/u

/** A value reading one rung of the scale. */
const RUNG = /^var\(\s*(--dsh-[a-z0-9-]+)\s*\)$/u

/** What a rung resolves to, or why it resolves to nothing. */
type Resolved = { readonly ok: true; readonly px: number } | { readonly ok: false; readonly why: string }

/** One rung and the pixel it landed on. */
interface Landed {
  readonly rung: Rung
  readonly px: number
}

/** What reading one ladder found. */
interface LadderRead {
  /** The offences the ladder's own declarations carry. */
  readonly offences: readonly Offence[]
  /** The pixel each rung landed on, by whole property name. */
  readonly pixels: ReadonlyMap<string, number>
}

/** Every numbered rung that leaves a hole in a ladder numbered from nought. */
function gapsInNumbering(label: string, ladder: Ladder, rungs: readonly Rung[]): Offence[] {
  if (ladder.rungs.kind !== 'numbered') return []
  return rungs.flatMap((rung, index) =>
    Number(rung.name) === index
      ? []
      : [
          {
            label,
            line: rung.line,
            why: `${rung.property} is numbered ${rung.name} where the ladder runs from 0 without a gap; rung ${String(index)} is not written`,
          },
        ],
  )
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
 * Every rung of a family that holds a written value rather than a length.
 *
 * A weight and a tracking are sets of decisions rather than staircases: 400, 500
 * and 600 are three weights with no distance between them to read, and `0.04em`
 * is a fraction of whatever type it sits beside. So the one question asked of
 * each rung is whether it holds a value from the family's own vocabulary, and
 * there is no pixel for the ladder to land on.
 * @param label - the path to report offences under.
 * @param ladder - the ladder to read.
 * @param rungs - its rungs, in ladder order.
 * @returns one offence per rung whose value is outside the vocabulary.
 */
function readSetLadder(label: string, ladder: Ladder, rungs: readonly Rung[]): Offence[] {
  if (ladder.unit !== 'set') return []
  const offences: Offence[] = []
  if (rungs.length === 1) {
    for (const only of rungs) {
      offences.push({
        label,
        line: only.line,
        why: `${ladder.stem} declares one rung (${only.property}); a family is read from two rungs up`,
      })
    }
  }
  for (const rung of rungs) {
    if (ladder.values.test(rung.value)) continue
    offences.push({
      label,
      line: rung.line,
      why: `${rung.property} is ${rung.value}, which is no value of ${ladder.stem}${ladder.values.source} describes`,
    })
  }
  return offences
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
 * Read one ladder: every rung's value, the order they land in, and what a rung
 * states when it states no pixel.
 * @param label - the path to report offences under.
 * @param ladder - the ladder to read.
 * @param rungs - its rungs, in ladder order.
 * @param paired - the pixels of the ladder a ratio rung resolves against.
 * @returns what it found.
 */
function readLadder(
  label: string,
  ladder: MeasuredLadder,
  rungs: readonly Rung[],
  paired: ReadonlyMap<string, number>,
): LadderRead {
  const offences: Offence[] = []
  const pixels = new Map<string, number>()
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

/**
 * Every rule the token sheet answers about the scale it declares.
 *
 * The ladders are read in two passes: the ones stating pixels first, so a ratio
 * rung resolves against the type rung it pairs with whatever order the ladder
 * declarations are written in above.
 * @param label - the path to report offences under.
 * @param text - the sheet's contents.
 * @returns one offence per rejected declaration.
 */
export function scaleOffences(label: string, text: string): Offence[] {
  const written = declaredTokens(text)
  const offences: Offence[] = [...outsideScale(label, written)]
  const ratios: { readonly ladder: MeasuredLadder; readonly rungs: readonly Rung[] }[] = []
  const pixels = new Map<string, number>()
  for (const ladder of LADDERS) {
    const { rungs, absent } = ladderRungs(ladder, written)
    offences.push(...absentRungs(label, ladder, absent), ...gapsInNumbering(label, ladder, rungs))
    if (ladder.unit === 'set') {
      offences.push(...readSetLadder(label, ladder, rungs))
      continue
    }
    if (ladder.unit === 'ratio') {
      ratios.push({ ladder, rungs })
      continue
    }
    const read = readLadder(label, ladder, rungs, pixels)
    offences.push(...read.offences)
    for (const [property, px] of read.pixels) pixels.set(property, px)
  }
  for (const { ladder, rungs } of ratios) offences.push(...readLadder(label, ladder, rungs, pixels).offences)
  return offences.toSorted((left, right) => left.line - right.line)
}

/** One property a shipped sheet has to read a rung for, and the family it reads. */
const READS: readonly (readonly [property: string, stem: string, family: string])[] = [
  ['font-size', TYPE, 'type'],
  ['line-height', LEADING, 'leading'],
  ['letter-spacing', TRACKING, 'tracking'],
  ['font-weight', WEIGHT, 'weight'],
]

/** The rung one value reads, when its whole value is a read of a rung in that family. */
function rungRead(stem: string, value: string): string | undefined {
  const read = RUNG.exec(value)?.at(1)
  return read?.startsWith(stem) === true ? read : undefined
}

/**
 * Every rule a shipped sheet answers about the scale it reads.
 * @param label - the path to report offences under.
 * @param text - the sheet's contents.
 * @returns one offence per rejected declaration.
 */
export function referenceOffences(label: string, text: string): Offence[] {
  const offences: Offence[] = []
  for (const block of blocksOf(text)) {
    const read = new Map<string, Rung>()
    for (const declaration of block.declarations) {
      const wanted = READS.find(([property]) => property === declaration.property)
      if (wanted === undefined) continue
      const [property, stem, family] = wanted
      const whole = rungRead(stem, declaration.value)
      if (whole === undefined) {
        offences.push({
          label,
          line: declaration.line,
          why: `${property}: ${declaration.value} is not a rung of the ${family} ladder in tokens.css; read one of ${stem}<rung>`,
        })
        continue
      }
      read.set(property, {
        property: whole,
        name: whole.slice(stem.length),
        value: declaration.value,
        line: declaration.line,
      })
    }
    const size = read.get('font-size')
    const leading = read.get('line-height')
    if (size !== undefined && leading !== undefined && size.name !== leading.name) {
      offences.push({
        label,
        line: leading.line,
        why: `${leading.property} is not the rung that pairs with ${size.property}; a type rung pairs with the leading rung of the same name`,
      })
    }
  }
  return offences
}

/**
 * Every rule, over one sheet.
 *
 * The one sheet whose custom properties define the scale is read as the scale;
 * every other sheet is read as a reader of it.
 * @param label - the path to report offences under.
 * @param text - the sheet's contents.
 * @returns one offence per rejected declaration.
 */
export function scanScale(label: string, text: string): Offence[] {
  return label === TOKEN_SHEET ? scaleOffences(label, text) : referenceOffences(label, text)
}

/** What this gate reads and refuses. */
export const GATE: Gate = {
  extensions: [...STYLE_EXTENSIONS],
  refusal: 'a sheet writes a value the scale does not declare',
  clean: (sheets) => `every sheet reads the scale (${String(sheets)} sheets)`,
  scan: scanScale,
}

// Guarded, as every runnable script here is: importing a module must run
// nothing.
if (import.meta.main) process.exitCode = reportGate(await readGate(GATE), CONSOLE)
