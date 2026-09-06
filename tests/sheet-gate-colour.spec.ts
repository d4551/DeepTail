/**
 * Every way a colour can be written into a sheet without going through the
 * palette, and every way one can be read from it.
 *
 * The rule is one regular expression over three families — a hex literal, a
 * colour function, and a named colour — and each family is a separate way past
 * it. The case-insensitivity is a case of its own: a sheet is as free to write
 * `#FFF` as `#fff`, and a reader that saw only one of them would report half a
 * palette.
 */

import { describe, expect, it } from 'bun:test'
import { scanSheet } from '../scripts/sheet-gate.ts'

/** The reasons a sheet is rejected for. */
function sheetOffences(text: string): string[] {
  return scanSheet('apps/deeptail/src/styles/shell.css', text).map((offence) => offence.why)
}

/**
 * The reason a raw colour is refused.
 * @param written - the literal, as the sheet wrote it.
 * @returns the message.
 */
const raw = (written: string): string => `${written} is written out rather than read from the palette in tokens.css`

describe('the palette rule rejects a hex literal', () => {
  it('at every length CSS admits, and in either case', () => {
    const hex = ['#fff', '#ffff', '#ffffff', '#ffffffff']
    expect(hex.map((value) => sheetOffences(`.a { color: ${value}; }`))).toEqual(hex.map((value) => [raw(value)]))
    expect(sheetOffences('.a { color: #FF0000; }')).toEqual([raw('#FF0000')])
    expect(sheetOffences('.a { color: #AbCdEf; }')).toEqual([raw('#AbCdEf')])
  })

  it('and says nothing about a run of hex too short to be one', () => {
    expect(sheetOffences('.a { grid-area: #f; }')).toEqual([])
  })
})

describe('the palette rule rejects a colour function', () => {
  it('by every name CSS gives one', () => {
    const functions = ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color']
    expect(functions.map((name) => sheetOffences(`.a { color: ${name}(0 0 0); }`))).toEqual(
      functions.map((name) => [raw(`${name}(`)]),
    )
  })

  it('in either case', () => {
    expect(sheetOffences('.a { color: RGB(0 0 0); }')).toEqual([raw('RGB(')])
  })

  it('and says nothing about a function that names no colour', () => {
    const others = ['var(--dsw-alias-text)', 'min(1px, 2px)', 'calc(1px + 1px)', 'env(safe-area-inset-top)']
    expect(others.map((value) => sheetOffences(`.a { color: ${value}; }`))).toEqual(others.map(() => []))
  })
})

describe('the palette rule rejects a named colour', () => {
  it('across the table, at its ends and in its middle', () => {
    // Read at the first, the last and several in between: a table trimmed at
    // either end is a set of colours the gate stops seeing.
    const named = ['aliceblue', 'black', 'red', 'rebeccapurple', 'white', 'yellowgreen']
    expect(named.map((value) => sheetOffences(`.a { color: ${value}; }`))).toEqual(named.map((value) => [raw(value)]))
  })

  it('in either case', () => {
    expect(sheetOffences('.a { color: RED; }')).toEqual([raw('RED')])
    expect(sheetOffences('.a { border: 1px solid CadetBlue; }')).toEqual([raw('CadetBlue')])
  })

  it('and says nothing about a word that merely contains one', () => {
    const words = ['reddish', 'blacken', 'notwhite', 'goldenrods']
    expect(words.map((word) => sheetOffences(`.a { font-family: ${word}; }`))).toEqual(words.map(() => []))
  })

  it('and says nothing about the two keywords that state no colour', () => {
    // `currentcolor` reads whatever is inherited and `transparent` states the
    // absence of a colour, so neither is a palette decision.
    expect(sheetOffences('.a { color: currentcolor; }')).toEqual([])
    expect(sheetOffences('.a { background: transparent; }')).toEqual([])
    expect(sheetOffences('.a { color: CurrentColor; }')).toEqual([])
    expect(sheetOffences('.a { background: TRANSPARENT; }')).toEqual([])
  })

  it('and says nothing about a system colour, which the platform decides', () => {
    const system = ['CanvasText', 'Canvas', 'Highlight', 'HighlightText', 'ButtonBorder', 'LinkText']
    expect(system.map((value) => sheetOffences(`.a { color: ${value}; }`))).toEqual(system.map(() => []))
  })
})
