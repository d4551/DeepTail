/**
 * The stylesheet gate's typographic rule, driven both ways.
 *
 * `font-size` and `line-height` are lengths, so the scale rule reads them. A
 * weight and a tracking are neither lengths nor colours, so nothing read them
 * at all: seven weights and two trackings sat written out across five sheets,
 * and a heading could carry one emphasis in one region and another elsewhere
 * with nothing in the tree saying which was meant. A tracking in `em` was even
 * asserted as allowed, on the reasoning that `em` is a relative length no scale
 * can name — which is true of a width and false of a tracking.
 *
 * Fixtures are assembled here rather than read off the shipped sheets, so the
 * rule is proved by what it rejects as much as by what it lets through.
 */

import { describe, expect, it } from 'bun:test'
import { sheetOffences } from './fixtures.ts'

describe('the typographic rule rejects', () => {
  it('a weight written out, whether as a number or as a keyword', () => {
    expect(sheetOffences('.a { font-weight: 600; }')).toHaveLength(1)
    expect(sheetOffences('.a { font-weight: 500; }')).toHaveLength(1)
    expect(sheetOffences('.a { font-weight: bold; }')).toHaveLength(1)
  })

  it('a tracking written out, in the relative unit a scale still names', () => {
    expect(sheetOffences('.a { letter-spacing: 0.08em; }')).toHaveLength(1)
    expect(sheetOffences('.a { letter-spacing: 0.04em; }')).toHaveLength(1)
    expect(sheetOffences('.a { letter-spacing: 1px; }')).toHaveLength(1)
  })

  it('says which value it refused and where the scale lives', () => {
    expect(sheetOffences('.a { font-weight: 600; }')).toEqual([
      '600 in font-weight is written out rather than read from the scale in tokens.css',
    ])
  })
})

describe('the typographic rule allows', () => {
  it('a weight and a tracking read from the scale', () => {
    expect(sheetOffences('.a { font-weight: var(--dsh-weight-semibold); }')).toEqual([])
    expect(sheetOffences('.a { font-weight: var(--dsh-weight-medium); }')).toEqual([])
    expect(sheetOffences('.a { letter-spacing: var(--dsh-tracking-wide); }')).toEqual([])
    expect(sheetOffences('.a { letter-spacing: var(--dsh-tracking-wider); }')).toEqual([])
  })

  it('the two spellings that pick nothing of their own', () => {
    // `inherit` takes the decision from the box above, and `normal` is the
    // initial value a reset states on purpose. Neither chooses an emphasis, so
    // neither is a decision this scale has to hold.
    expect(sheetOffences('.a { font-weight: inherit; }')).toEqual([])
    expect(sheetOffences('.a { letter-spacing: normal; }')).toEqual([])
  })

  it('the scale’s own definitions, which are where the values are stated', () => {
    // The token sheet declares these on custom properties, so the rule never
    // reads them as a weight or a tracking — a definition is not a decision
    // taken twice.
    const tokens = 'apps/deeptail/src/styles/tokens.css'
    expect(sheetOffences(':root { --dsh-weight-semibold: 600; }', tokens)).toEqual([])
    expect(sheetOffences(':root { --dsh-tracking-wide: 0.04em; }', tokens)).toEqual([])
  })
})
