/**
 * How a rule reads a name, and what a rename can do to it.
 *
 * Every ban in this repository is written about a name — `document`, `Array`,
 * `it` — and a name is exactly what a `const`, an import alias or a pair of
 * brackets can change without changing what runs. The readers below are what
 * stops a rename from being a way past every rule at once, so each is driven
 * here rather than only through the rules that consult it.
 */

import { describe, expect, it } from 'bun:test'
import { aliases } from '../scripts/aliases.ts'
import { fieldOf, isNode, memberName, parseScript, unwrap, walk } from '../scripts/ast.ts'
import { callsGlobal, callsMethod, identifier, literalKey, property } from '../scripts/rule-helpers.ts'
import { namesOf, nodeOfType, parsedBody } from './fixtures.ts'

/**
 * Whether a fixture's first call reaches the named global.
 * @param text - the source.
 * @param name - the global's name.
 * @returns what the reader answered.
 */
function reachesGlobal(text: string, name: string): boolean {
  return callsGlobal(nodeOfType(text, 'CallExpression'), name, namesOf(text))
}

/**
 * Whether a fixture's first call reaches one of the named methods on a host.
 * @param text - the source.
 * @param host - the object's name.
 * @param methods - the method names.
 * @returns what the reader answered.
 */
function reachesMethod(text: string, host: string, methods: readonly string[]): boolean {
  return callsMethod(nodeOfType(text, 'CallExpression'), host, methods, namesOf(text))
}

/** Nothing renamed and nothing folded, for a reader that needs neither. */
const PLAIN = { aliases: new Map<string, string>(), constants: new Map<string, string | null>() }

describe('the alias table', () => {
  it('records a constant that stands for another name', () => {
    expect([...aliases(parsedBody('const d = document'))]).toEqual([['d', 'document']])
  })

  it('records an import renamed on its way in, and not one that keeps its name', () => {
    expect([...aliases(parsedBody("import { it as check } from './x.ts'"))]).toEqual([['check', 'it']])
    expect([...aliases(parsedBody("import { it } from './x.ts'"))]).toEqual([])
  })

  it('records a string-named import, which is how a name that is not an identifier arrives', () => {
    expect([...aliases(parsedBody('import { "it" as check } from "./x.ts"'))]).toEqual([['check', 'it']])
  })

  it('follows a chain of renames to the name at the end of it', () => {
    expect([...aliases(parsedBody('const a = document\nconst b = a\nconst c = b'))].toSorted()).toEqual([
      ['a', 'document'],
      ['b', 'document'],
      ['c', 'document'],
    ])
  })

  it('stops rather than spinning where a chain closes on itself', () => {
    // Two constants that stand for each other is not source anyone writes, but
    // a reader that followed it would not stop, and a gate that does not
    // return is a gate that never reports. The walk is capped, so each name
    // ends up wherever the cap left it and nothing spins.
    expect([...aliases(parsedBody('const a = b\nconst b = a'))]).toEqual([])
    expect([...aliases(parsedBody('const a = b\nconst b = c\nconst c = a'))].toSorted()).toEqual([
      ['a', 'c'],
      ['b', 'a'],
      ['c', 'b'],
    ])
  })
})

describe('the alias table records only a rename', () => {
  it('records nothing for a binding that is not one name standing for another', () => {
    expect([...aliases(parsedBody('let d = document'))]).toEqual([])
    expect([...aliases(parsedBody('var d = document'))]).toEqual([])
    expect([...aliases(parsedBody('const d = document.body'))]).toEqual([])
    expect([...aliases(parsedBody('const { body } = document'))]).toEqual([])
    expect([...aliases(parsedBody('const d = "document"'))]).toEqual([])
    expect([...aliases(parsedBody('const d = document, e = window'))].toSorted()).toEqual([
      ['d', 'document'],
      ['e', 'window'],
    ])
  })

  it('reads through the brackets and assertions a name can be wrapped in', () => {
    expect([...aliases(parsedBody('const d = (document)'))]).toEqual([['d', 'document']])
    expect([...aliases(parsedBody('const d = document as never'))]).toEqual([['d', 'document']])
  })
})

