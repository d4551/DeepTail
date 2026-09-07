/**
 * Every member of every table the stylesheet gate decides by, exercised.
 *
 * A table is a list of decisions, and a fixture that drives two of fourteen
 * rows leaves twelve decisions that can be edited with the suite still green.
 * Each list below is written out rather than read from the table it covers —
 * a loop over the table would move with it, and a member emptied to `''` would
 * take the loop with it — and each is then checked against the table, so a row
 * added without a fixture fails here rather than shipping uncovered.
 */

import { describe, expect, it } from 'bun:test'
import { BLANK_VALUES, RING_PROPERTIES, unringedSelectors } from '../scripts/focus-ring-gate.ts'
import { DRAWN_LENGTHS, PHYSICAL_SIDES } from '../scripts/sheet-declarations.ts'
import { joined, remoteHost, sheetOffences } from './fixtures.ts'

/** Every physical side spelling, each of which reads correctly in one direction only. */
const PHYSICAL = [
  'margin-left',
  'margin-right',
  'padding-left',
  'padding-right',
  'border-left',
  'border-right',
  'border-left-width',
  'border-right-width',
  'border-left-color',
  'border-right-color',
  'border-left-style',
  'border-right-style',
  'left',
  'right',
] as const

/** Every length a sheet may write, because it is drawn rather than spaced. */
const DRAWN = ['0px', '1px', '2px', '3px'] as const

/** Every property whose length belongs to the scale, one per family. */
const SCALED = [
  'margin',
  'padding',
  'gap',
  'row-gap',
  'column-gap',
  'inset',
  'top',
  'bottom',
  'margin-top',
  'margin-bottom',
  'margin-block',
  'margin-inline',
  'margin-block-start',
  'margin-inline-end',
  'padding-top',
  'padding-bottom',
  'padding-block',
  'padding-inline',
  'padding-block-end',
  'padding-inline-start',
  'inset-block',
  'inset-inline',
  'inset-block-start',
  'inset-inline-end',
  'width',
  'height',
  'min-width',
  'max-width',
  'min-height',
  'max-height',
  'block-size',
  'inline-size',
  'min-block-size',
  'max-inline-size',
  'border-radius',
  'font-size',
  'line-height',
  'scroll-margin',
  'scroll-padding',
] as const

/** Every property that can paint a focus ring. */
const RINGS = ['outline', 'outline-width', 'outline-style', 'box-shadow'] as const

/** Every value that paints nothing. */
const BLANKS = ['none', '0', '0px'] as const

describe('the physical-side table', () => {
  it('names every spelling a fixture drives, and no more', () => {
    const covered: string[] = [...PHYSICAL]
    expect(covered.toSorted()).toEqual([...PHYSICAL_SIDES].toSorted())
  })

  it('rejects each one by name, so a row cannot be emptied unnoticed', () => {
    const reasons = PHYSICAL.map((property) => sheetOffences(`.a { ${property}: 1px; }`))
    expect(reasons).toEqual(
      PHYSICAL.map((property) => [
        `${property} is a physical side; use the logical start or end spelling so the direction follows the writing mode`,
      ]),
    )
  })

  it('allows the logical spelling of each, which follows the writing mode', () => {
    const logical = [
      'margin-inline-start',
      'margin-inline-end',
      'padding-inline-start',
      'padding-inline-end',
      'border-inline-start',
      'border-inline-end',
      'inset-inline-start',
      'inset-inline-end',
    ]
    expect(logical.map((property) => sheetOffences(`.a { ${property}: 1px; }`))).toEqual(logical.map(() => []))
  })
})

describe('the drawn-length table', () => {
  it('names every length a fixture drives, and no more', () => {
    const covered: string[] = [...DRAWN]
    expect(covered.toSorted()).toEqual([...DRAWN_LENGTHS].toSorted())
  })

  it('allows each of them anywhere a length is a scale decision', () => {
    expect(DRAWN.map((length) => sheetOffences(`.a { padding: ${length}; }`))).toEqual(DRAWN.map(() => []))
  })

  it('rejects the first length past them, so the set is a boundary rather than a mood', () => {
    expect(sheetOffences('.a { padding: 4px; }')).toEqual([
      '4px is written out rather than read from the scale in tokens.css',
    ])
  })
})

