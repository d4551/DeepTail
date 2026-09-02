/**
 * The sheet reader's own suite.
 *
 * The read — comments blanked with offsets preserved, rules found wherever the
 * braces sit — is shared by every gate that walks a sheet, so its behaviour is
 * stated here on its own: a rule read out of a minified single line is the
 * same rule, and prose in a comment is never one.
 */

import { describe, expect, it } from 'bun:test'
import { rulesetsOf } from '../scripts/sheet-reader.ts'

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