describe('the name reader', () => {
  it('reads an identifier through whatever it was renamed from', () => {
    const names = namesOf('const d = document\nd.write("x")')
    const call = nodeOfType('const d = document\nd.write("x")', 'MemberExpression')
    expect(identifier(call.object, names)).toBe('document')
  })

  it('reads an identifier written plainly, and nothing out of what is not one', () => {
    expect(identifier(nodeOfType('a.b', 'Identifier'), PLAIN)).toBe('a')
    expect(identifier(nodeOfType('a.b', 'MemberExpression'), PLAIN)).toBeUndefined()
    expect(identifier(null, PLAIN)).toBeUndefined()
  })

  it('reads a property named plainly, through brackets, and through a constant', () => {
    expect(property(nodeOfType('a.write("x")', 'MemberExpression'), PLAIN)).toBe('write')
    expect(property(nodeOfType('a["write"]("x")', 'MemberExpression'), PLAIN)).toBe('write')
    const names = namesOf('const method = "write"\na[method]("x")')
    expect(property(nodeOfType('const method = "write"\na[method]("x")', 'MemberExpression'), names)).toBe('write')
  })

  it('reads no property out of something that is not a member expression', () => {
    expect(property(nodeOfType('a.b', 'Identifier'), PLAIN)).toBeUndefined()
  })

  it('reads a string literal key, and nothing out of another kind of literal', () => {
    expect(literalKey(nodeOfType('const a = "write"', 'Literal'))).toBe('write')
    expect(literalKey(nodeOfType('const a = 1', 'Literal'))).toBeUndefined()
    expect(literalKey(nodeOfType('const a = b', 'Identifier'))).toBeUndefined()
    expect(literalKey(null)).toBeUndefined()
  })
})

describe('the call readers', () => {
  it('reads a global called directly, and through each name the global object has', () => {
    expect(reachesGlobal('fetch("/x")', 'fetch')).toBe(true)
    expect(reachesGlobal('globalThis.fetch("/x")', 'fetch')).toBe(true)
    expect(reachesGlobal('window.fetch("/x")', 'fetch')).toBe(true)
    expect(reachesGlobal('self.fetch("/x")', 'fetch')).toBe(true)
  })

  it('reads a global reached through a renamed local, and through a bracketed name', () => {
    expect(reachesGlobal('const go = fetch\ngo("/x")', 'fetch')).toBe(true)
    expect(reachesGlobal('const key = "fetch"\nwindow[key]("/x")', 'fetch')).toBe(true)
    expect(reachesGlobal('const w = window\nw.fetch("/x")', 'fetch')).toBe(true)
  })

  it('reads no global out of a method on something else, or another name entirely', () => {
    expect(reachesGlobal('client.fetch("/x")', 'fetch')).toBe(false)
    expect(reachesGlobal('fetch("/x")', 'open')).toBe(false)
    expect(callsGlobal(nodeOfType('const a = fetch', 'VariableDeclarator'), 'fetch', PLAIN)).toBe(false)
  })

  it('reads a method on a named object, however either is spelt', () => {
    expect(reachesMethod('document.write("x")', 'document', ['write'])).toBe(true)
    expect(reachesMethod('document["write"]("x")', 'document', ['write'])).toBe(true)
    expect(reachesMethod('const d = document\nd.write("x")', 'document', ['write'])).toBe(true)
  })

  it('reads no method out of another host, another method, or a bare call', () => {
    expect(reachesMethod('other.write("x")', 'document', ['write'])).toBe(false)
    expect(reachesMethod('document.close()', 'document', ['write'])).toBe(false)
    expect(reachesMethod('write("x")', 'document', ['write'])).toBe(false)
    expect(callsMethod(nodeOfType('const a = document.write', 'MemberExpression'), 'document', ['write'], PLAIN)).toBe(
      false,
    )
    // A call whose callee is not a member expression at all, and one whose
    // callee is a call: neither names a method on anything.
    expect(reachesMethod('write("x")("y")', 'document', ['write'])).toBe(false)
  })
})

