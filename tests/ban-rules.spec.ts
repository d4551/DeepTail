/**
 * Every idiom the ban list refuses, and every spelling it has to refuse it in.
 *
 * A ban is stated about a name, and a name is what a `const`, an import alias
 * or a pair of brackets can change without changing what runs. Each rule is
 * driven here in the plain spelling and in the spellings that step around a
 * reader that only knows the plain one; the debt-word ban is held in
 * `ban-names.spec.ts`, and the shapes of the gate itself in `gates.spec.ts`.
 */

import { describe, expect, it } from 'bun:test'
import { admitted, bans, joined, refused } from './fixtures.ts'

describe('the ban on a legacy binding and a legacy statement', () => {
  it('refuses var, and admits the bindings that replaced it', () => {
    expect(bans('var a = 1')).toEqual(['use const or let'])
    expect(bans('const a = 1', 'let b = 2')).toEqual([])
  })

  it('refuses a with statement, which strict mode forbids outright', () => {
    expect(bans('function f(o) { with (o) { return 1 } }')).toEqual([
      'with is forbidden in strict mode; name the object',
    ])
  })
})

describe('the ban on running text as code', () => {
  it('refuses require and eval, however each is reached', () => {
    refused('use ES module imports', [['const a = require("x")'], ['const r = require', 'const a = r("x")']])
    refused('eval executes text as code; call the function directly', [
      ['const a = eval("x")'],
      ['const a = globalThis.eval("x")'],
    ])
  })

  it('refuses a timer handed a string, in every form the string can be assembled', () => {
    const why = 'a timer called with text runs the text as code; pass a function'
    refused(why, [
      ['setTimeout("go()", 1)'],
      ['setInterval("go()", 1)'],
      ['const body = "go()"', 'setTimeout(body, 1)'],
      ['setTimeout("go" + "()", 1)'],
    ])
  })

  it('admits a timer handed a function, which is what a timer is for', () => {
    admitted([['setTimeout(() => go(), 1)'], ['setTimeout(go, 1)'], ['setTimeout()']])
  })
})

describe('the ban on writing markup', () => {
  const why = 'use textContent, or insertAdjacentHTML with markup this repository does not author'

  it('refuses an assignment to either markup property, however the property is reached', () => {
    refused(why, [
      ['el.innerHTML = "<b>"'],
      ['el.outerHTML = "<b>"'],
      ['el["innerHTML"] = "<b>"'],
      ['const key = "innerHTML"', 'el[key] = "<b>"'],
      ['(el).innerHTML = "<b>"'],
    ])
  })

  it('refuses the same write spelt as a keyed one, on either host', () => {
    refused(why, [
      ['Reflect.set(el, "innerHTML", "<b>")'],
      ['Reflect.defineProperty(el, "innerHTML", spec)'],
      ['Object.defineProperty(el, "outerHTML", spec)'],
    ])
  })

  it('refuses the same write spelt as a merge, at any argument after the target', () => {
    refused(why, [
      ['Object.assign(el, { innerHTML: "<b>" })'],
      ['Object.assign(el, first, { outerHTML: "<b>" })'],
      ['Object.assign(el, { "innerHTML": "<b>" })'],
      ['Object.defineProperties(el, { innerHTML: spec })'],
      ['const key = "innerHTML"', 'Object.assign(el, { [key]: "<b>" })'],
    ])
  })

  it('admits a write that names something else, and a read of the property', () => {
    admitted([
      ['el.textContent = "x"'],
      ['Reflect.set(el, "textContent", "x")'],
      ['Object.assign(el, { hidden: true })'],
      ['Object.assign(el, source)'],
      ['store.set(el, "innerHTML", "<b>")'],
      ['Object.assign({ innerHTML: "x" }, source)'],
    ])
  })
})

describe('the ban on the removed and the deprecated', () => {
  it('refuses document.write and its line-ending sibling', () => {
    const why = 'document.write is removed from modern engines'
    refused(why, [['document.write("x")'], ['document.writeln("x")'], ['const d = document', 'd.write("x")']])
    admitted([['other.write("x")']])
  })

  it('refuses substr, however the property is reached', () => {
    const why = 'String.prototype.substr is deprecated; use slice'
    refused(why, [['const a = text.substr(1)'], ['const a = text["substr"](1)']])
    admitted([['const a = text.slice(1)']])
  })

  it('refuses the Array constructor, called as a constructor or through Reflect', () => {
    const why = 'use an array literal or Array.from'
    refused(why, [
      ['const a = new Array(3)'],
      ['const a = Reflect.construct(Array, [3])'],
      ['const A = Array', 'const a = new A(3)'],
    ])
    admitted([
      ['const a = Reflect.construct(Map, [])'],
      ['const a = Array.from(source)'],
      ['const a = Reflect.construct()'],
    ])
  })

  it('refuses the deprecated global escapes, and admits the encoders that replaced them', () => {
    const why = 'the global escape and unescape are deprecated; use encodeURIComponent, or CSS.escape for a selector'
    refused(why, [['const a = escape("x")'], ['const a = unescape("x")']])
    admitted([['const a = encodeURIComponent("x")'], ['const a = CSS.escape("x")']])
  })

  it('refuses the legacy prototype accessor, as a property and as a key', () => {
    const why = 'use Object.getPrototypeOf or Object.create'
    refused(why, [
      ['const a = o.__proto__'],
      ['const a = o["__proto__"]'],
      ['const a = { __proto__: base }'],
      ['const a = { "__proto__": base }'],
    ])
    admitted([['const a = o.prototype'], ['const a = { proto: base }']])
  })
})

