/**
 * How a Rust attribute is read, literal by literal.
 *
 * Rust has no parser here, so an attribute is read to the bracket that closes
 * it — and a bracket written inside a literal closes nothing. Every literal
 * form Rust has is a separate way for the walk to run off the end of an
 * attribute and read the code after it as part of one, which is exactly what
 * turned every `#[cfg(test)]` module into an offence once.
 */

import { describe, expect, it } from 'bun:test'
import { LINT_LEVEL, rustAttributes } from '../scripts/rust-attributes.ts'

/** What one source's attributes hold, in source order. */
function held(text: string): (string | undefined)[] {
  return rustAttributes(text).map((attribute) => attribute.held)
}

describe('the attribute reader', () => {
  it('reads an outer and an inner attribute alike', () => {
    expect(held('#[derive(Debug)]\nstruct A;')).toEqual(['derive(Debug)'])
    expect(held('#![allow(dead_code)]')).toEqual(['allow(dead_code)'])
  })

  it('reads nested brackets as one attribute', () => {
    expect(held('#[cfg_attr(all(), allow(dead_code))]')).toEqual(['cfg_attr(all(), allow(dead_code))'])
    expect(held('#[a[b[c]]]')).toEqual(['a[b[c]]'])
  })

  it('reads every attribute in a file, in the order they are written', () => {
    expect(held('#[a]\nfn f() {}\n#[b]\nfn g() {}')).toEqual(['a', 'b'])
  })

  it('reports where each attribute opens', () => {
    expect(rustAttributes('fn f() {}\n#[a]').map((one) => one.start)).toEqual([10])
  })

  it('says it cannot read an attribute no bracket closes', () => {
    expect(held('#[derive(Debug)\nstruct A;')).toEqual([undefined])
  })

  it('reads nothing where a file carries no attribute', () => {
    expect(held('fn f() {}')).toEqual([])
    expect(held('')).toEqual([])
  })
})

/**
 * What an attribute holds once one literal inside it has been blanked.
 *
 * Computed from the literal rather than counted by hand: the contract is that a
 * literal is replaced by exactly as many spaces as it occupied, so every offset
 * after it stays true.
 * @param literal - the literal as it is written.
 * @returns what the attribute should hold.
 */
function blanked(literal: string): string {
  return `doc = ${' '.repeat(literal.length)}`
}

describe('the attribute reader steps over every literal Rust writes', () => {
  it('steps over a plain string, so a bracket inside one closes nothing', () => {
    const literal = '"a ] bracket"'
    expect(held(`#[doc = ${literal}]\nstruct A;`)).toEqual([blanked(literal)])
  })

  it('steps over an escape inside a string, so an escaped quote does not close it', () => {
    const literal = String.raw`"a \" ] quote"`
    expect(held(`#[doc = ${literal}]\nstruct A;`)).toEqual([blanked(literal)])
  })

  it('steps over a byte string, which is a string with a prefix', () => {
    const literal = 'b"a ] bracket"'
    expect(held(`#[doc = ${literal}]\nstruct A;`)).toEqual([blanked(literal)])
  })

  it('steps over a raw string, at every number of hashes and with a byte prefix', () => {
    for (const literal of ['r"a ] bracket"', 'r#"a ] bracket"#', 'r###"a ] bracket"###', 'br#"a ] bracket"#']) {
      expect([literal, held(`#[doc = ${literal}]\nstruct A;`)]).toEqual([literal, [blanked(literal)]])
    }
  })

  it('reads a literal that never closes as running to the end of the file', () => {
    expect(held('#[doc = r#"unclosed]')).toEqual([undefined])
    expect(held('#[doc = "unclosed]')).toEqual([undefined])
  })

  it('steps over a character literal, escaped or not', () => {
    for (const literal of ["']'", String.raw`'\''`, String.raw`'\x5D'`, String.raw`'\u{5D}'`]) {
      expect([literal, held(`#[doc = ${literal}]\nstruct A;`)]).toEqual([literal, [blanked(literal)]])
    }
  })

  it('leaves a lifetime to the walk, which carries no bracket to miscount', () => {
    // A lone quote is a lifetime, not a literal. Reading it as one would run
    // to the next quote in the file and swallow whatever lies between.
    expect(held('#[doc = "x"]\nstruct A<\'a> { b: &\'a str }\n#[b]')).toEqual([blanked('"x"'), 'b'])
  })
})

describe('the lint-level pattern', () => {
  it('reads a level written as a path segment, spaced or not', () => {
    expect(LINT_LEVEL.test('allow(dead_code)')).toBe(true)
    expect(LINT_LEVEL.test('expect(dead_code)')).toBe(true)
    expect(LINT_LEVEL.test('allow (dead_code)')).toBe(true)
    expect(LINT_LEVEL.test('cfg_attr(all(), allow(dead_code))')).toBe(true)
  })

  it('reads no level out of a method call, which is reached through a dot', () => {
    expect(LINT_LEVEL.test('.expect("a fresh table")')).toBe(false)
    expect(LINT_LEVEL.test('value.allow(x)')).toBe(false)
  })

  it('reads no level out of a longer word that merely ends the same way', () => {
    expect(LINT_LEVEL.test('disallow(x)')).toBe(false)
    expect(LINT_LEVEL.test('re_expect(x)')).toBe(false)
    expect(LINT_LEVEL.test('a1expect(x)')).toBe(false)
  })

  it('reads no level where the name is not followed by its arguments', () => {
    expect(LINT_LEVEL.test('allow')).toBe(false)
    expect(LINT_LEVEL.test('expected')).toBe(false)
  })
})
