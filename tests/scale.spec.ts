/**
 * The scale gate's rules: every declaration it must refuse, and the lookalike
 * beside each that it must allow.
 *
 * Two readers are driven here — the one that reads the token sheet as a scale,
 * and the one that reads every other sheet as a reader of it. Each detector is
 * driven against the shape it exists to catch, because a rule with only a clean
 * case beside it reports nothing and passes.
 *
 * A case names every reason it produces, not merely one of them: a rule that
 * reported a sheet for something else as well would pass a case that only asked
 * whether its own reason was among them. What a whole value is read as is
 * driven from both edges too — a value with anything before it, after it or
 * outside the brackets is refused rather than read up to its first match, and a
 * value the rules do not own is passed over rather than read. What the shipped
 * sheets say is asserted in `tests/tree/scale.spec.ts`, through the gate the
 * chain runs. The fixture tables live in `scale-fixtures.ts`.
 */

import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { GATE, referenceOffences, scaleOffences, scanScale } from '../scripts/check-scale.ts'
import { TOKEN_SHEET } from '../scripts/sheet-gate.ts'
import { OWNED, outsideScale } from '../scripts/sheet-scale.ts'
import { declaredTokens } from '../scripts/sheet-token-reader.ts'
import {
  misreported,
  NAMED,
  REFUSED_READER,
  REFUSED_SCALE,
  reason,
  SHEET,
  tokens,
  WHOLE,
  withValue,
} from './scale-fixtures.ts'

describe('the scale gate rejects', () => {
  it('every declaration the scale does not hold, and every decision stated beside it', () => {
    expect(
      misreported(REFUSED_SCALE, (one) =>
        scaleOffences(TOKEN_SHEET, tokens(...one.writes)).map((found) => reason(found)),
      ),
    ).toEqual([])
    expect(
      misreported(REFUSED_READER, (one) => referenceOffences(SHEET, one.writes).map((found) => reason(found))),
    ).toEqual([])
  })

  it('nothing a sheet that holds the scale writes, on either side of the gate', () => {
    const paired = '.a {\n  font-size: var(--dsh-text-sm);\n  line-height: var(--dsh-leading-sm);\n}\n'
    const inherited = '.a {\n  line-height: var(--dsh-leading-lg);\n}\n'
    const sized = '.a { font-size: var(--dsh-text-sm); }\n'
    const other = '.a {\n  display: flex;\n  font-size: var(--dsh-text-sm);\n  line-height: var(--dsh-leading-sm);\n}\n'
    const ratio = [...WHOLE, ...withValue(NAMED, '--dsh-leading-sm', 'calc(3/2)')]
    for (const held of [tokens(...WHOLE, ...NAMED), tokens(...NAMED), tokens(...ratio)]) {
      expect(scaleOffences(TOKEN_SHEET, held)).toEqual([])
    }
    for (const held of [paired, inherited, sized, other]) expect(referenceOffences(SHEET, held)).toEqual([])
  })

  it('a single rebound under a second selector, which is the cascade working', () => {
    const rebound = ':root {\n  --dsh-drawer: 0;\n}\n\n:root:dir(rtl) {\n  --dsh-drawer: 1;\n}\n'
    expect(scaleOffences(TOKEN_SHEET, rebound).filter((one) => one.why.includes('declared twice'))).toEqual([])
  })

  it('reports what it read in the order the sheet is written, not the order it read it in', () => {
    // The leading ladder is read before the type ladder it resolves against, so
    // the reasons are not produced in the order they are written: a report that
    // left them as they arrived would name a line below one that follows it.
    const shortest = ':root {\n  --dsh-leading-sm: calc(3 / 2);\n  --dsh-space-0: 2px;\n  --dsh-space-2: 6px;\n}\n'
    const lines = scaleOffences(TOKEN_SHEET, shortest).map((one) => one.line)
    expect(lines.length).toBeGreaterThan(2)
    expect(lines.toSorted((left, right) => left - right)).toEqual(lines)
  })

  it('admits every name the token sheet declares, which is what its singles are for', async () => {
    const text = await readFile(TOKEN_SHEET, 'utf8')
    expect(outsideScale(TOKEN_SHEET, declaredTokens(text, OWNED))).toEqual([])
  })
})

describe('the gate the chain runs', () => {
  it('reads the token sheet as the scale and every other sheet as a reader of it', () => {
    const reader = '.a { font-size: 1rem; }'
    const why = 'font-size: 1rem is not a rung of the type ladder in tokens.css; read one of --dsh-text-<rung>'
    expect(scanScale(SHEET, reader).map((one) => reason(one))).toEqual([why])
    expect(scanScale(TOKEN_SHEET, reader).map((one) => reason(one))).not.toContain(why)
    expect(scanScale(TOKEN_SHEET, tokens(...WHOLE, ...NAMED))).toEqual([])
  })

  it('declares the file kind it reads, and says what it refused', () => {
    expect([...GATE.extensions]).toEqual(['.css'])
    expect(GATE.refusal).toBe('a sheet writes a value the scale does not declare')
    expect(GATE.clean(7)).toBe('every sheet reads the scale (7 sheets)')
  })
})
