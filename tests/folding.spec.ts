/**
 * The shapes the folder reads nothing out of, and what it hands back instead.
 *
 * Constant folding is what closes the assembled-name routes, and the whole of
 * its ordinary vocabulary — literals, templates, concatenation, joins, case
 * shifts, character codes — is stated once in `folding-forms.spec.ts`. What is
 * stated here is the other half of the same contract: the input it declines.
 * Every one of these is a shape a rule could be handed, and the answer has to
 * be "no value" rather than a guess, because a guessed name is a rule that
 * judges something the source never wrote. Each is a separate way to guess, so
 * each is a case.
 */

import { describe, expect, it } from 'bun:test'
import { approximateString, constants, staticString } from '../scripts/fold.ts'
import { namesOf, nodeOfType, parsedBody } from './fixtures.ts'

/**
 * The value the folder binds one fixture's `subject` to.
 * @param source - a source declaring `const subject = …`.
 * @returns the folded value, or undefined when it declines to fold one.
 */
function folded(source: string): string | undefined {
  return constants(parsedBody(source)).get('subject') ?? undefined
}

/**
 * The value the folder reads out of the expression one fixture binds.
 * @param source - a source whose first declarator is the subject.
 * @returns the read value, or undefined when it declines to read one.
 */
function read(source: string): string | undefined {
  const declarator = nodeOfType(source, 'VariableDeclarator')
  return staticString(namesOf(source).constants, declarator['init'])
}

/**
 * A source whose subject reads a name the file goes on to declare.
 * @param declarations - the lines declaring that name.
 * @returns the source.
 */
function readingFrom(declarations: readonly string[]): string {
  return ['const subject = name', ...declarations].join('\n')
}

describe('the folder declines a string whose text is not readable', () => {
  it('reads nothing out of a template that carries no cooked text', () => {
    // A tagged template may carry an escape the untagged form refuses, and the
    // parse then holds the raw text with no cooked text beside it. Reading the
    // raw text instead would fold a name the source spells with a backslash.
    expect(folded('const subject = tag`\\u{XYZ}`')).toBeUndefined()
  })
})

describe('the folder declines a name two declarations disagree about', () => {
  it('reads nothing out of a constant the file bound twice to different strings', () => {
    // The table marks the name undecided rather than picking one of the two,
    // and reading it has to answer the same way: a rule that picked one would
    // judge the name the source did not write at that call.
    const source = readingFrom(['const name = "role"', 'const name = "style"'])
    expect(constants(parsedBody(source)).get('name')).toBeNull()
    expect(read(source)).toBeUndefined()
  })

  it('reads the one string it can when the file bound the name to it both times', () => {
    // The other side of the same rule, so the case above cannot pass by the
    // table having stopped recording the name at all.
    expect(read(readingFrom(['const name = "style"', 'const name = "style"']))).toBe('style')
  })
})

describe('the folder declines a string assembled from a part it cannot read', () => {
  it('reads nothing out of an array joined with a hole in it', () => {
    // A hole is a member the source never wrote. Reading it as an empty string
    // would fold a name shorter than the one the source spells.
    expect(folded('const subject = ["s", , "le"].join("")')).toBeUndefined()
  })
})

describe('the folder reads the calls that assemble a name from nothing', () => {
  it('reads the empty string a character call with no codes produces', () => {
    // No codes is no characters, which is a string all the same: answering
    // "cannot read" would make a rule treat a readable name as opaque.
    expect(folded('const subject = String.fromCharCode()')).toBe('')
    expect(folded('const subject = String.fromCodePoint()')).toBe('')
  })

  it('truncates each code in the sixteen-bit spelling and does not in the other', () => {
    // `fromCharCode` masks each argument to sixteen bits, which is the
    // behaviour it is defined by; the code-point sibling does not, and a reader
    // that treated the two alike would fold one of them wrongly.
    expect(folded('const subject = String.fromCharCode(65601)')).toBe('A')
    expect(folded('const subject = String.fromCodePoint(65601)')).toBe('\u{10041}')
  })
})

describe('the reader for a string half written in the source', () => {
  it('reads nothing out of a field that carries no expression at all', () => {
    // A declaration with no initializer is a declaration the reader is handed
    // as nothing. Reading a value out of nothing is the shape every caller of
    // this reader relies on.
    expect(approximateString(new Map(), undefined)).toBeUndefined()
  })
})
