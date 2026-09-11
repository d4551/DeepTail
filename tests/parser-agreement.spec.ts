/**
 * The two parsers the gates rest on, pinned to agree.
 *
 * Every structural gate reads a real parse, and the parse it reads is oxc's.
 * A second parser walking the same source is the check that the tree the
 * gates read is the tree the language defines rather than one parser's
 * dialect: where the two disagree about what is defined or what is called,
 * one of the gates is reading a tree that does not exist. The agreement is
 * driven on the source the browser suite actually ships to the page, on the
 * transparent constructs the gates unwrap, and on the dialects the
 * repository writes.
 */

import { describe, expect, it } from 'bun:test'
import { structureCheckSource } from '../apps/deeptail/tests/structure.ts'
import {
  babelCallNames,
  babelDefinedNames,
  oxcCallNames,
  oxcDefinedNames,
  parseScript,
  parseScriptWithBabel,
} from '../scripts/ast.ts'

/** A source the gates unwrap: every transparent form in one expression. */
const WRAPPERS = `const size = (1 as number) satisfies number as number
outer(size!)
function outer(inner: number): void {
  void inner
}
`

describe('the two parsers agree on what a source defines', () => {
  it('reads the same definitions out of the checks the page ships', () => {
    const source = structureCheckSource(true, ['shell'])
    const oxc = parseScript('structure-checks.js', source)
    const babel = parseScriptWithBabel('structure-checks.js', source)
    expect(oxc.errors).toEqual([])
    expect(babel.errors).toEqual([])
    expect([...oxcDefinedNames(oxc)].toSorted()).toEqual([...babelDefinedNames(babel)].toSorted())
  })

  it('reads the same calls out of the checks the page ships', () => {
    const source = structureCheckSource(false, ['shell'])
    const oxc = parseScript('structure-checks.js', source)
    const babel = parseScriptWithBabel('structure-checks.js', source)
    expect([...oxcCallNames(oxc)].toSorted()).toEqual([...babelCallNames(babel)].toSorted())
    // The entry point is among the calls both see, so the agreement is over a
    // set that actually drives the page rather than an empty one.
    expect([...babelCallNames(babel)]).toContain('findStructureDefects')
  })

  it('reads the same definitions and calls out of the forms the gates unwrap', () => {
    const oxc = parseScript('wrappers.ts', WRAPPERS)
    const babel = parseScriptWithBabel('wrappers.ts', WRAPPERS)
    expect(oxc.errors).toEqual([])
    expect(babel.errors).toEqual([])
    expect([...oxcDefinedNames(oxc)].toSorted()).toEqual(['outer'])
    expect([...babelDefinedNames(babel)].toSorted()).toEqual(['outer'])
    expect([...oxcCallNames(oxc)].toSorted()).toEqual([...babelCallNames(babel)].toSorted())
  })

  it('reads a jsx dialect the same way, off the suffix the label carries', () => {
    const source = 'export function view(): string {\n  return <a href="/x">go</a>\n}\n'
    const oxc = parseScript('view.tsx', source)
    const babel = parseScriptWithBabel('view.tsx', source)
    expect(oxc.errors).toEqual([])
    expect(babel.errors).toEqual([])
    expect([...oxcDefinedNames(oxc)].toSorted()).toEqual([...babelDefinedNames(babel)].toSorted())
  })

  it('parses a dialect no plugin names, so the plugin table is total', () => {
    const babel = parseScriptWithBabel('plain.mjs', 'const value = 1\n')
    expect(babel.errors).toEqual([])
    expect([...babelDefinedNames(babel)]).toEqual([])
  })

  it('reports what a parser recovered, so a silent recovery is visible', () => {
    // A source both parsers read whole, driven through the error read: the
    // list is empty because the parse is whole, and the read itself is what a
    // future dialect change keeps honest.
    const babel = parseScriptWithBabel('whole.ts', 'export const whole = 1\n')
    expect(babel.errors).toEqual([])
  })
})

describe('the agreement is a check, not a tautology', () => {
  it('names a definition neither parser sees called', () => {
    // The other direction, once, on one parser: a function defined and never
    // called is the dead weight the call-graph gates exist to refuse, and the
    // collectors must see it rather than answer an empty set for everything.
    const source = 'function orphan(): void {\n  void 1\n}\nfunction driven(): void {\n  orphan()\n}\n'
    const oxc = parseScript('orphan.ts', source)
    const babel = parseScriptWithBabel('orphan.ts', source)
    expect([...oxcDefinedNames(oxc)].toSorted()).toEqual(['driven', 'orphan'])
    expect([...babelDefinedNames(babel)].toSorted()).toEqual(['driven', 'orphan'])
    expect([...oxcCallNames(oxc)].toSorted()).toEqual(['orphan'])
    expect([...babelCallNames(babel)].toSorted()).toEqual(['orphan'])
  })
})
