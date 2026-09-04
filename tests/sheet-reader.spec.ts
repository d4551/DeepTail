/**
 * The sheet reader's own suite.
 *
 * The read — comments blanked with offsets preserved, rules found wherever the
 * braces sit — is shared by every gate that walks a sheet, so its behaviour is
 * stated here on its own: a rule read out of a minified single line is the
 * same rule, and prose in a comment is never one.
 */

import { describe, expect, it } from 'bun:test'
import { classTokensOf, rulesetsOf } from '../scripts/sheet-reader.ts'

describe('the ruleset reader', () => {
  it('reads a rule as its selector and its declarations, whitespace and all', () => {
    expect(rulesetsOf('.a,\n.b {\n  color:  red;\n}')).toEqual([{ selector: '.a, .b', body: 'color: red;', line: 1 }])
  })

  it('reads no rule out of a comment, so prose cannot be a duplicate', () => {
    expect(rulesetsOf('/* .a { color: red } */\n.b { color: blue; }')).toEqual([
      { selector: '.b', body: 'color: blue;', line: 2 },
    ])
  })
})

describe('the class-vocabulary reader', () => {
  it('reads every class a selector compounds, once each', () => {
    expect(classTokensOf('.row.session-open:hover, .dialog .row-action:focus { color: red; }')).toEqual([
      'row',
      'session-open',
      'dialog',
      'row-action',
    ])
  })

  it('reads no class out of a comment, so prose cannot widen the vocabulary', () => {
    expect(classTokensOf('/* .ghost is not a class */\n.real { color: blue; }')).toEqual(['real'])
  })

  it('reads none out of a declaration value, which styles nothing', () => {
    expect(classTokensOf('.a { content: ".b .c"; }')).toEqual(['a'])
  })

  it('reads none where no rule exists at all', () => {
    expect(classTokensOf('@layer base { :root { --x: 1; } }')).toEqual([])
  })
})
