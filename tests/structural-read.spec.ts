/**
 * The readers that decide what a field of a parsed node holds.
 *
 * Every scope walk in this repository is built out of these three: `fieldOf`
 * says what a key carries, `nodeAt` says which keys carry exactly one node, and
 * `nodesAt` says which carry a list of them. Each answer is load-bearing — a
 * declaration list read as a single node binds nothing, a key carrying `0` or
 * `false` read as absent drops a binding the source wrote — so each is stated
 * here once, for the readers built on it rather than for the names that use it.
 *
 * `nodeAt` and `nodesAt` are what `free-names.ts` binds every declaration form
 * through; neither was driven anywhere before this file.
 */

import { describe, expect, it } from 'bun:test'
import { fieldOf, type Node, nodeAt, nodesAt, parseScript } from '../scripts/ast.ts'

/** A declaration carrying two declarators, each with an initializer. */
const SOURCE = 'const first = 1, second = 2'

/**
 * The first statement of a parsed source.
 * @param text - the source.
 * @returns the statement.
 */
function statement(text: string): Node {
  const parsed = parseScript('fixture.ts', text)
  const found = parsed.body[0]
  if (found === undefined) throw new Error(`fixture carries no statement: ${text}`)
  return found
}

/**
 * The first declarator of a parsed source.
 * @param text - the source.
 * @returns the declarator.
 */
function declarator(text: string): Node {
  const found = nodesAt(statement(text), 'declarations')[0]
  if (found === undefined) throw new Error(`fixture carries no declarator: ${text}`)
  return found
}

describe('the reader for a key that carries one node', () => {
  it('reads the node that key holds', () => {
    expect(nodeAt(declarator(SOURCE), 'id')?.type).toBe('Identifier')
    expect(nodeAt(declarator(SOURCE), 'init')?.type).toBe('Literal')
  })

  it('reads no node out of a key that carries a list', () => {
    // A declaration's declarators are a list. Read as one node, a scope walk
    // binds the list and not the names inside it, which is a binding form the
    // reader would never see.
    expect(nodeAt(statement(SOURCE), 'declarations')).toBeUndefined()
  })

  it('reads no node out of a key that carries something that is not one', () => {
    const declaration = statement(SOURCE)
    expect(nodeAt(declaration, 'kind')).toBeUndefined()
    expect(nodeAt(declaration, 'missing')).toBeUndefined()
  })

  it('reads no node out of a value that is not a holder at all', () => {
    expect(nodeAt(null, 'id')).toBeUndefined()
    expect(nodeAt('a string', 'id')).toBeUndefined()
    expect(nodeAt([{ type: 'Identifier' }], 'id')).toBeUndefined()
  })
})

describe('the reader for a key that carries a list of nodes', () => {
  it('reads every node the list holds, in the order it holds them', () => {
    expect(nodesAt(statement(SOURCE), 'declarations').map((node) => node.type)).toEqual([
      'VariableDeclarator',
      'VariableDeclarator',
    ])
  })

  it('reads only the members that are nodes, and steps over the ones that are not', () => {
    // A destructuring pattern may carry a hole where a name was skipped. A walk
    // that claimed every member was a node would descend into the absent one.
    const pattern = nodeAt(declarator('const [first, , ...rest] = source'), 'id')
    expect(nodesAt(pattern, 'elements').map((node) => node.type)).toEqual(['Identifier', 'RestElement'])
  })

  it('reads no list out of a key that carries one node', () => {
    // The other direction: a key carrying a single node is not a list of one,
    // and reading it as one would make a walk descend twice into the same name.
    expect(nodesAt(declarator(SOURCE), 'id')).toEqual([])
  })

  it('reads an empty list out of every key that carries none', () => {
    const declaration = statement(SOURCE)
    expect(nodesAt(declaration, 'missing')).toEqual([])
    expect(nodesAt(declaration, 'kind')).toEqual([])
    expect(nodesAt(null, 'declarations')).toEqual([])
    expect(nodesAt('a string', 'declarations')).toEqual([])
  })
})

describe('the reader for a key that carries a value', () => {
  it('keeps a value that is present and false-looking rather than reading it as absent', () => {
    // `?? null` is about absence, not about truth: a key written as `0`,
    // `false` or an empty string is a key the source wrote, and reading any of
    // them as absent drops a binding, a flag or a name.
    expect(fieldOf({ type: 'Literal', value: 0 }, 'value')).toBe(0)
    expect(fieldOf({ type: 'Literal', value: false }, 'value')).toBe(false)
    expect(fieldOf({ type: 'Literal', value: '' }, 'value')).toBe('')
  })

  it('reads a key written as nothing at all as absent', () => {
    expect(fieldOf({ type: 'Literal', value: null }, 'value')).toBeNull()
  })
})
