/**
 * Every shape a rule reads through, pinned one node type at a time.
 *
 * `unwrap` is what lets a rule be written about an expression rather than about
 * the punctuation around it: brackets, an `as`-expression, a `satisfies`, a
 * non-null assertion and an instantiation each change nothing about the value,
 * and a rule that read the outermost node would be one line of punctuation away
 * from being switched off. The set of shapes it steps through is therefore part
 * of every ban in this repository, so each member is a case here: a member
 * dropped from the set is a ban that stops matching, and nothing else in the
 * suite would say so.
 */

import { describe, expect, it } from 'bun:test'
import { fieldOf, isNode, parseScript, unwrap } from '../scripts/ast.ts'
import { parsedBody } from './fixtures.ts'

/** A source that declares a type parameter, so an instantiation is legal. */
const GENERIC = 'declare function go<T>(value: T): T\n'

/**
 * The initializer of the first declaration in a source.
 * @param source - a source declaring `const a = …`.
 * @returns the field the initializer sits under.
 */
function init(source: string): Parameters<typeof unwrap>[0] {
  const declaration = parsedBody(source).find((node) => Array.isArray(node['declarations']))
  const declarator = Array.isArray(declaration?.['declarations']) ? declaration['declarations'][0] : undefined
  return fieldOf(declarator, 'init')
}

/**
 * The node type a declarator's initializer unwraps to.
 * @param source - a source whose declaration follows the type parameter.
 * @returns the innermost node's type, or undefined when it holds no node.
 */
function inner(source: string): string | undefined {
  const found = unwrap(init(`${GENERIC}${source}`))
  return isNode(found) ? found.type : undefined
}

describe('every shape that changes nothing about the value it holds', () => {
  it('steps through brackets, which are punctuation rather than a value', () => {
    expect(inner('const a = (1)')).toBe('Literal')
    expect(inner('const a = (((1)))')).toBe('Literal')
  })

  it('steps through an as-expression, which claims a shape rather than making one', () => {
    expect(inner('const a = (1 as number)')).toBe('Literal')
  })

  it('steps through a satisfies-expression, which narrows rather than converts', () => {
    expect(inner('const a = (1 satisfies number)')).toBe('Literal')
  })

  it('steps through a non-null assertion, which overrides the checker and not the tree', () => {
    expect(inner('const a = (1!)')).toBe('Literal')
  })

  it('steps through an instantiation, which supplies types and no arguments', () => {
    // `go<number>` with no call is an instantiation expression: the type
    // arguments sit on the value, which is still the function. The node is what
    // the parse carries, and a rule written about a call reached this way reads
    // the function through it.
    const source = `${GENERIC}const a = go<number>`
    expect(parseScript('probe.ts', source).errors).toEqual([])
    const initializer = init(source)
    expect(isNode(initializer) ? initializer.type : undefined).toBe('TSInstantiationExpression')
    expect(inner('const a = go<number>')).toBe('Identifier')
  })

  it('steps through a stack of different shapes, not only a run of one', () => {
    expect(inner('const a = ((go<number>) as never)')).toBe('Identifier')
  })
})

describe('the values that are not wrapped in anything', () => {
  it('leaves a value that is already the expression alone', () => {
    expect(unwrap('a string')).toBe('a string')
    expect(unwrap(0)).toBe(0)
    expect(unwrap(false)).toBe(false)
    expect(unwrap(null)).toBeNull()
  })

  it('leaves a list alone, which is not a node whatever it holds', () => {
    expect(unwrap([1, 2])).toEqual([1, 2])
  })

  it('leaves a node that carries a value alone, so the rule still judges it', () => {
    // Every shape above is transparent. A call is not: unwrapping one would
    // hand a rule the callee and hide the call the rule is written about.
    expect(inner('const a = go(1)')).toBe('CallExpression')
  })
})

describe('the depth a value is read to', () => {
  it('reads through a run of brackets exactly as deep as the cap', () => {
    expect(inner(`const a = ${'('.repeat(32)}1${')'.repeat(32)}`)).toBe('Literal')
  })

  it('stops at the cap rather than spinning on a tree nested deeper than it', () => {
    // A walk with no bound is a gate that does not return, and a gate that does
    // not return never reports. One bracket past the cap comes back as the
    // bracket, which a rule reads as opaque rather than as the value.
    expect(inner(`const a = ${'('.repeat(33)}1${')'.repeat(33)}`)).toBe('ParenthesizedExpression')
  })
})
