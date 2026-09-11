/**
 * The reader that says what a piece of source reaches for but does not carry.
 *
 * Its answers decide whether the injected-source gate reports anything at all,
 * so every binding form is stated here as a case: a name it wrongly thinks is
 * bound is a defect it will never report again. The property-name shapes live
 * once, in `free-names-forms.spec.ts`, which holds the rest of the language.
 */

import { describe, expect, it } from 'bun:test'
import { free } from './fixtures.ts'

describe('the free-name reader', () => {
  it('reports a name nothing in the source binds', () => {
    expect(free('function a() { return TABLE.x }')).toEqual(['TABLE'])
  })

  it('binds a parameter, including a destructured and a defaulted one', () => {
    expect(free('function a(x) { return x }')).toEqual([])
    expect(free('function a({ x, y: z }) { return x + z }')).toEqual([])
    expect(free('function a([x, ...rest]) { return x + rest }')).toEqual([])
    expect(free('function a(x = 1) { return x }')).toEqual([])
    expect(free('const a = (x) => x')).toEqual([])
  })

  it('binds a declaration used before it is written', () => {
    expect(free('function a() { return b() }\nfunction b() { return 1 }')).toEqual([])
    expect(free('function a() { return T }\nconst T = 1')).toEqual([])
  })

  it('binds a var hoisted out of a nested block', () => {
    expect(free('function a() { if (1) { var x = 2 } return x }')).toEqual([])
  })

  it('binds a let, a class, a catch parameter and a loop head', () => {
    expect(free('function a() { let x = 1; return x }')).toEqual([])
    expect(free('class C {}\nconst a = new C()')).toEqual([])
    expect(free('function a() { try { b() } catch (err) { return err } }\nfunction b() {}')).toEqual([])
    expect(free('function a(list) { for (const item of list) { item() } }')).toEqual([])
    expect(free('function a(n) { for (let i = 0; i < n; i += 1) { n = i } }')).toEqual([])
  })
})

describe('the binding forms the reader has to know', () => {
  it('binds an imported name', () => {
    expect(free("import { T } from './x.ts'\nfunction a() { return T }")).toEqual([])
    expect(free("import D from './x.ts'\nfunction a() { return D }")).toEqual([])
    expect(free("import * as N from './x.ts'\nfunction a() { return N.y }")).toEqual([])
  })

  it('reads no reference out of a label, which names a jump and not a value', () => {
    expect(free('function a(o) { outer: for (;;) { break outer } return o }')).toEqual([])
  })

  it('reads a name a nested function reaches past its own scope for', () => {
    expect(free('function a() { return () => LOOKUP.get(1) }')).toEqual(['LOOKUP'])
    expect(free('function a(x) { return function b(y) { return x + y + Z } }')).toEqual(['Z'])
  })

  it('reports a name bound only inside another function', () => {
    // The hole a whole-program name sweep would have: `inner` binds `token`,
    // and a reader that pooled every binding would call the free read below
    // bound.
    expect(free('function inner(token) { return token }\nfunction outer() { return token }')).toEqual(['token'])
  })

  it('reports each free name once, sorted', () => {
    expect(free('function a() { return B() + C() + B() }')).toEqual(['B', 'C'])
  })

  it('says so when the source does not parse', () => {
    expect(free('function (').join(' ')).toContain('does not parse')
  })
})
