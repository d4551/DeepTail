/**
 * Every binding form and every non-reference the free-name reader has to know.
 *
 * The reader decides whether the source two suites inject into a page carries
 * everything it names. Its answers are the whole of that gate, so a form it
 * gets wrong is a defect the gate will never report again: a name it wrongly
 * calls bound is a `ReferenceError` shipped to the page, and a slot it wrongly
 * calls a reference is a false alarm on a property name.
 *
 * `free-names.spec.ts` holds the shapes a reader is usually written against.
 * This holds the rest of the language.
 */

import { describe, expect, it } from 'bun:test'
import { freeNames } from '../scripts/free-names.ts'
import { free } from './fixtures.ts'

describe('the reader reads a name out of every reference position', () => {
  it('reads a computed member, a computed key and a computed method name', () => {
    expect(free('function a(o) { return o[KEY] }')).toEqual(['KEY'])
    expect(free('function a() { return { [KEY]: 1 } }')).toEqual(['KEY'])
    expect(free('class C { [KEY]() { return 1 } }\nconst a = new C()')).toEqual(['KEY'])
    expect(free('class C { [KEY] = 1 }\nconst a = new C()')).toEqual(['KEY'])
    expect(free('class C { accessor [KEY] = 1 }\nconst a = new C()')).toEqual(['KEY'])
  })

  it('reads a shorthand property, which is a reference as well as a key', () => {
    expect(free('function a() { return { x } }')).toEqual(['x'])
  })

  it('reads the value of a property, whatever its key is called', () => {
    expect(free('function a() { return { x: VALUE } }')).toEqual(['VALUE'])
    expect(free('class C { x = VALUE }\nconst a = new C()')).toEqual(['VALUE'])
  })

  it('reads the object of a member expression, which is never a property name', () => {
    expect(free('function a() { return HOST.x.y }')).toEqual(['HOST'])
  })

  it('reads a default, a spread and a rest, which are ordinary expressions', () => {
    expect(free('function a(x = FALLBACK) { return x }')).toEqual(['FALLBACK'])
    expect(free('function a() { return [...REST] }')).toEqual(['REST'])
    expect(free('function a() { return { ...REST } }')).toEqual(['REST'])
  })

  it('reads a tagged template and its substitutions', () => {
    // The fixture is template-literal source text; the dollar is spelt escaped
    // because the sequence it opens is the syntax under test, not a
    // placeholder, and the escaped spelling carries the identical value.
    expect(free('function a() { return TAG`x\u0024{VALUE}y` }')).toEqual(['TAG', 'VALUE'])
  })

  it('reads a class heritage, which is an expression like any other', () => {
    expect(free('class C extends BASE {}\nconst a = new C()')).toEqual(['BASE'])
  })

  it('reads a decorated default export and a re-exported local', () => {
    expect(free('const x = 1\nexport { x as y }')).toEqual([])
    expect(free('export default VALUE')).toEqual(['VALUE'])
  })
})

describe('the reader reads no name out of a slot that binds nothing', () => {
  it('reads no name out of a property name, however the property is written', () => {
    expect(free('function a(o) { return o.hidden }')).toEqual([])
    expect(free('function a() { return { hidden: 1 } }')).toEqual([])
    expect(free('class C { hidden() { return 1 } }\nconst a = new C()')).toEqual([])
    expect(free('class C { hidden = 1 }\nconst a = new C()')).toEqual([])
    expect(free('class C { accessor hidden = 1 }\nconst a = new C()')).toEqual([])
  })

  it('reads no name out of a label, wherever the label is written', () => {
    expect(free('function a(n) { outer: for (;;) { break outer } return n }')).toEqual([])
    expect(free('function a(n) { outer: for (;;) { continue outer } return n }')).toEqual([])
  })

  it("reads no name out of an import's remote name, and does bind its local one", () => {
    expect(free("import { remote as local } from './x.ts'\nfunction a() { return local }")).toEqual([])
    expect(free("import { remote } from './x.ts'\nfunction a() { return remote }")).toEqual([])
  })

  it('reads no name out of either half of an export specifier', () => {
    // Both halves name something already declared here, and the reader would
    // otherwise report the exported alias as a name nothing binds.
    expect(free('const local = 1\nexport { local as exported }')).toEqual([])
  })

  it('reads no name out of a meta property, which names no binding at all', () => {
    expect(free('function a() { return import.meta.url }')).toEqual([])
    expect(free('function a() { return new.target }')).toEqual([])
  })
})

