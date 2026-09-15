/**
 * The reader that says what a piece of source reaches for but does not carry.
 *
 * Its answers decide whether the injected-source gate reports anything at all,
 * so every binding form is stated here as a case: a name it wrongly thinks is
 * bound is a defect it will never report again. The shapes `free-names-forms.spec.ts`
 * holds — property names, labels, hoisting, catch heads, loop heads,
 * destructuring and the parse refusal — are stated there once and not here.
 */

import { describe, expect, it } from 'bun:test'
import { free } from './fixtures.ts'

/** Sources whose every name the reader must see as bound. */
const BOUND: readonly string[] = [
  'function a(x) { return x }',
  'const a = (x) => x',
  'function a() { return b() }\nfunction b() { return 1 }',
  'function a() { return T }\nconst T = 1',
  'function a() { let x = 1; return x }',
  'class C {}\nconst a = new C()',
  "import { T } from './x.ts'\nfunction a() { return T }",
  "import D from './x.ts'\nfunction a() { return D }",
  "import * as N from './x.ts'\nfunction a() { return N.y }",
]

describe('the free-name reader', () => {
  it('reports a name nothing in the source binds', () => {
    expect(free('function a() { return TABLE.x }')).toEqual(['TABLE'])
  })

  it('binds every name these sources declare', () => {
    for (const source of BOUND) expect(free(source)).toEqual([])
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
})
