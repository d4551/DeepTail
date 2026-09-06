/**
 * Every way a name can be assembled, and what the folder makes of it.
 *
 * Constant folding is what closes the assembled-name routes: a name split with
 * `+`, built in a template, spelt from character codes, case-shifted, joined
 * out of an array or simply held in a well-named constant is the same name, and
 * a gate that cannot fold one of them is a gate that can be spelt around that
 * way. Each form is a separate route, so each is a case.
 */

import { describe, expect, it } from 'bun:test'
import { type Field, fieldOf } from '../scripts/ast.ts'
import { approximateString, constants, staticString, UNREADABLE } from '../scripts/fold.ts'
import { namesOf, nodeOfType, parsedBody } from './fixtures.ts'

/**
 * What the folder makes of one fixture's binding.
 * @param source - a source declaring `const subject = …`.
 * @returns the folded value, or undefined.
 */
function folded(source: string): string | undefined {
  return constants(parsedBody(source)).get('subject') ?? undefined
}

/**
 * What the folder makes of one fixture's binding, read against the file's own
 * constants — which is how every gate folds: the table is built once, then
 * each expression is folded against it.
 * @param source - a source declaring `const subject = …`.
 * @returns the folded value, or undefined.
 */
function read(source: string): string | undefined {
  const subject = parsedBody(source)
    .flatMap((statement) => (Array.isArray(statement.declarations) ? statement.declarations : []))
    .find((declarator) => nameOf(declarator) === 'subject')
  return staticString(namesOf(source).constants, fieldOf(subject, 'init'))
}

/**
 * The name a declarator binds, when it binds one plainly.
 * @param declarator - the declarator.
 * @returns the name, or undefined.
 */
function nameOf(declarator: Field): string | undefined {
  const id = fieldOf(declarator, 'id')
  const name = fieldOf(id, 'name')
  return typeof name === 'string' ? name : undefined
}

/**
 * What the folder can read of one fixture's binding, gaps and all.
 * @param source - a source declaring `const subject = …`.
 * @returns the approximation, or undefined.
 */
function approximated(source: string): string | undefined {
  const declarator = nodeOfType(source, 'VariableDeclarator')
  return approximateString(namesOf(source).constants, declarator.init)
}

describe('the folder reads a name however it is assembled', () => {
  it('reads a plain literal, and nothing out of a literal that is not a string', () => {
    expect(folded('const subject = "style"')).toBe('style')
    expect(folded('const subject = 1')).toBeUndefined()
    expect(folded('const subject = true')).toBeUndefined()
    expect(folded('const subject = null')).toBeUndefined()
  })

  it('reads a template, with and without interpolation', () => {
    expect(folded('const subject = `style`')).toBe('style')
    expect(folded('const subject = `sty${"le"}`')).toBe('style')
    expect(read('const part = "le"\nconst subject = `sty${part}`')).toBe('style')
    expect(folded('const subject = `sty${unknown}`')).toBeUndefined()
    expect(folded('const subject = `a${"b"}c${"d"}e`')).toBe('abcde')
  })

  it('reads concatenation, however deeply it nests, and only of the operator that joins', () => {
    expect(folded('const subject = "sty" + "le"')).toBe('style')
    expect(folded('const subject = "s" + ("ty" + ("l" + "e"))')).toBe('style')
    expect(folded('const subject = "sty" + unknown')).toBeUndefined()
    expect(folded('const subject = "sty" - "le"')).toBeUndefined()
  })
})

describe('the folder reads a name a call assembles from parts', () => {
  it('reads a case shift, in both directions', () => {
    expect(folded('const subject = "STYLE".toLowerCase()')).toBe('style')
    expect(folded('const subject = "style".toUpperCase()')).toBe('STYLE')
    expect(folded('const subject = unknown.toLowerCase()')).toBeUndefined()
  })

  it('reads characters spelt from their codes, by either spelling', () => {
    expect(folded('const subject = String.fromCharCode(115, 116, 121, 108, 101)')).toBe('style')
    expect(folded('const subject = String.fromCodePoint(115, 116, 121, 108, 101)')).toBe('style')
    // `fromCharCode` truncates each argument to sixteen bits, and the folder
    // has to truncate with it or read a different character than the source
    // produces.
    expect(folded('const subject = String.fromCharCode(65601)')).toBe('A')
    expect(folded('const subject = String.fromCodePoint(65601)')).toBe('\u{10041}')
    expect(folded('const subject = String.fromCharCode(code)')).toBeUndefined()
    expect(folded('const subject = String.fromCharCode("115")')).toBeUndefined()
  })

  it('reads a concatenation written as a call', () => {
    expect(folded('const subject = "sty".concat("l", "e")')).toBe('style')
    expect(folded('const subject = "sty".concat(unknown)')).toBeUndefined()
  })

  it('reads an array joined, with and without a separator', () => {
    expect(folded(`const subject = ['s', 't', 'y', 'l', 'e'].join('')`)).toBe('style')
    expect(folded(`const subject = ['a', 'b'].join('-')`)).toBe('a-b')
    expect(folded(`const subject = ['a', 'b'].join()`)).toBe('ab')
    expect(folded(`const subject = ['a', unknown].join('')`)).toBeUndefined()
    expect(folded(`const subject = ['a'].join(unknown)`)).toBeUndefined()
    expect(folded('const subject = source.join("")')).toBeUndefined()
  })
})

