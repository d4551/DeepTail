/**
 * What the suppression and legacy-idiom bans reject and allow, and how the
 * gates read a name however it is reached.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { banOffences, readsTheName, source, styleOffences } from './fixtures.ts'

/**
 * The suppression directives the suite plants, spelt in parts so this file's
 * own lines are not the directives its fixtures carry.
 */
const DIRECTIVES: readonly string[] = [
  ['@ts-', 'expect-error'].join(''),
  ['@ts-', 'ignore'].join(''),
  ['@ts-', 'nocheck'].join(''),
  ['oxlint-', 'disable-next-line'].join(''),
  ['eslint-', 'disable'].join(''),
  ['biome-', 'ignore lint: shipping'].join(''),
  ['knip-', 'ignore'].join(''),
  ['istanbul ', 'ignore next'].join(''),
  '@public',
]

describe('the suppression ban rejects', () => {
  it('every directive, in a line comment and in a block comment', () => {
    for (const directive of DIRECTIVES) {
      expect([directive, banOffences(`// ${directive}\nconst a = 1`)]).not.toEqual([directive, []])
      expect([directive, banOffences(`/* ${directive} */\nconst a = 1`)]).not.toEqual([directive, []])
    }
  })

  it('a directive that follows a line the old gate read as a table', () => {
    // `] as const` closed the previous gate's declaration skip only if it was
    // exactly `]`, so one idiomatic line switched every ban off below it.
    const directive = ['// @ts-', 'expect-error'].join('')
    const text = source(
      "const BANNED_STATUSES = [ 'archived' ] as const",
      directive,
      'export function probe(value: unknown): string {',
      '  return String(value)',
      '}',
    )
    expect(banOffences(text)).not.toEqual([])
  })

  it('a Rust lint suppression, which the .ts-only walk never reached', () => {
    // Spelt in parts: the attribute is this test's data, not its instruction.
    const switch_off = ['al', 'low'].join('')
    expect(banOffences(`#[${switch_off}(dead_code)]`, 'lib.rs')).not.toEqual([])
    expect(banOffences(`#![${switch_off}(dead_code)]`, 'lib.rs')).not.toEqual([])
    expect(banOffences('#[expect(dead_code)]', 'lib.rs')).not.toEqual([])
    expect(banOffences(`#[ ${switch_off} ( dead_code ) ]`, 'lib.rs')).not.toEqual([])
  })

  it('a test taken out of the run', () => {
    // The modifier is this test's data, assembled so this file's own suite is
    // not one of the fixtures it bans.
    const skip = ['sk', 'ip'].join('')
    const only = ['on', 'ly'].join('')
    expect(banOffences(`it.${skip}('does the thing', () => {})`)).not.toEqual([])
    expect(banOffences(`describe.${only}('a group', () => {})`)).not.toEqual([])
    expect(banOffences(`it.to${'do'}('later')`)).not.toEqual([])
  })
})

describe('the suppression ban allows', () => {
  it('a directive named in code as data, which is what the rule table is', () => {
    const directives = [['@ts-', 'expect-error'].join(''), ['biome-', 'ignore'].join('')]
    expect(banOffences(source(`const directives = ${JSON.stringify(directives)}`, 'export { directives }'))).toEqual([])
  })
})

/**
 * Every idiom the project has moved past, with the reason each must produce.
 *
 * Each case carries the reason it must produce, not merely that something
 * was produced. `.not.toEqual([])` was satisfied by any non-empty list —
 * including the parse error a JSX fixture labelled `.ts` reports instead of
 * its rule, which is how the React 19 removal ban sat uncovered while its
 * case read green.
 */
const LEGACY_CASES: readonly [string, string, string, string?][] = [
  ['var', 'var legacy = 1', 'use const or let'],
  ['require', "const x = require('node:fs')", 'use ES module imports'],
  ['innerHTML', 'el.innerHTML = markup', 'use textContent'],
  ['document.write', "document.write('x')", 'removed from modern engines'],
  ['substr', 'name.substr(0, 3)', 'deprecated; use slice'],
  ['new Array', 'const xs = new Array(3)', 'use an array literal'],
  ['escape', "escape('x')", 'are deprecated; use encodeURIComponent'],
  ['unescape', "unescape('x')", 'are deprecated; use encodeURIComponent'],
  ['__proto__', 'const p = value.__proto__', 'use Object.getPrototypeOf'],
  ['any', 'let value: any = 1', 'any defeats the type system'],
  ['any in a generic', 'const xs: Array<any> = []', 'any defeats the type system'],
  ['any in an assertion', 'const x = value as any', 'any defeats the type system'],
  ['non-null assertion', 'const x = value!.length', 'overrides the checker'],
  ['eval', "eval('1 + 1')", 'executes text as code'],
  ['setTimeout with text', "setTimeout('run()', 10)", 'a timer called with text'],
  [
    'setInterval with folded text',
    source("const body = 'go()'", "setInterval('run(' + body, 10)"),
    'a timer called with text',
  ],
  [
    'ReactDOM render',
    "ReactDOM.render(<App />, document.getElementById('root'))",
    'removed in React 19; use createRoot',
    'fixture.tsx',
  ],
  ['ReactDOM hydrate', 'ReactDOM.hydrate(<App />, node)', 'removed in React 19; use createRoot', 'fixture.tsx'],
  ['ReactDOM unmount', 'ReactDOM.unmountComponentAtNode(node)', 'removed in React 19; use createRoot'],
  ['ReactDOM findDOMNode', 'ReactDOM.findDOMNode(instance)', 'removed in React 19; use createRoot'],
  ['findDOMNode import', 'findDOMNode(instance)', 'findDOMNode was removed'],
  ['defaultProps', 'const defaults = Badge.defaultProps', 'defaultProps on a component'],
  ['legacy context types', 'const types = Badge.childContextTypes', 'legacy context was removed'],
  ['legacy context getter', 'const getter = Badge.getChildContext', 'legacy context was removed'],
  ['string ref', '<input ref="name" />', 'a string ref was removed', 'fixture.tsx'],
  ['Tauri v1 invoke import', "import { invoke } from '@tauri-apps/api/tauri'", 'this is a Tauri v1 API path'],
  ['Tauri v1 fs import', "import { readTextFile } from '@tauri-apps/api/fs'", 'this is a Tauri v1 API path'],
  ['Tauri v1 global', 'window.__TAURI__.invoke("x")', 'the __TAURI__ global'],
  ['Tauri v1 global via brackets', "window['__TAURI__'].invoke('x')", 'the __TAURI__ global'],
  ['import equals', "import value = require('node:fs')", 'import-equals is TypeScript 6 syntax'],
  ['namespace', 'namespace Geometry {}', 'a namespace is a TypeScript 6 module system'],
  ['expando prototype', 'Chart.prototype.draw = function draw() {}', 'removed in TypeScript 7'],
  ['expando prototype via brackets', "Chart['prototype'].draw = draw", 'removed in TypeScript 7'],
]

