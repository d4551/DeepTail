/**
 * The suppression ban as it reads Rust, driven both ways.
 *
 * Rust is the one language the ban reads without a parser, and the reader it
 * had ran a fixed distance forward from `#[` instead of to the bracket that
 * closed it. `#[cfg(test)]` above a module whose body called `.expect(…)` was
 * reported as a lint suppression, so the gate was red on a clean tree and the
 * only rule stated about Rust had no case proving it could stay quiet.
 *
 * Every case below is paired: an attribute that suppresses a lint must be
 * rejected, and each shape that merely resembles one must not be. The lint
 * levels are spelt in parts, so this file's own lines are not the directives
 * its fixtures carry — the same convention the directive suite follows.
 */

import { describe, expect, it } from 'bun:test'
import * as bans from '../scripts/ban-gate.ts'

/** The reason for each offence a Rust source is rejected for. */
function rustOffences(text: string): string[] {
  return bans.scanSource('src/lib.rs', text).map((offence) => offence.why)
}

/** The line each offence is reported at. */
function rustLines(text: string): number[] {
  return bans.scanSource('src/lib.rs', text).map((offence) => offence.line)
}

/** What a suppression is reported as. */
const SUPPRESSED = 'suppressing a Rust lint hides the defect'

/** What an attribute no bracket closes is reported as. */
const UNCLOSED = 'this attribute never closes, so it cannot be checked'

/** The lint-scoped suppression levels, assembled so no line here is one. */
const ALLOW = ['al', 'low'].join('')
const EXPECT = ['exp', 'ect'].join('')

describe('the Rust suppression ban rejects', () => {
  it('an outer, inner, or spaced lint attribute', () => {
    expect(rustOffences(`#[${ALLOW}(dead_code)]`)).toEqual([SUPPRESSED])
    expect(rustOffences(`#![${ALLOW}(dead_code)]`)).toEqual([SUPPRESSED])
    expect(rustOffences(`#[${EXPECT}(dead_code)]`)).toEqual([SUPPRESSED])
    expect(rustOffences(`#[ ${ALLOW} ( dead_code ) ]`)).toEqual([SUPPRESSED])
  })

  it('one written across lines, or nested inside another attribute', () => {
    expect(rustOffences(`#[\n    ${ALLOW}(dead_code)\n]\nfn x() {}`)).toEqual([SUPPRESSED])
    expect(rustOffences(`#[cfg_attr(all(), ${ALLOW}(dead_code))]\nfn x() {}`)).toEqual([SUPPRESSED])
    expect(rustOffences(`#[cfg_attr(test, ${EXPECT}(unused_variables))]\nfn x() {}`)).toEqual([SUPPRESSED])
  })

  it('one carrying a bracket in a string, which closes no attribute', () => {
    expect(rustOffences(`#[cfg_attr(feature = "a]b", ${ALLOW}(dead_code))]\nfn x() {}`)).toEqual([SUPPRESSED])
    expect(rustOffences(`#[cfg_attr(feature = r#"a]b"#, ${ALLOW}(dead_code))]\nfn x() {}`)).toEqual([SUPPRESSED])
  })

  it('one no bracket closes, rather than reading past the end of it', () => {
    // The unclosed attribute is what a fixed-distance reader turned into a walk
    // over the rest of the file. It is refused as unreadable instead.
    expect(rustOffences(`#[${ALLOW}(dead_code)\nfn x() {}`)).toEqual([UNCLOSED])
  })

  it('at the line the attribute opens on, not where the walk ended', () => {
    expect(rustLines(`fn a() {}\n\n#[${ALLOW}(dead_code)]\nfn b() {}`)).toEqual([3])
    expect(rustLines(`#[\n\n    ${ALLOW}(dead_code)\n]\nfn b() {}`)).toEqual([1])
  })

  it('every attribute in a file, not only the first', () => {
    expect(rustOffences(`#[${ALLOW}(dead_code)]\nfn a() {}\n#[${EXPECT}(unused)]\nfn b() {}`)).toEqual([
      SUPPRESSED,
      SUPPRESSED,
    ])
  })
})

describe('the Rust suppression ban allows', () => {
  it('a test module whose body unwraps with .expect', () => {
    // This is the shape that made the gate red on a clean tree: the attribute
    // is `cfg(test)`, and the `.expect(` belongs to a call several lines down.
    const source = [
      '#[cfg(test)]',
      'mod tests {',
      '    use super::*;',
      '',
      '    #[test]',
      '    fn holds() {',
      '        let table = registry().lock().expect("a fresh table");',
      '        assert!(table.is_empty());',
      '    }',
      '}',
    ].join('\n')
    expect(rustOffences(source)).toEqual([])
  })

  it('a method call named like a lint level, however it is reached', () => {
    expect(rustOffences('let value = maybe.expect("a value");')).toEqual([])
    expect(rustOffences('#[derive(Debug)]\nstruct S;\nfn f() { s.expect("x"); }')).toEqual([])
    expect(rustOffences(`fn f() { registry.${ALLOW}("x"); }`)).toEqual([])
  })
})

describe('the Rust suppression ban leaves ordinary Rust alone', () => {
  it('an attribute that names no lint level', () => {
    for (const attribute of [
      '#[cfg(test)]',
      '#[test]',
      '#[derive(Debug, Clone)]',
      '#[serde(rename_all = "camelCase")]',
      '#[tauri::command]',
      '#![no_std]',
    ]) {
      expect([attribute, rustOffences(`${attribute}\nfn x() {}`)]).toEqual([attribute, []])
    }
  })

  it('a lint level named inside a string the attribute carries', () => {
    expect(rustOffences(`#[doc = "${ALLOW}(dead_code) is banned here"]\nfn x() {}`)).toEqual([])
    expect(rustOffences(`#[doc = r##"${EXPECT}(unused) is banned here"##]\nfn x() {}`)).toEqual([])
  })

  it('a lifetime, which opens no literal for the walk to run past', () => {
    expect(rustOffences(`#[derive(Debug)]\nstruct S<'a> { name: &'a str }\nfn f() { s.expect("x"); }`)).toEqual([])
  })

  it('prose that names a lint level outside any attribute', () => {
    expect(rustOffences(`// this crate does not ${ALLOW} (any) suppressions`)).toEqual([])
    expect(rustOffences('/// Returns the value, or panics with expect (see below).')).toEqual([])
  })
})
