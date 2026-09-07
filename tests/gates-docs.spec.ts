/**
 * The ban gate's doc-comment rule: a block that documents nothing.
 *
 * Split from `gates.spec.ts` when it outgrew the size the linter allows a file.
 * A doc comment attaches to whatever follows it, so one immediately followed by
 * another attaches to nothing — which is what a split leaves behind when the
 * declaration moves and its documentation stays. Two shipped that way, one of
 * them in product code, and no gate read either. A file's opening block is
 * read by the same predicate as every other block: it is attached when it
 * names its subject — `@module` names the file itself — and stranded when it
 * names nothing.
 */

import { describe, expect, it } from 'bun:test'
import { banOffences, source } from './fixtures.ts'

/** The one reason this rule reports. */
const STRANDED = 'this doc comment is followed by another, so it documents nothing; move it to what it describes'

/** A counting function, so every fixture below ends in a real declaration. */
const COUNT = ['export function count(): number {', '  return 1', '}'] as const

/**
 * The reasons one assembled fixture is rejected for.
 * @param lines - the lines of the fixture, before the counting function.
 * @returns one reason per offence.
 */
function reasons(...lines: readonly string[]): string[] {
  return banOffences(source(...lines, ...COUNT))
}

describe('the ban gate rejects a doc comment that documents nothing', () => {
  it('a block immediately followed by another, which is what a split leaves behind', () => {
    // The function moved and its documentation stayed: the stranded block goes
    // on describing a contract at a place that does not hold it, and the
    // function that does hold it is left with none. Two of these shipped.
    expect(reasons("import { x } from './x.ts'", '/** Build a thing. */', '/** Count the things. */')).toEqual([
      STRANDED,
    ])
  })

  it('the second of three, as well as the first', () => {
    expect(reasons("import { x } from './x.ts'", '/** One. */', '/** Two. */', '/** Three. */')).toEqual([
      STRANDED,
      STRANDED,
    ])
  })

  it('a block stranded by a blank line rather than by nothing at all', () => {
    expect(reasons("import { x } from './x.ts'", '/** Build a thing. */', '', '/** Count the things. */')).toEqual([
      STRANDED,
    ])
  })

  it('a block stranded across a note, which consumes neither of them', () => {
    // A line comment attaches to nothing, so the doc block above it is as
    // stranded as if the note were not there; reading only what lies between
    // two doc blocks would have called this pair fine.
    expect(reasons("import { x } from './x.ts'", '/** Build. */', '// a note', '/** Count. */')).toEqual([STRANDED])
    expect(reasons("import { x } from './x.ts'", '/** Build. */', '/* a plain block */', '/** Count. */')).toEqual([
      STRANDED,
    ])
  })

  it("a file's opening block, which is stranded when it names no subject", () => {
    // The first block is read by the same predicate as every other: followed
    // only by another doc block, it is stranded unless it names what it
    // documents. A bare opening block names nothing, so it is stranded like
    // any other.
    expect(reasons('/**', ' * What this module is for.', ' */', '/** Count the things. */')).toEqual([STRANDED])
  })
})

describe('the ban gate allows a doc comment that documents something', () => {
  it('a block with a declaration under it, however many follow', () => {
    expect(
      reasons("import { x } from './x.ts'", '/** Build. */', 'const built = x', '/** Count the things. */'),
    ).toEqual([])
  })

  it('a block that names its subject, which is the module itself', () => {
    // `@module` is not a switch and names no exemption: it is the block stating
    // what it documents, the same way `@param` states what a function's
    // documentation describes. The subject — the file — exists, so the block
    // documents something.
    expect(reasons('/**', ' * What this module is for.', ' * @module', ' */', '/** Count. */')).toEqual([])
  })

  it("a module block with the file's imports under it, however many follow", () => {
    // Code between two blocks is what the first documents, and an import is
    // code: a module doc above the imports is read by the rule as attached to
    // them, exactly as any other block is attached to its declaration.
    expect(reasons('/**', ' * What this module is for.', ' */', "import { x } from './x.ts'", '/** Count. */')).toEqual(
      [],
    )
  })

  it('a note above a doc block, which claims to document nothing', () => {
    expect(reasons("import { x } from './x.ts'", '// a note about what follows', '/** Count. */')).toEqual([])
    expect(reasons("import { x } from './x.ts'", '/* a plain block */', '/** Count. */')).toEqual([])
  })

  it('a block whose declaration is annotated, so a note sits between the two', () => {
    expect(
      reasons("import { x } from './x.ts'", '/** Build. */', '// why this value', 'const built = x', '/** Count. */'),
    ).toEqual([])
  })
})
