/**
 * The scale read from the sheet that consumes it.
 *
 * `sheet-scale.ts` declares the scale and `check-scale.ts` reads what the token
 * sheet's own rungs hold. This is the third reader, and a different question
 * entirely: every *other* sheet consumes the scale rather than declaring it, so
 * a type, leading, tracking or weight decision written there as a value of its
 * own is a decision taken outside the one place that owns it — and a type rung
 * that does not pair with the leading rung of the same name splits a pair the
 * scale declares rung for rung.
 *
 * One decision, one home: the two halves of the gate that read the token sheet
 * live in `check-scale.ts`, and the half that reads every other sheet lives
 * here, so neither file has to hold both.
 *
 * @module
 */

import type { Offence } from './offence.ts'
import { blocksOf } from './sheet-reader.ts'
import { LEADING, type Rung, TRACKING, TYPE, WEIGHT } from './sheet-scale.ts'

/** A value reading one rung of the scale. */
const RUNG = /^var\(\s*(--dsh-[a-z0-9-]+)\s*\)$/u

/** One property a shipped sheet has to read a rung for, and the family it reads. */
const READS: readonly (readonly [property: string, stem: string, family: string])[] = [
  ['font-size', TYPE, 'type'],
  ['line-height', LEADING, 'leading'],
  ['letter-spacing', TRACKING, 'tracking'],
  ['font-weight', WEIGHT, 'weight'],
]

/**
 * The rung one value reads, when its whole value is a read of a rung in that
 * family.
 * @param stem - the custom-property stem the family's rungs carry.
 * @param value - what the declaration is set to.
 * @returns the rung read, or nothing when the value is not a read of that family.
 */
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
