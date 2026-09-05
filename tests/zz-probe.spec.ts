/**
 * Canary probes for the oxc-parser node shapes the gates' walks read.
 *
 * `scripts/ast.ts` reads names off parser records: the initializer of a
 * declaration, the source of an import, the attributes of a JSX element. A
 * parser update that renamed one of those nodes would let every rule written
 * about them silently stop matching, so each shape the walks rely on is pinned
 * here, one assertion per shape.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { parseSync } from 'oxc-parser'

describe('oxc jsx parsing', () => {
  it('emits a jsx attribute node for a string attribute', () => {
    const parsed = parseSync('probe.tsx', 'const q = <input ref="name" />')
    const statement = parsed.program.body[0]
    if (statement === undefined || statement.type !== 'VariableDeclaration') {
      throw new Error('probe.tsx: expected a variable declaration')
    }
    const declaration = statement.declarations[0]
    if (declaration === undefined) throw new Error('probe.tsx: expected a declarator')
    const init = declaration.init
    if (init === null || init === undefined || init.type !== 'JSXElement') {
      throw new Error('probe.tsx: expected a jsx element initializer')
    }
    const attribute = init.openingElement.attributes[0]
    expect(attribute?.type).toBe('JSXAttribute')
  })
})

describe('oxc module parsing', () => {
  it('emits a literal node for a string initializer and for an import source', () => {
    const parsed = parseSync('probe.tsx', 'const x = "a"\nimport y from "b"')
    const declared = parsed.program.body[0]
    if (declared === undefined || declared.type !== 'VariableDeclaration') {
      throw new Error('probe.tsx: expected a variable declaration')
    }
    const literal = declared.declarations[0]?.init
    expect(literal?.type).toBe('Literal')
    const imported = parsed.program.body[1]
    if (imported === undefined || imported.type !== 'ImportDeclaration') {
      throw new Error('probe.tsx: expected an import declaration')
    }
    expect(imported.source.type).toBe('Literal')
  })
})
