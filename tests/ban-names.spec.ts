/**
 * The ban on a name that says the code stands in for something, and the file
 * the parser refuses outright.
 *
 * A debt word is a claim about intent, and a name is where intent is read, so
 * the rule follows the name through every declaration a file can carry. The
 * suites below split that walk by where the name is written — as a name, in a
 * declaration or a parameter, in a pattern, in an enum member, and in the
 * positions that must stay silent — and each is short enough to read as a table
 * of the shapes it covers. The other bans are held in `ban-rules.spec.ts`, and
 * the shapes of the gate itself in `gates.spec.ts`.
 */

import { describe, expect, it } from 'bun:test'
import { admitted, bans, joined, refused } from './fixtures.ts'

/** The one reason the debt-word rule reports. */
const DEBT = 'this name says the code stands in for something real; name what it does, or remove the debt'

describe('the ban on a debt word written as a name', () => {
  it('refuses the word wherever a name is written, in each casing a name uses', () => {
    refused(DEBT, [
      ['function stubDeps() { return 1 }'],
      ['class FakeSocket {}'],
      ['const MOCK_ROWS = []'],
      ['const temporaryRows = 1'],
      ['const compat_layer = 1'],
      ['function noopPaint() { return 1 }'],
      ['const fetchShim = 1'],
      ['class LocalePolyfill {}'],
      ['const uiBarrel = 1'],
    ])
  })

  it('refuses the word wherever it sits in the name, not only at its head', () => {
    refused(DEBT, [['const readStubRow = 1'], ['const rowsAreFake = 1']])
  })
})

describe('the ban on a debt word in a declaration, a member or a parameter', () => {
  it('refuses one in a declaration of any kind, a member or a parameter included', () => {
    refused(DEBT, [
      ['interface FakeRow { id: string }'],
      ['type LegacyRow = { id: string }'],
      ['const row = { mockId: 1 }'],
      ['function read(stubRow) { return stubRow }'],
      ['const { fakeRow } = source'],
      ['const [firstMock] = rows'],
      ['class Reader { dummyRow = 1 }'],
    ])
  })

  it('refuses one wherever a member of a type is named, called or declared', () => {
    // A member definition, a type member and a method signature each write a
    // name this file chose, and each is read under its own node type: a rule
    // that knew one of the three would miss the other two, which is every
    // interface in a file.
    refused(DEBT, [
      ['class Reader { readMockRow() { return 1 } }'],
      ['interface Row { stubId: string }'],
      ['interface Row { readStubRow(id: string): void }'],
    ])
  })

  it('refuses one in the parameters of every form that declares a function', () => {
    // A parameter is a name this file chose however the function is written:
    // an arrow, a function expression, a type-only declaration and a function
    // type each carry their own list, and each is a separate node to read.
    refused(DEBT, [
      ['const read = (stubRow) => stubRow'],
      ['const read = function (dummyRow) { return dummyRow }'],
      ['declare function read(fakeRow: number): void'],
      ['type Reader = (mockRow: number) => void'],
      ['interface Row { read(stubRow: number): void }'],
    ])
  })
})

describe('the ban on a debt word in a pattern and in an enum member', () => {
  it('refuses one wherever a destructuring pattern introduces it', () => {
    // A pattern binds names as surely as a plain declarator does, and the name
    // may sit under a default, under a rest, or inside another pattern: each is
    // a different walk to the identifier that names the binding.
    refused(DEBT, [
      ['const { row: stubRow = fallback } = source'],
      ['const { ...stubRest } = source'],
      ['const { rows: [temporaryFirst] } = source'],
      ['function read({ id: fakeId }) { return fakeId }'],
    ])
  })

  it('refuses one in an enum member, beside the ban the enum itself carries', () => {
    // An enum is refused on its own account, so this case holds both reasons
    // rather than one: what it is here for is the member, which the enum's own
    // refusal would otherwise stand in front of.
    const found = bans('enum Colour { FIXME }')
    expect(found).toHaveLength(2)
    expect(found).toContain('an enum is TypeScript 6 syntax; use a union of string literals or as const')
    expect(found).toContain(DEBT)
  })
})

describe('the names the ban on a debt word admits', () => {
  it('admits a name that merely contains the letters, which claims nothing', () => {
    // A rule matching substrings would refuse `broadcast` for `cast` and
    // `company` for `any`, which is a rule nobody could satisfy.
    admitted([['const broadcast = 1'], ['const company = 1'], ['const template = 1'], ['const stubborn = 1']])
  })

  it('admits a member of an API this repository did not name, which it cannot rename', () => {
    // `input.placeholder` is the DOM's own property and `it.todo` is the test
    // runner's own modifier — which the ban above refuses on its own terms.
    admitted([['input.placeholder = text'], ['const key = row["mockId"]']])
  })

  it('admits a member whose key is computed, which is an expression rather than a name', () => {
    // The pair is what makes the rule readable: `{ stubName: 1 }` writes a name
    // this file chose and is refused, while `{ [stubName]: 1 }` writes whatever
    // that binding holds — a key the source computes rather than a claim this
    // file makes. Reading the second as a claim is reading the wrong thing, and
    // a rule without the distinction would refuse both.
    refused(DEBT, [['const row = { stubName: 1 }']])
    admitted([
      [joined('const row = { [st', 'ubName]: 1 }')],
      [joined('class Reader { [st', 'ubName]() { return 1 } }')],
    ])
  })

  it('admits the word as data, because a table of banned words is not a name', () => {
    admitted([[joined('const words = ["st', 'ub', 'fa', 'ke"]')]])
  })
})

describe('a file the parser refuses', () => {
  it('is refused with the reason it cannot be checked, rather than read as far as it got', () => {
    // A parse that stops halfway leaves nothing to walk, so the gate says so
    // instead of reporting the constructs it never saw.
    const found = bans('function (')
    expect(found.length).toBeGreaterThan(0)
    expect(found.every((why) => why.startsWith('this file does not parse, so it cannot be checked: '))).toBe(true)
  })
})
