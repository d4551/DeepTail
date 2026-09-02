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
