/**
 * Every idiom the ban list refuses, and every spelling it has to refuse it in.
 *
 * A ban is stated about a name, and a name is what a `const`, an import alias
 * or a pair of brackets can change without changing what runs. Each rule is
 * driven here in the plain spelling and in the spellings that step around a
 * reader that only knows the plain one; `gates.spec.ts` holds the shapes of the
 * gate itself.
 */

import { describe, expect, it } from 'bun:test'
import { banOffences, joined, source } from './fixtures.ts'

/** The reasons a fixture is rejected for. */
function bans(...lines: readonly string[]): string[] {
  return banOffences(source(...lines))
}

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
    expect(bans('const a = require("x")')).toEqual(['use ES module imports'])
    expect(bans('const r = require', 'const a = r("x")')).toEqual(['use ES module imports'])
    expect(bans('const a = eval("x")')).toEqual(['eval executes text as code; call the function directly'])
    expect(bans('const a = globalThis.eval("x")')).toEqual(['eval executes text as code; call the function directly'])
  })

  it('refuses a timer handed a string, in every form the string can be assembled', () => {
    const why = 'a timer called with text runs the text as code; pass a function'
    expect(bans('setTimeout("go()", 1)')).toEqual([why])
    expect(bans('setInterval("go()", 1)')).toEqual([why])
    expect(bans('const body = "go()"', 'setTimeout(body, 1)')).toEqual([why])
    expect(bans('setTimeout("go" + "()", 1)')).toEqual([why])
  })

  it('admits a timer handed a function, which is what a timer is for', () => {
    expect(bans('setTimeout(() => go(), 1)')).toEqual([])
    expect(bans('setTimeout(go, 1)')).toEqual([])
    expect(bans('setTimeout()')).toEqual([])
  })
})

describe('the ban on writing markup', () => {
  const why = 'use textContent, or insertAdjacentHTML with markup this repository does not author'

  it('refuses an assignment to either markup property, however the property is reached', () => {
    expect(bans('el.innerHTML = "<b>"')).toEqual([why])
    expect(bans('el.outerHTML = "<b>"')).toEqual([why])
    expect(bans('el["innerHTML"] = "<b>"')).toEqual([why])
    expect(bans('const key = "innerHTML"', 'el[key] = "<b>"')).toEqual([why])
    expect(bans('(el).innerHTML = "<b>"')).toEqual([why])
  })

  it('refuses the same write spelt as a keyed one, on either host', () => {
    expect(bans('Reflect.set(el, "innerHTML", "<b>")')).toEqual([why])
    expect(bans('Reflect.defineProperty(el, "innerHTML", spec)')).toEqual([why])
    expect(bans('Object.defineProperty(el, "outerHTML", spec)')).toEqual([why])
  })

  it('refuses the same write spelt as a merge, at any argument after the target', () => {
    expect(bans('Object.assign(el, { innerHTML: "<b>" })')).toEqual([why])
    expect(bans('Object.assign(el, first, { outerHTML: "<b>" })')).toEqual([why])
    expect(bans('Object.assign(el, { "innerHTML": "<b>" })')).toEqual([why])
    expect(bans('const key = "innerHTML"', 'Object.assign(el, { [key]: "<b>" })')).toEqual([why])
    expect(bans('Object.defineProperties(el, { innerHTML: spec })')).toEqual([why])
  })

  it('admits a write that names something else, and a read of the property', () => {
    expect(bans('el.textContent = "x"')).toEqual([])
    expect(bans('Reflect.set(el, "textContent", "x")')).toEqual([])
    expect(bans('Object.assign(el, { hidden: true })')).toEqual([])
    expect(bans('Object.assign(el, source)')).toEqual([])
    expect(bans('store.set(el, "innerHTML", "<b>")')).toEqual([])
    expect(bans('Object.assign({ innerHTML: "x" }, source)')).toEqual([])
  })
})