describe('the reader binds every declaration form', () => {
  it('binds a name a switch case declares, for the whole switch', () => {
    expect(free('function a(x) { switch (x) { case 1: { const y = 1; return y } default: return 0 } }')).toEqual([])
    expect(free('function a(x) { switch (x) { case 1: const y = 1; return y; default: return 0 } }')).toEqual([])
  })

  it('binds the name of a class expression inside its own body', () => {
    expect(free('const a = class Named { m() { return Named } }')).toEqual([])
  })

  it('binds a name a static block declares, and nothing outside it', () => {
    expect(free('class C { static { const x = 1; globalThis.y = x } }\nconst a = new C()')).toEqual(['globalThis'])
  })

  it('binds every head of every loop form', () => {
    expect(free('function a(list) { for (const item of list) { item() } }')).toEqual([])
    expect(free('function a(o) { for (const key in o) { o[key] } }')).toEqual([])
    expect(free('function a(n) { for (let i = 0, j = 1; i < n; i += 1) { n = i + j } }')).toEqual([])
    expect(free('function a(list) { for (const [x, y] of list) { x(y) } }')).toEqual([])
  })
})

describe('the reader binds what a scope hoists', () => {
  it('binds a var out of every nested block, but not out of a nested function', () => {
    expect(free('function a() { { { var x = 1 } } return x }')).toEqual([])
    expect(free('function a() { for (;;) { var x = 1 } return x }')).toEqual([])
    expect(free('function a() { try { var x = 1 } catch { } return x }')).toEqual([])
    expect(free('function a() { switch (1) { case 1: var x = 1 } return x }')).toEqual([])
    // A `var` inside a nested function belongs to that function, not to this one.
    expect(free('function a() { function inner() { var x = 1; return x } return x }')).toEqual(['x'])
  })

  it('binds a function declaration nested in a block, where it is hoisted to', () => {
    expect(free('function a() { { function inner() { return 1 } } return inner() }')).toEqual([])
  })

  it('binds an exported declaration, which is a declaration first', () => {
    expect(free('export function a() { return b() }\nexport function b() { return 1 }')).toEqual([])
    expect(free('export const T = 1\nfunction a() { return T }')).toEqual([])
    expect(free('export class C {}\nconst a = new C()')).toEqual([])
    expect(free('export default function a() { return a }')).toEqual([])
  })

  it('binds every name a destructuring pattern introduces, however deep', () => {
    expect(free('function a({ x: { y: [z = 1, ...rest] } }) { return z + rest }')).toEqual([])
    expect(free('function a() { const { x, ...rest } = SOURCE; return x + rest }')).toEqual(['SOURCE'])
    expect(free('function a() { const [, second] = SOURCE; return second }')).toEqual(['SOURCE'])
  })

  it('binds a function expression by its own name, inside itself', () => {
    expect(free('const a = function named() { return named }')).toEqual([])
  })

  it('binds a catch parameter, and admits a catch that names none', () => {
    expect(free('function a(b) { try { b() } catch (err) { return err } }')).toEqual([])
    expect(free('function a(b) { try { b() } catch { return 1 } }')).toEqual([])
  })
})

describe('the reader answers about a source it cannot read', () => {
  it('says so, naming the parser’s reason', () => {
    const said = free('function (').join(' ')
    expect(said).toContain('this source does not parse')
    expect(said.length).toBeGreaterThan('this source does not parse: '.length)
  })

  it('reads a dialect off the label it is given', () => {
    // The injected sources arrive as plain script; the gates read TypeScript.
    expect(freeNames('fixture.ts', 'function a(x: number): number { return x }')).toEqual([])
  })
})