describe('the legacy ban rejects', () => {
  it('every idiom the project has moved past', () => {
    const misreported = LEGACY_CASES.flatMap(([name, text, reason, label = 'fixture.ts']) => {
      const found = banOffences(text, label)
      // A fixture that fails to parse reports the parse error and nothing else,
      // so naming the reason is also what keeps a fixture honest about the
      // reader it was written for.
      return found.some((why) => why.includes(reason)) ? [] : [`${name}: ${found.join(' | ') || 'nothing reported'}`]
    })
    expect(misreported).toEqual([])
  })
})

describe('the legacy ban allows', () => {
  it('the selector escape, which is a method rather than the global', () => {
    expect(banOffences("CSS.escape('#a b')")).toEqual([])
  })

  it('the React 19 entry points and the Tauri v2 paths', () => {
    expect(banOffences('createRoot(container).render(<App />)', 'fixture.tsx')).toEqual([])
    expect(banOffences("import { invoke } from '@tauri-apps/api/core'")).toEqual([])
  })

  it('a timer handed a function, which is the supported form', () => {
    expect(banOffences('setTimeout(run, 10)')).toEqual([])
    expect(banOffences('setTimeout(() => run(), 10)')).toEqual([])
    expect(banOffences('setInterval(tick, 1_000)')).toEqual([])
  })

  it('the ambient module declaration and the class, which replaced the expando', () => {
    expect(banOffences("declare module 'pkg' { }")).toEqual([])
    expect(banOffences('class Chart { draw() {} }')).toEqual([])
    expect(banOffences(source('const chart = {}', 'chart.prototype = null'))).toEqual([])
  })

  it('an idiom named in prose, which is a mention rather than a use', () => {
    expect(banOffences(source('// var is not used here; prefer const', 'const a = 1'))).toEqual([])
    expect(banOffences(source('/** Uses slice rather than substr. */', 'const a = 1'))).toEqual([])
  })

  it('an idiom named in a string, which is data', () => {
    expect(banOffences("const why = 'use const or let rather than var'")).toEqual([])
  })
})

describe('neither gate is fooled by punctuation that changes nothing', () => {
  it('reads through parentheses and type assertions', () => {
    // oxc keeps parentheses in the tree and a type assertion is a node of its
    // own, so a rule written about what they enclose sees the outer node
    // instead — one pair of brackets was enough to hide a call from every rule.
    expect(readsTheName("el.setAttribute(('style'), 'x')")).toBe(true)
    expect(readsTheName("el.setAttribute('style' as string, 'x')")).toBe(true)
    expect(readsTheName("el.setAttribute((('sty') + ('le')), 'x')")).toBe(true)
    expect(styleOffences("(el).style.color = 'red'")).not.toEqual([])
    expect(banOffences("(document).write('x')")).not.toEqual([])
    expect(banOffences(source('const d = (document)', "d.write('x')"))).not.toEqual([])
    expect(banOffences('new (Array)(3)')).not.toEqual([])
    expect(banOffences("(eval)('1 + 1')")).not.toEqual([])
  })
})

describe('the ban gate reads a name however it is reached', () => {
  it('through brackets', () => {
    expect(banOffences("name['substr'](0, 3)")).not.toEqual([])
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

  it('in a Rust attribute however it is laid out', () => {
    // Neither of these has `#[` and `allow(` adjacent on one line, which is all
    // the line reader ever looked for.
    expect(banOffences('#[cfg_attr(all(), allow(dead_code))]\nfn x() {}', 'lib.rs')).not.toEqual([])
    expect(banOffences('#[\n    allow(dead_code)\n]\nfn x() {}', 'lib.rs')).not.toEqual([])
    expect(banOffences('// this crate does not allow (any) suppressions', 'lib.rs')).toEqual([])
  })
})
