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

describe('the depth reader counts compounds by how a selector reaches', () => {
  it('counts a chain written with no spaces around its combinators', () => {
    expect(deepSelectors('.a>.b>.c>.d { color: red }')).toEqual([{ selector: '.a>.b>.c>.d', line: 1 }])
    expect(deepSelectors('.a>.b>.c { color: red }')).toEqual([])
  })

  it('counts a chain written with spaces on one side of its combinators', () => {
    expect(deepSelectors('.a >.b> .c ~.d { color: red }')).toEqual([{ selector: '.a >.b> .c ~.d', line: 1 }])
  })

  it('counts a descendant chain however wide its whitespace', () => {
    expect(deepSelectors('.a  .b   .c    .d { color: red }')).toEqual([{ selector: '.a .b .c .d', line: 1 }])
  })

  it('counts each selector of a list on its own', () => {
    expect(deepSelectors('.a .b .c .d,\n.e { color: red }').map((one) => one.selector)).toEqual(['.a .b .c .d'])
  })

  it('counts a compound with several classes as the one compound it is', () => {
    expect(deepSelectors('.a.b.c.d.e { color: red }')).toEqual([])
  })

  it('counts nothing where a selector leads with a combinator, which reaches no further', () => {
    // The split leaves an empty piece where a separator opens the selector, and
    // an empty piece is not a compound: counting it would report a two-compound
    // selector as three.
    expect(deepSelectors('.x { > .b .c .d { color: red } }').map((one) => one.selector)).toEqual([])
  })
})

describe('the focus-ring reader reads only what can carry a ring', () => {
  it('says nothing about an at-rule, whose block holds descriptors rather than a rule', () => {
    expect(unringedSelectors('@font-face { outline: none; }')).toEqual([])
    expect(unringedSelectors('@media (forced-colors: active) { .a { outline: none } }')).toEqual(['.a'])
  })

  it('says nothing about a block with no selector, which hides a ring on nothing', () => {
    expect(unringedSelectors('{ outline: none; }')).toEqual([])
  })

  it('reads a restoration only from the state that restores it', () => {
    // A ring painted on some other selector is a ring the hidden element never
    // gets: the restoration has to be on the selector that did the hiding.
    expect(unringedSelectors('.a { outline: none; }\n.b { outline: 2px solid red; }')).toEqual(['.a'])
    expect(unringedSelectors('.a { outline: none; }\n.a:hover { outline: 2px solid red; }')).toEqual(['.a'])
  })

  it('reads a restoration written beside others in one selector list', () => {
    expect(
      unringedSelectors('.a, .b { outline: none; }\n.a:focus-visible, .b:focus-visible { outline: 2px solid red; }'),
    ).toEqual([])
    expect(unringedSelectors('.a, .b { outline: none; }\n.a:focus-visible { outline: 2px solid red; }')).toEqual(['.b'])
  })
})

describe('the focus-ring reader reads what each rule does, not what it might', () => {
  it('reads no restoration out of a rule that paints no ring', () => {
    // Only a ring property paints a ring: a rule that sets a colour on the
    // focus-visible state restores nothing, and the ring is still gone.
    expect(unringedSelectors('.a { outline: none; }\n.a:focus-visible { color: red; }')).toEqual(['.a'])
    expect(unringedSelectors('.a { outline: none; }\n.a:focus-visible { background: red; }')).toEqual(['.a'])
  })
})

describe('the focus-ring reader reads which state paints the ring back', () => {
  it('reads a restoration only from the focus-visible state, not from a further one', () => {
    // A ring painted on the first of a type, or only while hovered, is a ring
    // the element does not get back when it is merely focused from the
    // keyboard.
    expect(unringedSelectors('.a { outline: none; }\n.a:first-of-type { outline: 2px solid red; }')).toEqual(['.a'])
    expect(unringedSelectors('.a { outline: none; }\n.a:focus-visible:hover { outline: 2px solid red; }')).toEqual([
      '.a',
    ])
    expect(unringedSelectors('.a { outline: none; }\n.a:focus-visible { outline: 2px solid red; }')).toEqual([])
  })

  it('reads a selector across every rule that names it', () => {
    // The idiomatic custom ring: the user agent's outline switched off and a
    // shadow painted in its place, written together. Read a rule at a time,
    // the first half is a ring removed and the second half is a ring painted
    // on a selector nothing asked about.
    expect(unringedSelectors('.a:focus-visible { outline: none; box-shadow: 0 0 0 2px red; }')).toEqual([])
    expect(
      unringedSelectors('.a:focus-visible { outline: none; }\n.a:focus-visible { box-shadow: 0 0 0 2px red; }'),
    ).toEqual([])
    // And a selector that only ever hides is still reported, however many
    // rules it takes to do it.
    expect(unringedSelectors('.a { outline: none; }\n.a { color: red; }')).toEqual(['.a'])
  })

  it('reads no restoration from a bare state with nothing in front of it', () => {
    expect(unringedSelectors('.a { outline: none; }\n:focus-visible { outline: 2px solid red; }')).toEqual(['.a'])
  })
})
