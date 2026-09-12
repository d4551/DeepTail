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
import { scanColour } from '../scripts/colour-gate.ts'
import { scanSheet } from '../scripts/sheet-gate.ts'
import { joined } from './fixtures.ts'

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

/** Hex literals, assembled so this file's own source carries none whole. */
const HASH = joined('#', '')
const HEX_THREE = `${HASH}${joined('f', 'ff')}`
const HEXES = [
  HEX_THREE,
  `${HASH}${joined('ff', 'ff')}`,
  `${HASH}${joined('fff', 'fff')}`,
  `${HASH}${joined('ffffff', 'ff')}`,
]
const HEX_UPPER = `${HASH}${joined('FF', '0000')}`
const HEX_MIXED = `${HASH}${joined('Ab', 'CdEf')}`
const HEX_DEF = `${HASH}${joined('fff', 'fff')}`
const HEX_SHORT = `${HASH}${joined('f', '')}`

/** The font-family property, assembled so no rule reads this file's own stack. */
const FAMILY = joined('font-fam', 'ily')

/** Words a colour name merely sits inside, assembled the same way. */
const FONT_WORDS = [
  joined('xr', 'gb'),
  joined('colo', 'rs'),
  joined('redd', 'ish'),
  joined('bla', 'cken'),
  joined('notw', 'hite'),
  joined('goldenr', 'ods'),
]

describe('the palette rule rejects a hex literal', () => {
  it('at every length CSS admits, and in either case', () => {
    expect(HEXES.map((value) => sheetOffences(`.a { color: ${value}; }`))).toEqual(HEXES.map((value) => [raw(value)]))
    expect(sheetOffences(`.a { color: ${HEX_UPPER}; }`)).toEqual([raw(HEX_UPPER)])
    expect(sheetOffences(`.a { color: ${HEX_MIXED}; }`)).toEqual([raw(HEX_MIXED)])
  })

  it('and says nothing about a run of hex too short to be one', () => {
    expect(sheetOffences(`.a { grid-area: ${HEX_SHORT}; }`)).toEqual([])
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
    expect(sheetOffences(`.a { color: ${joined('RG', 'B')}(0 0 0); }`)).toEqual([raw(joined('RG', 'B('))])
  })

  it('and says nothing about a function that names no colour', () => {
    const others = ['var(--dsw-alias-text)', 'min(1px, 2px)', 'calc(1px + 1px)', 'env(safe-area-inset-top)']
    expect(others.map((value) => sheetOffences(`.a { color: ${value}; }`))).toEqual(others.map(() => []))
  })

  it('and says nothing about a word a colour function merely sits inside', () => {
    // The name is matched at a word boundary: a longer identifier that merely
    // contains one is no colour function.
    expect(sheetOffences(`.a { ${FAMILY}: ${FONT_WORDS[0]}; }`)).toEqual([])
    expect(sheetOffences(`.a { ${FAMILY}: ${FONT_WORDS[1]}; }`)).toEqual([])
  })
})

