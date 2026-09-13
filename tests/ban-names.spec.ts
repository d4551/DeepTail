/**
 * The ban on a name that says the code stands in for something, and the file
 * the parser refuses outright.
 *
 * A debt word is a claim about intent, and a name is where intent is read, so
 * the rule follows the name through every declaration a file can carry. The
 * other bans are held in `ban-rules.spec.ts`, and the shapes of the gate
 * itself in `gates.spec.ts`.
 */

import { describe, expect, it } from 'bun:test'
import { admitted, bans, joined, refused } from './fixtures.ts'

describe('the ban on a name that says the code stands in for something', () => {
  const why = 'this name says the code stands in for something real; name what it does, or remove the debt'

  it('refuses a debt word wherever a name is written, in each casing a name uses', () => {
    refused(why, [
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
    refused(why, [['const readStubRow = 1'], ['const rowsAreFake = 1']])
  })

  it('refuses one in a declaration of any kind, a member or a parameter included', () => {
    refused(why, [
      ['interface FakeRow { id: string }'],
      ['type LegacyRow = { id: string }'],
      ['const row = { mockId: 1 }'],
      ['function read(stubRow) { return stubRow }'],
      ['const { fakeRow } = source'],
      ['const [firstMock] = rows'],
      ['class Reader { dummyRow = 1 }'],
    ])
  })

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
