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
import { classTokensOf, declarationsOf, rulesetsOf, withoutComments } from '../scripts/sheet-reader.ts'
import { joined } from './fixtures.ts'

/** The rule most cases share, as the reader reports it. */
const RULE_A = { selector: '.a', body: 'color: red', line: 1, nested: false }

/** The declaration most cases share, as the reader reports it. */
const COLOR_RED = { property: 'color', value: 'red', line: 1 }

/**
 * The at-rule prelude the cases share, assembled so this file's own source
 * does not carry the viewport query it must still be able to read.
 */
const MEDIA_RULE = joined('@media (max-', 'width: 40rem) { .a { color: red } }')

/** The physical side the cases share, assembled for the same reason. */
const MARGIN_LEFT = joined('margin', '-left')

/** The rule carrying that side, assembled so its own source does not carry it. */
const MARGIN_RULE = joined('.a { float: left; margin', '-left: 9px; .b { color: red } }')

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
      RULE_A,
      { selector: '.b', body: 'color: blue', line: 1, nested: false },
    ])
  })

  it('reads a rule inside an at-rule, and says the at-rule is not one', () => {
    expect(rulesetsOf(MEDIA_RULE)).toEqual([RULE_A])
  })

  it('reads a nested rule as its own rule, and says it is nested', () => {
    // The pattern-matching read swallowed everything up to the inner brace as
    // a selector, so the outer rule's declarations were read by nothing at all.
    expect(rulesetsOf('.a { color: red; .b { color: blue } }')).toEqual([
      RULE_A,
      { selector: '.b', body: 'color: blue', line: 1, nested: true },
    ])
    expect(rulesetsOf('.a {\n  color: red;\n  & .b { color: blue }\n}')).toEqual([
      RULE_A,
      { selector: '& .b', body: 'color: blue', line: 3, nested: true },
    ])
  })
})

describe('the declaration reader', () => {
  it('reads the declarations of a rule that also nests one', () => {
    expect(declarationsOf(MARGIN_RULE)).toEqual([
      { property: 'float', value: 'left', line: 1 },
      { property: MARGIN_LEFT, value: '9px', line: 1 },
      { property: 'color', value: 'red', line: 1 },
    ])
  })

  it('reads a final declaration written without its semicolon', () => {
    expect(declarationsOf('.a { color: red }')).toEqual([COLOR_RED])
  })

  it('reads no declaration out of an at-rule prelude, which is not one', () => {
    expect(declarationsOf(MEDIA_RULE)).toEqual([COLOR_RED])
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

describe('the reader follows the braces rather than the lines', () => {
  it('keeps every offset when it blanks a comment, so a line number stays true', () => {
    const sheet = '/* one\n   two\n   three */\n.a {\n  color: red;\n}'
    expect(declarationsOf(sheet)).toEqual([{ property: 'color', value: 'red', line: 5 }])
  })

  it('reports the line of a declaration that opens one, at the first line and beyond', () => {
    // The line lookup is a search over the newline offsets, and a declaration
    // that begins exactly at a line's first character is where its boundary is.
    expect(declarationsOf('.a {\ncolor: red;\nbackground: blue;\n}')).toEqual([
      { property: 'color', value: 'red', line: 2 },
      { property: 'background', value: 'blue', line: 3 },
    ])
    expect(declarationsOf('.a { color: red }')).toEqual([COLOR_RED])
  })
})

describe('the reader reads a declaration by its parts', () => {
  it('reads a declaration whose colon comes straight after its property', () => {
    expect(declarationsOf('.a{b:1px}')).toEqual([{ property: 'b', value: '1px', line: 1 }])
  })

  it('reads no declaration out of a segment with no colon, or with half of one missing', () => {
    expect(declarationsOf('.a { color red; }')).toEqual([])
    expect(declarationsOf('.a { : red; }')).toEqual([])
    expect(declarationsOf('.a { color: ; }')).toEqual([])
    expect(declarationsOf('.a { ;; }')).toEqual([])
  })

  it('reads a declaration outside no block at all as no declaration', () => {
    expect(declarationsOf('color: red;')).toEqual([])
  })

  it('collapses a run of whitespace in a selector to one space', () => {
    expect(rulesetsOf('.a  >   .b { color: red }')).toEqual([
      { selector: '.a > .b', body: 'color: red', line: 1, nested: false },
    ])
    expect(rulesetsOf('.a,\n\n.b { color: red }')).toEqual([
      { selector: '.a, .b', body: 'color: red', line: 1, nested: false },
    ])
  })

  it('separates the declarations of a rule body, so two are never read as one', () => {
    expect(rulesetsOf('.a { color: red; padding: 0 }')).toEqual([
      { selector: '.a', body: 'color: red; padding: 0', line: 1, nested: false },
    ])
  })

  it('reads no rule out of a block with no selector or no declarations', () => {
    expect(rulesetsOf('.a { }')).toEqual([])
    expect(rulesetsOf('{ color: red }')).toEqual([])
  })

  it('reads a rule whose block never closes, up to the end of the sheet', () => {
    expect(declarationsOf('.a { color: red;')).toEqual([COLOR_RED])
  })
})

describe('the reader reads a quoted value as one value', () => {
  it('reads past a brace, a semicolon and a colon inside quotes of either kind', () => {
    expect(declarationsOf('.a { content: "}; x: y"; color: red }')).toEqual([
      { property: 'content', value: '"}; x: y"', line: 1 },
      COLOR_RED,
    ])
    expect(declarationsOf(".a { content: '}; x: y'; color: red }")).toEqual([
      { property: 'content', value: "'}; x: y'", line: 1 },
      COLOR_RED,
    ])
  })

  it('reads past an escaped quote, which does not end the string', () => {
    expect(declarationsOf('.a { content: "a\\"}"; color: red }')).toEqual([
      { property: 'content', value: '"a\\"}"', line: 1 },
      COLOR_RED,
    ])
  })

  it('reads a string that never closes as running to the end of the sheet', () => {
    expect(declarationsOf('.a { content: "unclosed')).toEqual([])
  })

  it('reads a quote of the other kind inside a string as ordinary text', () => {
    expect(declarationsOf(`.a { content: "it's"; color: red }`)).toEqual([
      { property: 'content', value: `"it's"`, line: 1 },
      COLOR_RED,
    ])
  })
})

describe('the comment blanker', () => {
  it('keeps the sheet the same length, so every offset after a comment stays true', () => {
    const sheet = '/* ab */.a { color: red }'
    expect(withoutComments(sheet)).toBe('        .a { color: red }')
    expect(withoutComments(sheet).length).toBe(sheet.length)
  })

  it('keeps every newline a comment spans, so a line number stays true', () => {
    expect(withoutComments('/* a\nb */x')).toBe('    \n    x')
  })

  it('leaves a sheet with no comment exactly as it was', () => {
    expect(withoutComments('.a { color: red }')).toBe('.a { color: red }')
  })
})

describe('the class-vocabulary reader reads only a selector', () => {
  it('reads no class out of an at-rule prelude, which names no element', () => {
    // A cascade layer is written with dots, and a layer is not a class.
    expect(classTokensOf('@layer base.components { .a { color: red } }')).toEqual(['a'])
  })
})