describe('the ban on the removed and the deprecated', () => {
  it('refuses document.write and its line-ending sibling', () => {
    const why = 'document.write is removed from modern engines'
    expect(bans('document.write("x")')).toEqual([why])
    expect(bans('document.writeln("x")')).toEqual([why])
    expect(bans('const d = document', 'd.write("x")')).toEqual([why])
    expect(bans('other.write("x")')).toEqual([])
  })

  it('refuses substr, however the property is reached', () => {
    const why = 'String.prototype.substr is deprecated; use slice'
    expect(bans('const a = text.substr(1)')).toEqual([why])
    expect(bans('const a = text["substr"](1)')).toEqual([why])
    expect(bans('const a = text.slice(1)')).toEqual([])
  })

  it('refuses the Array constructor, called as a constructor or through Reflect', () => {
    const why = 'use an array literal or Array.from'
    expect(bans('const a = new Array(3)')).toEqual([why])
    expect(bans('const a = Reflect.construct(Array, [3])')).toEqual([why])
    expect(bans('const A = Array', 'const a = new A(3)')).toEqual([why])
    expect(bans('const a = Reflect.construct(Map, [])')).toEqual([])
    expect(bans('const a = Array.from(source)')).toEqual([])
    expect(bans('const a = Reflect.construct()')).toEqual([])
  })

  it('refuses the deprecated global escapes, and admits the encoders that replaced them', () => {
    const why = 'the global escape and unescape are deprecated; use encodeURIComponent, or CSS.escape for a selector'
    expect(bans('const a = escape("x")')).toEqual([why])
    expect(bans('const a = unescape("x")')).toEqual([why])
    expect(bans('const a = encodeURIComponent("x")')).toEqual([])
    expect(bans('const a = CSS.escape("x")')).toEqual([])
  })

  it('refuses the legacy prototype accessor, as a property and as a key', () => {
    const why = 'use Object.getPrototypeOf or Object.create'
    expect(bans('const a = o.__proto__')).toEqual([why])
    expect(bans('const a = o["__proto__"]')).toEqual([why])
    expect(bans('const a = { __proto__: base }')).toEqual([why])
    expect(bans('const a = { "__proto__": base }')).toEqual([why])
    expect(bans('const a = o.prototype')).toEqual([])
    expect(bans('const a = { proto: base }')).toEqual([])
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
    expect(bans('it["skip"]("x", () => 1)')).toEqual([why])
    expect(bans(joined('import { it as ch', "eck } from 'bun:test'"), 'check.skip("x", () => 1)')).toEqual([why])
    expect(bans('const key = "skip"', 'it[key]("x", () => 1)')).toEqual([why])
  })

  it('refuses a modifier one step further out, where a runner is qualified first', () => {
    // `it.concurrent.skip` puts the runner two steps from the modifier, and a
    // reader that looked only at what the modifier hangs directly off would
    // see `concurrent` and say nothing.
    expect(bans('it.concurrent.skip("x", () => 1)')).toEqual([why])
    expect(bans('it.skip.each([1])("x", () => 1)')).toEqual([why])
  })

  it('admits a runner with no modifier, and a modifier on something else', () => {
    expect(bans('it("x", () => 1)')).toEqual([])
    expect(bans('queue.skip("x")')).toEqual([])
    expect(bans('it.each([1])("x", () => 1)')).toEqual([])
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
    expect(bans('Chart.prototype.draw = function () { return 1 }')).toEqual([why])
    expect(bans('Chart.prototype["draw"] = function () { return 1 }')).toEqual([why])
    expect(bans('chart.draw = function () { return 1 }')).toEqual([])
    // Replacing the prototype wholesale is not the expando pattern: nothing is
    // being hung off it, and the rule is about members written onto one.
    expect(bans('Chart.prototype = base')).toEqual([])
  })
})

