/**
 * The stylesheet gate's cascade and scoping fixtures: the nest, the override,
 * the custom property and the exemption.
 *
 * Split from `sheet-gate-rules.spec.ts` when it outgrew the size the linter
 * allows a file. Every case here covers a way past the gate that was open as
 * shipped: a nest written without the operator, an override written with a
 * space in it, a value hidden behind a custom property, and a sheet exempted
 * by what it was called.
 */

import { describe, expect, it } from 'bun:test'
import { breakpointsOf, scanSheet } from '../scripts/sheet-gate.ts'
import { joined, remoteHost, sheetOffences } from './fixtures.ts'

describe('the stylesheet gate rejects a nest and an override', () => {
  it('a nest written without the operator, which CSS does not require', () => {
    // The rule looked for the operator, so a nest was one keystroke from being
    // invisible — and the reader that found rules by pattern swallowed the
    // enclosing rule's own declarations into the inner rule's selector, which
    // is how a float and a physical margin sat in a sheet unreported.
    expect(sheetOffences('.a { float: left; margin-left: 9px; .b { color: currentcolor } }')).toEqual([
      `.b rides another rule's scope; state the selector at the top level`,
      'float is legacy layout; use flex or grid',
      'margin-left is a physical side; use the logical start or end spelling so the direction follows the writing mode',
    ])
    expect(sheetOffences(joined('@med', 'ia (max-width: 100px) { .a { .b { color: currentcolor } } }'))).toEqual([
      `.b rides another rule's scope; state the selector at the top level`,
    ])
  })

  it('an override however the cascade accepts it written', () => {
    // The grammar allows whitespace between the bang and the keyword and reads
    // the keyword without regard to case, so each of these wins every cascade
    // exactly as the plain spelling does.
    const flag = joined('!', 'important')
    const why = `an ${flag} override wins every cascade; restate the selector instead`
    expect(sheetOffences(`.a { color: currentcolor ${flag}; }`)).toEqual([why])
    expect(sheetOffences(`.a { color: currentcolor ${joined('!', ' important')}; }`)).toEqual([why])
    expect(sheetOffences(`.a { color: currentcolor ${joined('!', 'IMPORTANT')}; }`)).toEqual([why])
    expect(sheetOffences(`.a { color: currentcolor ${joined('!', '\n  important')}; }`)).toEqual([why])
  })

  it('no override where the word is only prose', () => {
    expect(sheetOffences('.a { content: "not important"; }')).toEqual([])
  })
})

describe('the stylesheet gate reads a value the cascade reads', () => {
  it('a sheet merely named like the token sheet, which is any file anyone adds', () => {
    // The exemption read the end of the path, so a file called
    // `probe-tokens.css` was exempt from every rule in the gate at once. It is
    // named whole now: this sheet answers the rules like any other.
    const label = 'apps/deeptail/src/styles/probe-tokens.css'
    expect(scanSheet(label, '.a { float: left; }').map((offence) => offence.why)).toEqual([
      'float is legacy layout; use flex or grid',
    ])
    expect(scanSheet(label, '.a { padding: 37px; }').map((offence) => offence.why)).toHaveLength(1)
  })

  it('a custom property outside the token sheet, which the engine substitutes in place', () => {
    // Every declaration rule was skipped for a custom property, so one was a
    // way past the whole gate: the engine puts the value wherever it is read,
    // which makes each of these exactly the defect it would be written in place.
    expect(sheetOffences('.a { --probe: 100vh; }')).toEqual([
      '100vh is measured against a viewport the reader may not have; use the dynamic unit dvh',
    ])
    expect(sheetOffences('.a { --probe: #ff0000; }')).toEqual([
      '#ff0000 is written out rather than read from the palette in tokens.css',
    ])
    expect(sheetOffences(`.a { --probe: url(${remoteHost()}/x.png); }`)).toEqual([
      'a remote URL loads an asset no local install ships; ship the asset in the bundle',
    ])
    expect(sheetOffences('.a { --probe: 37px; }')).toEqual([
      '37px is written out rather than read from the scale in tokens.css',
    ])
    // A speed held in a custom property is the same escape as a length held in
    // one: the property is read where the motion is declared, so the setting
    // that redefines the motion scale never reaches it.
    expect(sheetOffences('.a { --probe: 400ms; }')).toEqual([
      '400ms is written out rather than read from the motion scale in tokens.css, so the reduced-motion setting cannot reach it',
    ])
  })

  it('a custom property that reads the scale, or draws a hairline', () => {
    expect(sheetOffences('.a { --probe: var(--dsh-space-5); }')).toEqual([])
    expect(sheetOffences('.a { --probe: 1px; }')).toEqual([])
    expect(sheetOffences('.a { --probe: 1; }')).toEqual([])
    expect(sheetOffences('.a { --probe: 100dvh; }')).toEqual([])
    expect(sheetOffences('.a { --probe: var(--ds-transition-duration); }')).toEqual([])
    expect(sheetOffences('.a { --probe: 0s; }')).toEqual([])
  })
})

describe('the retired at-rule reader', () => {
  it('names the line the pipeline directive is written on', () => {
    // The offence points a reader at the directive; a line off by one points at
    // whatever happens to be next to it.
    expect(
      scanSheet('apps/deeptail/src/styles/shell.css', `.a { color: currentcolor }\n\n${joined('@tail', 'wind base;')}`),
    ).toEqual([
      {
        label: 'apps/deeptail/src/styles/shell.css',
        line: 3,
        why: `${joined('@tail', 'wind')} belongs to the utility pipeline this product retired; state the declarations directly`,
      },
    ])
  })

  it('reads the layer directive however wide the space inside it', () => {
    for (const spacing of [' ', '  ', '\t']) {
      expect(sheetOffences(joined('@lay', `er${spacing}utilities { .a { color: currentcolor; } }`))).not.toEqual([])
    }
  })

  it('says nothing about the cascade layer CSS itself ships', () => {
    expect(sheetOffences(joined('@lay', 'er base { .a { color: currentcolor; } }'))).toEqual([])
    expect(sheetOffences(joined('@lay', 'er components, utilities-of-ours;'))).toEqual([])
  })
})

describe('the breakpoint reader reads a query however it is spaced', () => {
  it('reads a range query with and without space around its operator', () => {
    expect(breakpointsOf(joined('@med', 'ia (wid', 'th<=900px) { .a { color: red } }'))).toEqual(['900px'])
    expect(breakpointsOf(joined('@med', 'ia (wid', 'th  <=  900px) { .a { color: red } }'))).toEqual(['900px'])
  })

  it('reads a maximum query with and without space around its colon', () => {
    expect(breakpointsOf(joined('@med', 'ia (max-wid', 'th:900px) { .a { color: red } }'))).toEqual(['900px'])
    expect(breakpointsOf(joined('@med', 'ia (max-wid', 'th  :  900px) { .a { color: red } }'))).toEqual(['900px'])
  })

  it('reads every query a sheet writes, in order', () => {
    const sheet = joined(
      '@med',
      'ia (max-wid',
      'th: 900px) { .a { color: red } }\n',
      '@cont',
      'ainer (heig',
      'ht <= 640px) { .b { color: red } }',
    )
    expect(breakpointsOf(sheet)).toEqual(['900px', '640px'])
  })

  it('reads no size where the query switches on nothing sized', () => {
    expect(breakpointsOf('.a { color: red }')).toEqual([])
  })
})
