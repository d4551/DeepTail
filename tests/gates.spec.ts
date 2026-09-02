/**
 * The ban gate's own suite.
 *
 * The gate carries rules no linter has, and until an audit ran, nothing checked
 * that it could still fail. A rule added but never run against a positive case
 * is a rule nobody has evidence for, which is how the gate came to be
 * bypassable while reporting success. Every rule below is driven both ways: a
 * source that breaks it must be rejected, and a source that resembles it must
 * not be.
 *
 * The attacks are the ones that got through the previous, line-based gate. The
 * Rust reader has its own suite, in rust-gate.spec.ts.
 */

import { describe, expect, it } from 'bun:test'
import * as bans from '../scripts/ban-gate.ts'

/**
 * Assemble a fixture out of parts the gate cannot fold, so this file's own
 * fixtures are never read as the constructs they describe.
 * @param parts - the fixture's lines.
 * @returns the source text.
 */
function source(...parts: readonly string[]): string {
  return parts.join('\n')
}

/**
 * The reasons a source is rejected by the ban gate.
 * @param text - the fixture.
 * @param label - the path to attribute it to, which selects the reader.
 * @returns one reason per offence.
 */
function banOffences(text: string, label = 'fixture.ts'): string[] {
  return bans.scanSource(label, text).map((offence) => offence.why)
}

describe('the suppression ban rejects', () => {
  it('every directive, in a line comment and in a block comment', () => {
    for (const directive of [
      '@ts-expect-error',
      '@ts-ignore',
      '@ts-nocheck',
      'oxlint-disable-next-line',
      'eslint-disable',
      'biome-ignore lint: shipping',
      'knip-ignore',
      'istanbul ignore next',
      '@public',
    ]) {
      expect([directive, banOffences(`// ${directive}\nconst a = 1`)]).not.toEqual([directive, []])
      expect([directive, banOffences(`/* ${directive} */\nconst a = 1`)]).not.toEqual([directive, []])
    }
  })

  it('a directive that follows a line the old gate read as a table', () => {
    // `] as const` closed the previous gate's declaration skip only if it was
    // exactly `]`, so one idiomatic line switched every ban off below it.
    const text = source(
      "const BANNED_STATUSES = [ 'archived' ] as const",
      '// @ts-expect-error',
      'export function probe(value: unknown): string {',
      '  return String(value)',
      '}',
    )
    expect(banOffences(text)).not.toEqual([])
  })

  it('a test taken out of the run', () => {
    expect(banOffences("it.skip('does the thing', () => {})")).not.toEqual([])
    expect(banOffences("describe.only('a group', () => {})")).not.toEqual([])
    expect(banOffences("it.todo('later')")).not.toEqual([])
  })
})

describe('the suppression ban allows', () => {
  it('a directive named in code as data, which is what the rule table is', () => {
    expect(
      banOffences(source("const directives = ['@ts-expect-error', 'biome-ignore']", 'export { directives }')),
    ).toEqual([])
  })
})

describe('the legacy ban rejects', () => {
  it('every idiom the project has moved past', () => {
    const cases: readonly [string, string][] = [
      ['var', 'var legacy = 1'],
      ['require', "const x = require('node:fs')"],
      ['innerHTML', 'el.innerHTML = markup'],
      ['document.write', "document.write('x')"],
      ['substr', 'name.substr(0, 3)'],
      ['new Array', 'const xs = new Array(3)'],
      ['escape', "escape('x')"],
      ['unescape', "unescape('x')"],
      ['__proto__', 'const p = value.__proto__'],
      ['any', 'let value: any = 1'],
      ['any in a generic', 'const xs: Array<any> = []'],
      ['any in an assertion', 'const x = value as any'],
      ['non-null assertion', 'const x = value!.length'],
      ['eval', "eval('1 + 1')"],
    ]
    for (const [name, text] of cases) {
      expect([name, banOffences(text)]).not.toEqual([name, []])
    }
  })
})

describe('the legacy ban allows', () => {
  it('the selector escape, which is a method rather than the global', () => {
    expect(banOffences("CSS.escape('#a b')")).toEqual([])
  })

  it('an idiom named in prose, which is a mention rather than a use', () => {
    expect(banOffences(source('// var is not used here; prefer const', 'const a = 1'))).toEqual([])
    expect(banOffences(source('/** Uses slice rather than substr. */', 'const a = 1'))).toEqual([])
  })

  it('an idiom named in a string, which is data', () => {
    expect(banOffences("const why = 'use const or let rather than var'")).toEqual([])
  })
})

describe('the ban gate is not fooled by a wrapper that changes nothing', () => {
  it('reads through parentheses and type assertions', () => {
    // oxc keeps parentheses in the tree and a type assertion is a node of its
    // own, so a rule written about what they wrap sees the wrapper instead —
    // one pair of brackets was enough to hide a call from every rule.
    expect(banOffences("(document).write('x')")).not.toEqual([])
    expect(banOffences(source('const d = (document)', "d.write('x')"))).not.toEqual([])
    expect(banOffences('new (Array)(3)')).not.toEqual([])
    expect(banOffences("(eval)('1 + 1')")).not.toEqual([])
  })
})

describe('the ban gate reads a name however it is reached', () => {
  it('through brackets', () => {
    expect(banOffences("name['substr'](0, 3)")).not.toEqual([])
    expect(banOffences("it['skip']('x', () => {})")).not.toEqual([])
  })

  it('through a rename', () => {
    // A `const` and an import alias both change the written name without
    // changing what runs, so a rule matching the written name is one line away
    // from being switched off.
    expect(banOffences(source('const d = document', "d.write('x')"))).not.toEqual([])
    expect(banOffences(source("import { it as check } from 'bun:test'", "check.skip('x', () => {})"))).not.toEqual([])
    expect(banOffences(source('const list = Array', 'new list(3)'))).not.toEqual([])
  })

  it('through the global object', () => {
    expect(banOffences("globalThis.eval('1 + 1')")).not.toEqual([])
    expect(banOffences("window.eval('1 + 1')")).not.toEqual([])
  })

  it('through a property write rather than an assignment', () => {
    expect(banOffences("Reflect.set(el, 'innerHTML', '<b>x</b>')")).not.toEqual([])
    expect(banOffences('Object.assign(el, { innerHTML: markup })')).not.toEqual([])
    expect(banOffences('Reflect.construct(Array, [3])')).not.toEqual([])
  })

  it('but not a merge that carries none of them', () => {
    expect(banOffences('Object.assign(page, { recorded, commands })')).toEqual([])
    expect(banOffences('const d = drawer\nd.write = null')).toEqual([])
  })
})
