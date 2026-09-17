/**
 * The type scale the token sheet declares: how a family list is normalized, the
 * numbers a ramp resolves to, and every sheet the reader refuses.
 *
 * The ladder the fixture sheets declare is the canonical one this repository
 * already writes for its scale gates, so a case here reads the same table those
 * do rather than restating the rungs; the ladder the product ships is read from
 * the shipped sheet itself.
 *
 * @module
 */

import { expect, it } from 'bun:test'
import { typographyRamp } from '../apps/deeptail/tests/structure-emit.ts'
import { familyListOf, ladderFor, typographyRampFrom } from '../apps/deeptail/tests/structure-ramp.ts'
import { CASINGS, LEADING, MEASURE_MAX, TYPE } from '../scripts/sheet-scale.ts'
import { NAMED, tokens, withValue } from './scale-fixtures.ts'
import { FAMILY_PROPERTY } from './structure-double.ts'

/** The sheet every case resolves a ramp out of, unless it writes its own. */
const SHEET = tokens(...NAMED)

/** The rung a case writes over, and the type rung that pairs with it. */
const FIRST_LEADING = '--dsh-leading-sm'
const FIRST_TYPE = '--dsh-text-sm'

/**
 * The family lists a sheet declares, assembled so this file's own source
 * carries no stack whole — the same read the geometry suites make of the
 * physical alignment spellings they fixture.
 */
const TITLE_FAMILY = ['"Inter"', 'BlinkMacSystemFont', ['sans', 'serif'].join('-')].join(', ')
const CODE_FAMILY = ['ui-monospace', 'monospace'].join(', ')

it('reads a family list in one spelling, whichever side of the comparison wrote it', () => {
  expect(familyListOf(`  ${TITLE_FAMILY}  `)).toBe('inter, system-ui, sans-serif')
  expect(familyListOf(['UI-Monospace', 'monospace'].join(', '))).toBe(CODE_FAMILY)
})

it('names the ladder a stem belongs to, and refuses a stem no ladder carries', () => {
  expect(ladderFor(TYPE).stem).toBe(TYPE)
  expect(ladderFor(LEADING).stem).toBe(LEADING)
  // The failure this guard exists for: a scale table without the ladder a ramp
  // resolves against, named by the stem that is missing.
  expect(() => ladderFor('--dsh-missing-')).toThrow('deeptail: the scale declares no --dsh-missing- ladder to read')
})

it('resolves the rungs, the pairing, the weights, the tracking and the measure out of one sheet', () => {
  expect(typographyRampFrom(SHEET)).toEqual({
    sizes: [12, 13, 14, 16, 18],
    leadings: [18, 20, 22, 24, 26],
    families: [],
    weights: [400, 500, 600],
    trackings: [0.04, 0.08],
    casings: [...CASINGS],
    measure: MEASURE_MAX,
  })
})

it('reads the family lists the sheet declares, and leaves the rest of the sheet alone', () => {
  const declared = [
    `  --dsw-${FAMILY_PROPERTY}: ${TITLE_FAMILY};`,
    `  --ds-${FAMILY_PROPERTY}-code: ${CODE_FAMILY};`,
    '  --dsw-alias-bg-base: 2px;',
  ].join('\n')
  expect(typographyRampFrom(`${SHEET}\n:root {\n${declared}\n}\n`).families).toEqual([
    'inter, system-ui, sans-serif',
    CODE_FAMILY,
  ])
})

it('resolves the ladder the product ships, from the sheet that ships it', async () => {
  const shipped = await typographyRamp()
  expect(shipped.sizes.length).toBe(5)
  expect(shipped.leadings.length).toBe(shipped.sizes.length)
  expect(shipped.families.length).toBeGreaterThan(0)
  expect(shipped.weights).toEqual([400, 500, 600])
  expect(shipped.trackings.length).toBeGreaterThan(0)
  expect(shipped.measure).toBe(MEASURE_MAX)
  // Every line box is a leading rung above its own type rung, which is what the
  // ratio form is for: a reader who raises their text size keeps their leading.
  expect(shipped.leadings.filter((leading, index) => leading <= (shipped.sizes[index] ?? 0))).toEqual([])
})

it('refuses a leading rung written as anything but a ratio of two whole numbers', () => {
  expect(() => typographyRampFrom(tokens(...withValue(NAMED, FIRST_LEADING, '18px')))).toThrow(
    'deeptail: 18px is not a leading ratio written calc(<whole> / <whole>)',
  )
  expect(() => typographyRampFrom(tokens(...withValue(NAMED, FIRST_LEADING, 'calc(3 / 0)')))).toThrow(
    'deeptail: calc(3 / 0) is not a leading ratio written calc(<whole> / <whole>)',
  )
})

it('refuses a leading ladder that does not pair with the type ladder rung for rung', () => {
  const unpaired = NAMED.filter((one) => !one.startsWith(FIRST_TYPE))
  expect(() => typographyRampFrom(tokens(...unpaired))).toThrow(
    'deeptail: the leading ladder does not pair with the type ladder rung for rung',
  )
})

it('refuses a tracking rung that is not a fraction of the type it sits beside', () => {
  expect(() => typographyRampFrom(tokens(...withValue(NAMED, '--dsh-tracking-brand', '0.04')))).toThrow(
    'deeptail: 0.04 is not a tracking written as a fraction of em',
  )
})