describe('the scaled-property table', () => {
  it('rejects a raw length written under each family it names', () => {
    const reasons = SCALED.map((property) => sheetOffences(`.a { ${property}: 37px; }`))
    expect(reasons).toEqual(SCALED.map(() => ['37px is written out rather than read from the scale in tokens.css']))
  })

  it('names the grid families apart, because a track is a layout rather than a space', () => {
    for (const property of ['grid-template-columns', 'grid-template-rows']) {
      expect(sheetOffences(`.a { ${property}: 37px 1fr; }`)).toEqual([
        `hardcoded-grid: 37px in ${property} belongs to the scale in tokens.css`,
      ])
    }
  })

  it('says nothing about a property whose length decides no spacing', () => {
    const unscaled = ['transform', 'box-shadow', 'stroke-width', 'flex-basis', 'text-indent', 'background-position']
    expect(unscaled.map((property) => sheetOffences(`.a { ${property}: 37px; }`))).toEqual(unscaled.map(() => []))
  })
})

describe('the focus-ring tables', () => {
  it('name every property and every blank value a fixture drives, and no more', () => {
    const properties: string[] = [...RINGS]
    const blanks: string[] = [...BLANKS]
    expect(properties.toSorted()).toEqual([...RING_PROPERTIES].toSorted())
    expect(blanks.toSorted()).toEqual([...BLANK_VALUES].toSorted())
  })

  it('reads a ring painted by each property that can paint one', () => {
    const painted = RINGS.map((property) =>
      unringedSelectors(`.a { outline: none; }\n.a:focus-visible { ${property}: 2px solid red; }`),
    )
    expect(painted).toEqual(RINGS.map(() => []))
  })

  it('reads a ring hidden by each value that paints nothing, on each property that can hide one', () => {
    const hiding = ['outline', 'outline-style'].flatMap((property) =>
      BLANKS.map((value) => unringedSelectors(`.a { ${property}: ${value}; }`)),
    )
    expect(hiding).toEqual(hiding.map(() => ['.a']))
  })

  it('reads no hiding out of a property that cannot switch the outline off', () => {
    // A zero-width outline or an absent shadow is not the user agent's ring
    // being switched off; only the shorthand and the style do that.
    expect(unringedSelectors('.a { outline-width: 0; }')).toEqual([])
    expect(unringedSelectors('.a { box-shadow: none; }')).toEqual([])
  })

  it('reads a value however it is cased, since CSS keywords are case-insensitive', () => {
    expect(unringedSelectors('.a { outline: NONE; }')).toEqual(['.a'])
  })

  it('reads no ring out of a declaration with no value at all', () => {
    expect(unringedSelectors('.a { outline: ; }')).toEqual([])
  })
})

/** The reason a remote asset is refused. */
const REMOTE_ASSET = 'a remote URL loads an asset no local install ships; ship the asset in the bundle'

describe('the remote-asset rules', () => {
  it('reject every way a URL can reach outside the bundle', () => {
    // Each spelling is a separate way past: the scheme may be absent, the
    // quote may be absent, and the space after the parenthesis may be either.
    expect(sheetOffences(`.a { background: url("${remoteHost()}/bg.png"); }`)).toEqual([REMOTE_ASSET])
    expect(sheetOffences(`.a { background: url(${remoteHost()}/bg.png); }`)).toEqual([REMOTE_ASSET])
    expect(sheetOffences(`.a { background: url(  "${remoteHost()}/bg.png"); }`)).toEqual([REMOTE_ASSET])
    expect(sheetOffences(`.a { background: url("${joined('ht', 'tp://cdn.example.com')}/bg.png"); }`)).toEqual([
      REMOTE_ASSET,
    ])
    expect(sheetOffences('.a { background: url("//cdn.example.com/bg.png"); }')).toEqual([REMOTE_ASSET])
    expect(sheetOffences('.a { background: URL("//cdn.example.com/bg.png"); }')).toEqual([REMOTE_ASSET])
  })

  it('allow an asset the bundle ships', () => {
    const local = ['url("./bg.png")', 'url(../assets/bg.svg)', "url('/bg.png')", 'url("data:image/svg+xml,<svg/>")']
    expect(local.map((value) => sheetOffences(`.a { background: ${value}; }`))).toEqual(local.map(() => []))
  })
})