describe('the ban on claiming what nothing proved', () => {
  const why = 'an as-expression claims a shape nothing proved; narrow the value with a predicate'

  it('refuses an as-expression, however far the claim reaches', () => {
    expect(bans('const a = b as Row')).toEqual([why])
    expect(bans('const a = b as unknown as Row')).toEqual([why, why])
    expect(bans('function f(v) { return (v as Row).id }')).toEqual([why])
  })

  it('admits the const assertion, which narrows a literal to itself', () => {
    expect(bans('const a = [1, 2] as const')).toEqual([])
    expect(bans('const a = { k: 1 } as const')).toEqual([])
  })

  it('admits a value narrowed by a predicate, which is what the ban asks for', () => {
    expect(bans('function isRow(v) { return typeof v === "object" }', 'const a = isRow(b) ? b : undefined')).toEqual([])
  })
})

describe('the ban on reading every failure as one shape', () => {
  const why = 'a catch reads any failure as one shape; settle the promise, or let the failure travel'

  it('refuses a catch clause, named binding or not', () => {
    expect(bans(joined('try { go() } cat', 'ch (error) { report(error) }'))).toEqual([why])
    expect(bans(joined('try { go() } cat', 'ch { report() }'))).toEqual([why])
    expect(bans(joined('try { go() } cat', 'ch (error) { report(error) } finally { done() }'))).toEqual([why])
  })

  it('admits a failure that is settled rather than swallowed', () => {
    expect(bans('const a = go().then(done, report)')).toEqual([])
    expect(bans('const a = await Promise.allSettled([go()])')).toEqual([])
  })
})

describe('the ban on a name that says the code stands in for something', () => {
  const why = 'this name says the code stands in for something real; name what it does, or remove the debt'

  it('refuses a debt word wherever a name is written, in each casing a name uses', () => {
    expect(bans('function stubDeps() { return 1 }')).toEqual([why])
    expect(bans('class FakeSocket {}')).toEqual([why])
    expect(bans('const MOCK_ROWS = []')).toEqual([why])
    expect(bans('const temporaryRows = 1')).toEqual([why])
    expect(bans('const compat_layer = 1')).toEqual([why])
  })

  it('refuses the word wherever it sits in the name, not only at its head', () => {
    expect(bans('const readStubRow = 1')).toEqual([why])
    expect(bans('const rowsAreFake = 1')).toEqual([why])
  })

  it('refuses one in a declaration of any kind, a member or a parameter included', () => {
    expect(bans('interface FakeRow { id: string }')).toEqual([why])
    expect(bans('type LegacyRow = { id: string }')).toEqual([why])
    expect(bans('const row = { mockId: 1 }')).toEqual([why])
    expect(bans('function read(stubRow) { return stubRow }')).toEqual([why])
    expect(bans('const { fakeRow } = source')).toEqual([why])
    expect(bans('const [firstMock] = rows')).toEqual([why])
    expect(bans('class Reader { dummyRow = 1 }')).toEqual([why])
  })

  it('admits a name that merely contains the letters, which claims nothing', () => {
    // A rule matching substrings would refuse `broadcast` for `cast` and
    // `company` for `any`, which is a rule nobody could satisfy.
    expect(bans('const broadcast = 1')).toEqual([])
    expect(bans('const company = 1')).toEqual([])
    expect(bans('const template = 1')).toEqual([])
    expect(bans('const stubborn = 1')).toEqual([])
  })

  it('admits a member of an API this repository did not name, which it cannot rename', () => {
    // `input.placeholder` is the DOM's own property and `it.todo` is the test
    // runner's own modifier — which the ban above refuses on its own terms.
    expect(bans('input.placeholder = text')).toEqual([])
    expect(bans('const key = row["mockId"]')).toEqual([])
  })

  it('admits the word as data, because a table of banned words is not a name', () => {
    expect(bans(joined('const words = ["st', 'ub", "fa', 'ke"]'))).toEqual([])
  })
})
