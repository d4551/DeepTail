/**
 * A probe for the set ladders: the weight and tracking families hold one of a
 * closed vocabulary rather than a length, so the question asked of each rung is
 * membership and not the shape of the number.
 *
 * The case below drives that question through the gate, because a fixture whose
 * value never reaches the sheet reports nothing while the table beside it
 * claims the gate refuses it.
 *
 * @module
 */

import { expect, it } from 'bun:test'
import { scaleOffences } from '../scripts/check-scale.ts'
import { TOKEN_SHEET } from '../scripts/sheet-gate.ts'
import { declaredTokens, LADDERS, ladderRungs } from '../scripts/sheet-scale.ts'
import { NAMED, tokens, WHOLE, withValue } from './scale-ladders.ts'

it('reads a set rung the sheet actually writes, rather than the one it replaced', () => {
  const writes = [...WHOLE, ...withValue(NAMED, ['--dsh-weight-semibold', '700'])]
  const text = tokens(...writes)
  expect(text).toContain('--dsh-weight-semibold: 700;')
  const weight = LADDERS.find((one) => one.stem === '--dsh-weight-')
  // A ladder this probe cannot find is a probe that reads the wrong family, so
  // it says so rather than measuring whatever happens to be first in the list.
  if (weight === undefined) throw new Error('the weight ladder is not declared at all')
  const written = declaredTokens(text)
  expect(ladderRungs(weight, written).rungs.map((one) => one.value)).toEqual(['400', '500', '700'])
  expect(scaleOffences(TOKEN_SHEET, text).map((one) => one.why)).toEqual([
    '--dsh-weight-semibold is 700, which is no value of --dsh-weight-; the family declares 400, 500, 600',
  ])
})
