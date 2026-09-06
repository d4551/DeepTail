/**
 * The sheet reader's own suite.
 *
 * The read — comments blanked with offsets preserved, blocks found by
 * following the braces — is shared by every gate that walks a sheet, so its
 * behaviour is stated here on its own: a rule read out of a minified single
 * line is the same rule, prose in a comment is never one, and a nested rule is
 * a rule inside a rule rather than a run of text swallowed into a selector.
 */

import { describe, expect, it } from 'bun:test'
import { classTokensOf, declarationsOf, rulesetsOf } from '../scripts/sheet-reader.ts'

describe('the ruleset reader', () => {
  it('reads a rule as its selector and its declarations, whitespace and all', () => {
    expect(rulesetsOf('.a,\n.b {\n  color:  red;\n}')).toEqual([
      { selector: '.a, .b', body: 'color: red', line: 1, nested: false },
    ])
  })

  it('reads no rule out of a comment, so prose cannot be a duplicate', () => {
    expect(rulesetsOf('/* .a { color: red } */\n.b { color: blue; }')).toEqual([
      { selector: '.b', body: 'color: blue', line: 2, nested: false },
    ])
  })

  it('reads a rule out of a minified line, where no newline separates anything', () => {
    expect(rulesetsOf('.a{color:red}.b{color:blue}')).toEqual([
      { selector: '.a', body: 'color: red', line: 1, nested: false },
      { selector: '.b', body: 'color: blue', line: 1, nested: false },
    ])
  })

  it('reads a rule inside an at-rule, and says the at-rule is not one', () => {
    expect(rulesetsOf('@media (max-width: 40rem) { .a { color: red } }')).toEqual([
      { selector: '.a', body: 'color: red', line: 1, nested: false },
    ])
  })

  it('reads a nested rule as its own rule, and says it is nested', () => {
    // The pattern-matching read swallowed everything up to the inner brace as
    // a selector, so the outer rule's declarations were read by nothing at all.
    expect(rulesetsOf('.a { color: red; .b { color: blue } }')).toEqual([
      { selector: '.a', body: 'color: red', line: 1, nested: false },
      { selector: '.b', body: 'color: blue', line: 1, nested: true },
    ])
    expect(rulesetsOf('.a {\n  color: red;\n  & .b { color: blue }\n}')).toEqual([
      { selector: '.a', body: 'color: red', line: 1, nested: false },
      { selector: '& .b', body: 'color: blue', line: 3, nested: true },
    ])
  })
})

describe('the declaration reader', () => {
  it('reads the declarations of a rule that also nests one', () => {
    expect(declarationsOf('.a { float: left; margin-left: 9px; .b { color: red } }')).toEqual([
      { property: 'float', value: 'left', line: 1 },
      { property: 'margin-left', value: '9px', line: 1 },
      { property: 'color', value: 'red', line: 1 },
    ])
  })

  it('reads a final declaration written without its semicolon', () => {
    expect(declarationsOf('.a { color: red }')).toEqual([{ property: 'color', value: 'red', line: 1 }])
  })

  it('reads no declaration out of an at-rule prelude, which is not one', () => {
    expect(declarationsOf('@media (max-width: 40rem) { .a { color: red } }')).toEqual([
      { property: 'color', value: 'red', line: 1 },
    ])
    expect(declarationsOf("@import url('./x.css');")).toEqual([])
  })

  it('reads no syntax out of a quoted string', () => {
    expect(declarationsOf('.a { content: "}; color: red"; }')).toEqual([
      { property: 'content', value: '"}; color: red"', line: 1 },
    ])
  })

  it('reports the line each declaration is written on', () => {
    expect(declarationsOf('.a {\n  color: red;\n\n  padding: 0;\n}')).toEqual([
      { property: 'color', value: 'red', line: 2 },
      { property: 'padding', value: '0', line: 4 },
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

  it('reads a nested selector, which names a class as much as any other', () => {
    expect(classTokensOf('.outer { .inner { color: red } }')).toEqual(['outer', 'inner'])
  })
})