describe('the viewport-unit rule', () => {
  it('names the unit it found, whole, so a partial read is visible', () => {
    // A reader that matched only part of the number reports a different unit
    // than the one written, which is the only way the two are told apart.
    expect(sheetOffences('.a { height: 100.25vh; }')).toEqual([
      '100.25vh is measured against a viewport the reader may not have; use the dynamic unit dvh',
    ])
    expect(sheetOffences('.a { width: 33vw; }')).toEqual([
      '33vw is measured against a viewport the reader may not have; use the dynamic unit dvw',
    ])
  })

  it('says nothing about a unit that tracks what is actually visible', () => {
    const dynamic = ['100dvh', '100dvw', '100svh', '100lvh', '100%', '100em']
    expect(dynamic.map((value) => sheetOffences(`.a { height: ${value}; }`))).toEqual(dynamic.map(() => []))
  })
})

describe('the stacking-order rule', () => {
  it('rejects an order written as a bare number, positive, negative or zero', () => {
    const why = 'a stacking order belongs to the z-index scale in tokens.css'
    for (const value of ['5', '-1', '0', '9999']) expect(sheetOffences(`.a { z-index: ${value}; }`)).toEqual([why])
  })

  it('allows an order read from the scale, and the keyword that names none', () => {
    expect(sheetOffences('.a { z-index: var(--dsh-z-menu); }')).toEqual([])
    expect(sheetOffences('.a { z-index: auto; }')).toEqual([])
  })
})

describe('the rules that read a whole value', () => {
  it('reads a stacking order only where the whole value is one', () => {
    // Anchored at both ends: a value that merely opens or closes with digits
    // is not a stacking order, and reporting it as one would be a false alarm
    // on a value the scale does not own.
    expect(sheetOffences('.a { z-index: 2 3; }')).toEqual([])
  })

  it('names every length a declaration writes, not only the first', () => {
    expect(sheetOffences('.a { padding: 10px 12px; }')).toEqual([
      '10px, 12px is written out rather than read from the scale in tokens.css',
    ])
    expect(sheetOffences('.a { grid-template-columns: 100px 1fr 48px; }')).toEqual([
      'hardcoded-grid: 100px, 48px in grid-template-columns belongs to the scale in tokens.css',
    ])
  })
})

describe('the alignment rule', () => {
  it('rejects a physical or justified alignment, and nothing else', () => {
    const why = 'justified or physical text alignment is an alignment defect; use text-align start or end'
    for (const value of ['left', 'right', 'justify', 'justify-all']) {
      expect(sheetOffences(`.a { text-align: ${value}; }`)).toEqual([why])
    }
    for (const value of ['start', 'end', 'center', 'inherit']) {
      expect(sheetOffences(`.a { text-align: ${value}; }`)).toEqual([])
    }
  })

  it('says nothing about another property whose value happens to read the same', () => {
    // The rule is about how text is set, not about the word `left`: an
    // alignment of boxes and the origin of a background image both use it.
    expect(sheetOffences('.a { align-items: start; }')).toEqual([])
    expect(sheetOffences('.a { background-position: left; }')).toEqual([])
    expect(sheetOffences('.a { justify-content: right; }')).toEqual([])
  })
})

describe('the custom-property rule', () => {
  it('names every length the property holds, not only the first', () => {
    expect(sheetOffences('.a { --probe: 10px 12px; }')).toEqual([
      '10px, 12px is written out rather than read from the scale in tokens.css',
    ])
  })
})
