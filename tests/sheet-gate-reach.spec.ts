/**
 * Selector-reach fixtures for the stylesheet gate.
 *
 * Split from `sheet-gate-rules.spec.ts` so that file stays under the size
 * limit. The scanner is the same one.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { scanSheet } from '../scripts/sheet-gate.ts'
import { namesWhy } from './fixtures.ts'

/** The reasons a sheet is rejected for. */
function sheetOffences(text: string): string[] {
  return scanSheet('apps/deeptail/src/styles/shell.css', text).map((offence) => offence.why)
}

/** The reason a selector that chains too far is refused. */
const REACH = 'chains past 3 compounds; scope the rule by class instead of structure'

describe('the stylesheet gate reads selectors by reach', () => {
  it('a selector that reaches through the DOM instead of a class', () => {
    expect(sheetOffences('.a .b .c .d { color: currentcolor; }')).toEqual([`.a .b .c .d ${REACH}`])
    expect(sheetOffences('.a > .b + .c ~ .d { color: currentcolor; }')).toEqual([`.a > .b + .c ~ .d ${REACH}`])
    expect(sheetOffences('.a .b .c .d,\n.e { color: currentcolor; }')).toEqual([`.a .b .c .d ${REACH}`])
  })

  it('a selector that stays within the allowed reach', () => {
    expect(sheetOffences('.a .b { color: currentcolor; }')).toEqual([])
    expect(sheetOffences('.host-group > * + * { color: currentcolor; }')).toEqual([])
    expect(sheetOffences('.shell[data-state="open"] .sidebar { color: currentcolor; }')).toEqual([])
  })

  it('the boundary: three compounds are allowed and four are not', () => {
    expect(sheetOffences('.a .b .c { color: currentcolor; }')).toEqual([])
    expect(sheetOffences('.a > .b ~ .c { color: currentcolor; }')).toEqual([])
    namesWhy(sheetOffences('.a .b .c .d { color: currentcolor; }'), REACH, 'four compounds')
  })
})

describe('the stylesheet gate reads combinators and lists', () => {
  it('every combinator the grammar offers, however it is spaced', () => {
    expect(sheetOffences('.a>.b>.c>.d { color: currentcolor; }')).toEqual([`.a>.b>.c>.d ${REACH}`])
    expect(sheetOffences('.a~.b~.c~.d { color: currentcolor; }')).toEqual([`.a~.b~.c~.d ${REACH}`])
    expect(sheetOffences('.a  .b\n.c\t.d { color: currentcolor; }')).toEqual([`.a .b .c .d ${REACH}`])
  })

  it('a compound count that reads no empty compound out of the edges', () => {
    expect(sheetOffences('  .a   .b   .c   { color: currentcolor; }')).toEqual([])
    expect(sheetOffences('.a > .b + .c { color: currentcolor; }')).toEqual([])
  })

  it('every over-deep selector in a list, each named as written', () => {
    expect(sheetOffences('.a .b .c .d, .e .f .g .h { color: currentcolor; }')).toEqual([
      `.a .b .c .d ${REACH}`,
      `.e .f .g .h ${REACH}`,
    ])
  })

  it('the line the over-deep rule opens on, not the line it ends on', () => {
    const offences = scanSheet(
      'apps/deeptail/src/styles/shell.css',
      '.a { color: currentcolor; }\n\n.w .x .y .z { color: currentcolor; }',
    )
    expect(offences).toEqual([
      {
        label: 'apps/deeptail/src/styles/shell.css',
        line: 3,
        why: `.w .x .y .z ${REACH}`,
      },
    ])
  })
})