describe('the structural read', () => {
  it('descends through parentheses and assertions to the value beneath them', () => {
    for (const wrapped of ['(document)', 'document as never', 'document satisfies never', 'document!']) {
      const inner = unwrap(nodeOfType(`const a = ${wrapped}`, 'VariableDeclarator').init)
      expect([wrapped, isNode(inner) && inner.type]).toEqual([wrapped, 'Identifier'])
    }
  })

  it('descends through a stack of them, and stops where the value begins', () => {
    const inner = unwrap(nodeOfType('const a = (((document)))', 'VariableDeclarator').init)
    expect(isNode(inner) && inner.type).toBe('Identifier')
    expect(unwrap(null)).toBeNull()
  })

  it('stops at the cap rather than spinning on a tree nested deeper than it', () => {
    // The walk is bounded: a tree nested one deeper than the cap comes back
    // as the node it stopped on, which a rule reads as opaque, and a tree
    // nested exactly to the cap comes back as the value beneath.
    const capped = unwrap(nodeOfType(`const a = ${'('.repeat(33)}document${')'.repeat(33)}`, 'VariableDeclarator').init)
    expect(isNode(capped) && capped.type).toBe('ParenthesizedExpression')
    const beneath = unwrap(
      nodeOfType(`const a = ${'('.repeat(32)}document${')'.repeat(32)}`, 'VariableDeclarator').init,
    )
    expect(isNode(beneath) && beneath.type).toBe('Identifier')
  })

  it('reads a member name written plainly, and none written through brackets', () => {
    expect(memberName(nodeOfType('a.b', 'MemberExpression'))).toBe('b')
    expect(memberName(nodeOfType('a["b"]', 'MemberExpression'))).toBeUndefined()
    expect(memberName(nodeOfType('a[b]', 'MemberExpression'))).toBeUndefined()
  })
})

describe('the structural read answers about what it is handed', () => {
  it('reads a value off a parser record that carries no node type', () => {
    // A template element's text is a plain record, not a node; refusing to
    // descend into it made every interpolated template unfoldable.
    const quasi = { type: 'TemplateElement', value: { raw: 'sty', cooked: 'sty' } }
    expect(fieldOf(fieldOf(quasi, 'value'), 'cooked')).toBe('sty')
  })

  it('reports an absent key rather than guessing', () => {
    expect(fieldOf(null, 'value')).toBeNull()
    expect(fieldOf(0, 'value')).toBeNull()
    expect(fieldOf({ type: 'Literal' }, 'missing')).toBeNull()
    expect(fieldOf(['an array is not a holder'], 'length')).toBeNull()
    expect(fieldOf('a string is not a holder', 'length')).toBeNull()
  })
})

describe('the structural walk', () => {
  it('judges a node by whether it carries a type', () => {
    expect(isNode({ type: 'Literal' })).toBe(true)
    expect(isNode({ value: 1 })).toBe(false)
    expect(isNode([{ type: 'Literal' }])).toBe(false)
    expect(isNode(null)).toBe(false)
    expect(isNode('Literal')).toBe(false)
  })

  it('walks parents before children, and every branch of the tree', () => {
    const seen: string[] = []
    walk(parsedBody('const a = b.c'), (node) => seen.push(node.type))
    expect(seen[0]).toBe('VariableDeclaration')
    expect(seen).toContain('MemberExpression')
    expect(seen.filter((type) => type === 'Identifier').length).toBe(3)
  })

  it('walks nothing where it is handed nothing', () => {
    const seen: string[] = []
    walk(null, (node) => seen.push(node.type))
    walk([], (node) => seen.push(node.type))
    expect(seen).toEqual([])
  })

  it('reports the reason a source does not parse, rather than throwing', () => {
    const parsed = parseScript('fixture.ts', 'function (')
    expect(parsed.errors.length).toBeGreaterThan(0)
    expect(parsed.body).toEqual([])
  })

  it('reads the line an offset falls on, and the first line for a field that is not one', () => {
    const parsed = parseScript('fixture.ts', 'const a = 1\nconst b = 2')
    expect(parsed.lineAt(parsed.body[1]?.start)).toBe(2)
    expect(parsed.lineAt(null)).toBe(1)
  })
})
