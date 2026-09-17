/**
 * The gate that reads the scale: the values its rungs hold, and the rungs a
 * shipped sheet reads.
 *
 * `sheet-scale.ts` declares the scale. This half reads what those rungs hold:
 * every rung a whole pixel, a ratio rung resolved against the type rung it
 * pairs with, the rungs read in the order they land, each step at least as wide
 * as the step before it, and a numbered family with no hole in it. A ladder of
 * one rung is not a ladder, and is refused as one.
 *
 * It also reads every other sheet as a reader of the scale: a type, leading or
 * tracking decision that states a value of its own is a decision taken outside
 * the sheet the scale lives in, and a block that states both a type rung and a
 * leading rung pairs them by name. That reader is `sheet-reading-scale.ts`.
 *
 * Both are pure functions over one sheet's text, so a suite can drive each
 * against the shape it exists to refuse rather than only against the tree.
 *
 * @module
 */

import { STYLE_EXTENSIONS } from './extensions.ts'
import { CONSOLE, type Gate, readGate, reportGate } from './gate-runner.ts'
import type { Offence } from './offence.ts'
import { pixelMap, readLadder } from './pixel-ladder.ts'
import { DRAWN_LENGTHS } from './sheet-declarations.ts'
import { TOKEN_SHEET } from './sheet-gate.ts'
import { referenceOffences } from './sheet-reading-scale.ts'
import {
  absentRungs,
  BORDER,
  declaredTokens,
  LADDERS,
  type Ladder,
  ladderRungs,
  type MeasuredLadder,
  outsideScale,
  type Rung,
} from './sheet-scale.ts'

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
 * Every rung of a family that holds one of the family's own values.
 *
 * A weight and a tracking are sets of decisions rather than staircases: 400, 500
 * and 600 are three weights with no distance between them to read, and `0.04em`
 * is a fraction of whatever type it sits beside. So the one question asked of
 * each rung is whether it holds a value the family declares, and there is no
 * pixel for the ladder to land on.
 *
 * Membership, not shape: a pattern would have to describe the family's whole
 * vocabulary, and `/^\d{3}$/` admits 700 as readily as 400 — a weight no face in
 * this product is drawn at would then read as a rung of the weight ladder.
 * @param label - the path to report offences under.
 * @param ladder - the ladder to read.
 * @param rungs - its rungs, in ladder order.
 * @returns one offence per rung whose value the family does not declare.
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
    if (ladder.vocabulary.includes(rung.value)) continue
    offences.push({
      label,
      line: rung.line,
      why: `${rung.property} is ${rung.value}, which is no value of ${ladder.stem}; the family declares ${ladder.vocabulary.join(', ')}`,
    })
  }
  return offences
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
  const pixels = pixelMap()
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
    // The drawn ladder and the allowance a sheet writes a drawn length under
    // are one decision read in two places: a rung whose value is outside the
    // allowance is a width no sheet could restate and no reader would know.
    if (ladder.stem !== BORDER) continue
    for (const rung of rungs) {
      if (DRAWN_LENGTHS.has(rung.value)) continue
      offences.push({
        label,
        line: rung.line,
        why: `${rung.property} is ${rung.value}, which is no drawn length; a border, a rule and a ring are drawn at ${[...DRAWN_LENGTHS].join(', ')}`,
      })
    }
  }
  for (const { ladder, rungs } of ratios) offences.push(...readLadder(label, ladder, rungs, pixels).offences)
  return offences.toSorted((left, right) => left.line - right.line)
}

/**
 * Every rule, over one sheet.
 *
 * The one sheet whose custom properties define the scale is read as the scale;
 * every other sheet is read as a reader of it, which is the rule
 * `sheet-reading-scale.ts` owns and this module dispatches to.
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