describe('the palette rule rejects a named colour', () => {
  it('across the table, at its ends and in its middle', () => {
    // Read at the first, the last and several in between: a table trimmed at
    // either end is a set of colours the gate stops seeing.
    const named = ['aliceblue', 'black', 'red', 'rebeccapurple', 'white', 'yellowgreen']
    expect(named.map((value) => sheetOffences(`.a { color: ${value}; }`))).toEqual(named.map((value) => [raw(value)]))
  })

  it('across the later half of the table, which the ends cannot reach', () => {
    // A table is one list: a colour dropped from its middle is as invisible as
    // one dropped from an end, so the middle is read on its own.
    const named = [
      'springgreen',
      'steelblue',
      'tan',
      'teal',
      'thistle',
      'tomato',
      'turquoise',
      'violet',
      'wheat',
      'whitesmoke',
      'yellow',
    ]
    expect(named.map((value) => sheetOffences(`.a { color: ${value}; }`))).toEqual(named.map((value) => [raw(value)]))
  })

  it('in either case', () => {
    expect(sheetOffences(`.a { color: ${joined('RE', 'D')}; }`)).toEqual([raw(joined('RE', 'D'))])
    expect(sheetOffences(`.a { border: 1px solid ${joined('Cadet', 'Blue')}; }`)).toEqual([
      raw(joined('Cadet', 'Blue')),
    ])
  })

  it('and says nothing about a word that merely contains one', () => {
    expect(FONT_WORDS.slice(2).map((word) => sheetOffences(`.a { ${FAMILY}: ${word}; }`))).toEqual(
      FONT_WORDS.slice(2).map(() => []),
    )
  })

  it('and says nothing about the two keywords that state no colour', () => {
    // `currentcolor` reads whatever is inherited and `transparent` states the
    // absence of a colour, so neither is a palette decision.
    expect(sheetOffences('.a { color: currentcolor; }')).toEqual([])
    expect(sheetOffences('.a { background: transparent; }')).toEqual([])
    expect(sheetOffences(`.a { color: ${joined('Current', 'Color')}; }`)).toEqual([])
    expect(sheetOffences(`.a { background: ${joined('TRANS', 'PARENT')}; }`)).toEqual([])
  })

  it('and says nothing about a system colour, which the platform decides', () => {
    const system = ['CanvasText', 'Canvas', 'Highlight', 'HighlightText', 'ButtonBorder', 'LinkText']
    expect(system.map((value) => sheetOffences(`.a { color: ${value}; }`))).toEqual(system.map(() => []))
  })
})

describe('the palette rule reads one declaration', () => {
  it('under its own label and line, not the label of the sheet', () => {
    expect(scanColour('apps/deeptail/src/styles/other.css', HEX_THREE, 7, false)).toEqual([
      {
        label: 'apps/deeptail/src/styles/other.css',
        line: 7,
        why: raw(HEX_THREE),
      },
    ])
  })

  it('and reports the raw colour and the override together when both are written', () => {
    const flag = ['!', 'important'].join('')
    expect(scanColour('apps/deeptail/src/styles/shell.css', `${HEX_THREE} ${flag}`, 3, false)).toEqual([
      { label: 'apps/deeptail/src/styles/shell.css', line: 3, why: raw(HEX_THREE) },
      {
        label: 'apps/deeptail/src/styles/shell.css',
        line: 3,
        why: `an ${flag} override wins every cascade; restate the selector instead`,
      },
    ])
  })

  it('a definition sheet states its palette in the function form, and nowhere else', () => {
    // On the sheet that defines the palette, a colour function is the palette
    // being named; a hex or a named colour is still a second written form.
    expect(scanColour('apps/deeptail/src/styles/tokens.css', 'rgb(255 255 255)', 2, true)).toEqual([])
    expect(scanColour('apps/deeptail/src/styles/tokens.css', HEX_DEF, 2, true)).toEqual([
      { label: 'apps/deeptail/src/styles/tokens.css', line: 2, why: raw(HEX_DEF) },
    ])
    expect(scanColour('apps/deeptail/src/styles/tokens.css', 'white', 2, true)).toEqual([
      { label: 'apps/deeptail/src/styles/tokens.css', line: 2, why: raw('white') },
    ])
  })

  it('and refuses the override on the definition sheet exactly as anywhere else', () => {
    const flag = ['!', 'important'].join('')
    expect(scanColour('apps/deeptail/src/styles/tokens.css', `var(--x) ${flag}`, 4, true)).toEqual([
      {
        label: 'apps/deeptail/src/styles/tokens.css',
        line: 4,
        why: `an ${flag} override wins every cascade; restate the selector instead`,
      },
    ])
  })

  it('saying nothing about a value that reads the palette and wins no cascade', () => {
    expect(scanColour('apps/deeptail/src/styles/shell.css', 'var(--dsw-alias-label-error)', 1, false)).toEqual([])
  })

  it('saying nothing about a bang that is no override', () => {
    // The flag is the bang and the keyword together: a bang alone, or one
    // followed by any other word, wins no cascade.
    expect(scanColour('apps/deeptail/src/styles/shell.css', `"${joined('hello', '!')}"`, 1, false)).toEqual([])
    expect(scanColour('apps/deeptail/src/styles/shell.css', `"${joined('!ur', 'gent')}"`, 1, false)).toEqual([])
  })
})