describe('the folder reads a name a call assembles', () => {
  it('reads a name held in another constant, once the table is built', () => {
    expect(read('const a = "style"\nconst subject = a')).toBe('style')
    expect(read('const subject = unknown')).toBeUndefined()
    // A constant assembled out of another is folded where it is read: the
    // table itself is built against an empty environment, in one pass.
    expect(read('const a = "sty"\nconst b = a + "le"\nconst subject = b')).toBeUndefined()
  })

  it('reads no name out of a call the folder does not know', () => {
    expect(folded('const subject = "style".repeat(2)')).toBeUndefined()
    expect(folded('const subject = decode("style")')).toBeUndefined()
    expect(folded('const subject = new String("style")')).toBeUndefined()
  })

  it('reads through the brackets and assertions a value can be wrapped in', () => {
    expect(folded('const subject = ("style")')).toBe('style')
    expect(folded('const subject = "style" as const')).toBe('style')
  })
})

describe('the constant table', () => {
  it('records only what a const binds to a string it can fold', () => {
    const env = constants(parsedBody('const a = "x"\nlet b = "y"\nconst c = unknown\nconst { d } = source'))
    expect([...env]).toEqual([['a', 'x']])
  })

  it('marks a name bound twice to different strings as undecided rather than picking one', () => {
    // Two declarations of one name, in two scopes, is a name that is neither
    // value. Reporting either would be a rule stated about source that does
    // not exist.
    const env = constants(parsedBody('const a = "x"\nfunction f() { const a = "y"; return a }'))
    expect(env.get('a')).toBeNull()
  })

  it('keeps a name bound twice to the same string', () => {
    const env = constants(parsedBody('const a = "x"\nfunction f() { const a = "x"; return a }'))
    expect(env.get('a')).toBe('x')
  })

  it('folds a later constant against nothing, so a declaration cannot read one after it', () => {
    // The table is built in one pass with an empty environment, so a constant
    // assembled out of another is folded where it is read rather than where it
    // is written.
    expect(
      staticString(constants(parsedBody('const a = "x"\nconst b = a')), nodeOfType('const b = a', 'Identifier')),
    ).toBeUndefined()
  })
})

describe('the approximate reader', () => {
  it('reads what it can of a template and stands in for the rest', () => {
    expect(approximated('const subject = `a${unknown}b`')).toBe(`a${UNREADABLE}b`)
    expect(approximated('const subject = `${unknown}`')).toBe(UNREADABLE)
    expect(approximated('const subject = `plain`')).toBe('plain')
  })

  it('reads what it can of a concatenation and stands in for the rest', () => {
    expect(approximated('const subject = "a" + unknown')).toBe(`a${UNREADABLE}`)
    expect(approximated('const subject = unknown + "b"')).toBe(`${UNREADABLE}b`)
    expect(approximated('const subject = unknown + other')).toBe(`${UNREADABLE}${UNREADABLE}`)
  })

  it('reads a nested approximation, so a gap deep inside is still only a gap', () => {
    expect(approximated('const subject = `a${`b${unknown}c`}d`')).toBe(`ab${UNREADABLE}cd`)
  })

  it('answers exactly where the whole expression folds', () => {
    expect(approximated('const subject = "a" + "b"')).toBe('ab')
  })

  it('reads nothing out of an expression that produces no string it can shape', () => {
    expect(approximated('const subject = unknown')).toBeUndefined()
    expect(approximated('const subject = "a" - unknown')).toBeUndefined()
    expect(approximated('const subject = call(unknown)')).toBeUndefined()
  })

  it('stands in with one character, so what surrounds a gap keeps its shape', () => {
    expect(UNREADABLE.length).toBe(1)
    expect(approximated('const subject = `<b x="${unknown}">`')).toBe(`<b x="${UNREADABLE}">`)
  })
})
