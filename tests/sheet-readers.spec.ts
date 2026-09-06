/**
 * The reader suites the stylesheet gate is built on.
 *
 * The readers a sheet is parsed with — selector reach, focus rings — are their
 * own concern, proved apart from the gate's accept/reject rules so a reader
 * regression cannot hide among them. The ruleset reader's own suite is
 * sheet-reader.spec.ts.
 */

import { describe, expect, it } from 'bun:test'
import { unringedSelectors } from '../scripts/focus-ring-gate.ts'
import { deepSelectors } from '../scripts/sheet-gate.ts'

describe('the depth reader', () => {
  it('names the rule a selector opens, not just the selector', () => {
    expect(deepSelectors('.a { color: red; }\n.b .c .d .e { color: blue; }')).toEqual([
      { selector: '.b .c .d .e', line: 2 },
    ])
  })

  it('reads no depth out of a comment, so prose cannot be a chain', () => {
    expect(deepSelectors('/* .a .b .c .d { color: red } */\n.e { color: blue; }')).toEqual([])
  })
})

describe('the focus-ring reader', () => {
  it('names a selector that hides the ring and writes none back', () => {
    expect(unringedSelectors('.a { outline: none; }')).toEqual(['.a'])
    expect(unringedSelectors('.a, .b { outline: 0; }')).toEqual(['.a', '.b'])
  })

  it('says nothing about a selector that restores its own ring', () => {
    expect(unringedSelectors('.a { outline: none; }\n.a:focus-visible { outline: 2px solid red; }')).toEqual([])
    expect(unringedSelectors('.a { outline: none; }\n.a:focus-visible { box-shadow: 0 0 0 2px red; }')).toEqual([])
  })

  it('does not count a ring that is itself switched off', () => {
    // Both rules hide and neither paints, so both are named: a `:focus-visible`
    // rule that sets `outline: none` is the last place the ring could have come
    // from, and pointing only at the class would hide where it was lost.
    expect(unringedSelectors('.a { outline: none; }\n.a:focus-visible { outline: none; }')).toEqual([
      '.a',
      '.a:focus-visible',
    ])
  })

  it('says nothing about a sheet that hides no ring', () => {
    expect(unringedSelectors('.a { color: red; }')).toEqual([])
    expect(unringedSelectors('.a { outline: 2px solid red; }')).toEqual([])
  })

  it('reads a declaration the way the shared reader does, quotes and all', () => {
    // This module split rule text on its own, which is a second notion of
    // where a declaration ends: a semicolon inside a quoted value ended one,
    // so a rule could be read as hiding a ring it never touches, and a rule
    // that paints one could be read as painting nothing.
    expect(unringedSelectors('.a { content: "x; outline: none"; }')).toEqual([])
    expect(
      unringedSelectors('.a { outline: none; }\n.a:focus-visible { content: "y; z"; outline: 2px solid red; }'),
    ).toEqual([])
  })

  it('reads a nested rule, which hides a ring exactly as any other does', () => {
    expect(unringedSelectors('.a { color: red; .b { outline: none } }')).toEqual(['.b'])
  })
})