describe('the ban on a test that does not report', () => {
  const why = 'a test that is skipped, focused or expected to fail is a test that does not report'
  const runners = ['it', 'test', 'describe']
  const modifiers = ['skip', 'only', 'todo', 'failing', 'skipIf', 'todoIf']

  it('refuses every modifier on every runner', () => {
    const found = runners.flatMap((runner) => modifiers.map((modifier) => bans(`${runner}.${modifier}("x", () => 1)`)))
    expect(found).toEqual(found.map(() => [why]))
  })

  it('refuses a modifier reached through brackets or through a rename', () => {
    // The bracketed fixtures are assembled from parts, like every fixture here
    // that carries the shape of a disabled test: the assembled string is what
    // the gate reads, and this file's own source is not where it belongs.
    refused(why, [
      [joined('it', '["skip"]("x", () => 1)')],
      [joined('import { it as ch', "eck } from 'bun:test'"), 'check.skip("x", () => 1)'],
      ['const key = "skip"', joined('it', '[key]("x", () => 1)')],
    ])
  })

  it('refuses a modifier one step further out, where a runner is qualified first', () => {
    // `it.concurrent.skip` puts the runner two steps from the modifier, and a
    // reader that looked only at what the modifier hangs directly off would
    // see `concurrent` and say nothing. The fixtures are assembled from parts
    // for the same reason the bracketed ones are.
    refused(why, [[joined('it.concurrent.sk', 'ip("x", () => 1)')], [joined('it.sk', 'ip.each([1])("x", () => 1)')]])
  })

  it('admits a runner with no modifier, and a modifier on something else', () => {
    admitted([['it("x", () => 1)'], ['queue.skip("x")'], ['it.each([1])("x", () => 1)']])
  })
})

describe('the ban on syntax the checker no longer follows', () => {
  it('refuses the any keyword and the non-null assertion', () => {
    expect(bans('function f(a: any): number { return 1 }')).toEqual(['any defeats the type system; name the shape'])
    expect(bans('const a = b!')).toEqual([
      'a non-null assertion overrides the checker; narrow the value or handle the absent case',
    ])
  })

  it('refuses import-equals and a namespace, and admits a global declaration', () => {
    expect(bans(joined('import x = requ', "ire('y')"))).toEqual([
      'import-equals is TypeScript 6 syntax; use a default import or `import type`',
    ])
    expect(bans('namespace Shapes { export const a = 1 }')).toEqual([
      'a namespace is a TypeScript 6 module system; use ES module exports',
    ])
    expect(bans('declare global { interface Window { a: number } }')).toEqual([])
  })

  it('refuses the constructor-function expando, and admits an ordinary member write', () => {
    const why = 'the constructor-function expando pattern was removed in TypeScript 7; use a class'
    refused(why, [
      ['Chart.prototype.draw = function () { return 1 }'],
      ['Chart.prototype["draw"] = function () { return 1 }'],
    ])
    admitted([['chart.draw = function () { return 1 }'], ['Chart.prototype = base']])
  })
})

describe('the ban on claiming what nothing proved', () => {
  const why = 'an as-expression claims a shape nothing proved; narrow the value with a predicate'

  it('refuses an as-expression, however far the claim reaches', () => {
    refused(why, [['const a = b as Row'], ['function f(v) { return (v as Row).id }']])
    // Two claims in one source: the ban reads each `as` it meets.
    expect(bans('const a = b as unknown as Row')).toEqual([why, why])
  })

  it('admits the const assertion, which narrows a literal to itself', () => {
    admitted([['const a = [1, 2] as const'], ['const a = { k: 1 } as const']])
  })

  it('admits a value narrowed by a predicate, which is what the ban asks for', () => {
    admitted([['function isRow(v) { return typeof v === "object" }', 'const a = isRow(b) ? b : undefined']])
  })
})

describe('the ban on reading every failure as one shape', () => {
  const why = 'a catch reads any failure as one shape; settle the promise, or let the failure travel'

  it('refuses a catch clause, named binding or not', () => {
    refused(why, [
      [joined('try { go() } cat', 'ch (error) { report(error) }')],
      [joined('try { go() } cat', 'ch { report() }')],
      [joined('try { go() } cat', 'ch (error) { report(error) } finally { done() }')],
    ])
  })

  it('admits a failure that is settled rather than swallowed', () => {
    admitted([['const a = go().then(done, report)'], ['const a = await Promise.allSettled([go()])']])
  })
})
