/**
 * The report a mutation run wrote, read rather than claimed.
 *
 * A report is another program's output, and the survivor list is printed from
 * it. An entry with no location prints a line naming nowhere, which is a
 * survivor nobody can open; a document that names no files at all is not a
 * report, and reading it as an empty one prints "0 survived" over a run that
 * never happened.
 */

import { describe, expect, it } from 'bun:test'
import { readReport } from '../scripts/mutation-survivors.ts'

describe('the report a run wrote', () => {
  it('is read onto the shape this prints from, entry by entry', () => {
    const written = JSON.stringify({
      files: {
        'a.ts': {
          mutants: [
            {
              mutatorName: 'StringLiteral',
              status: 'Survived',
              replacement: '""',
              location: { start: { line: 2, column: 3 } },
            },
            { mutatorName: 'BlockStatement', status: 'Killed', location: { start: { line: 1, column: 1 } } },
          ],
        },
      },
    })
    expect(readReport(written)).toEqual({
      files: {
        'a.ts': {
          mutants: [
            {
              mutatorName: 'StringLiteral',
              status: 'Survived',
              replacement: '""',
              location: { start: { line: 2, column: 3 } },
            },
            { mutatorName: 'BlockStatement', status: 'Killed', location: { start: { line: 1, column: 1 } } },
          ],
        },
      },
    })
  })
})

describe('an entry a report should not have written', () => {
  it('is left out rather than printed as a line naming nowhere', () => {
    // The report is another program's output. An entry with no location would
    // print a line naming nowhere, which is a survivor nobody can open.
    const written = JSON.stringify({
      files: {
        'a.ts': {
          mutants: [
            { mutatorName: 'A', status: 'Survived' },
            { mutatorName: 'B', status: 'Survived', location: { start: { line: '2', column: 3 } } },
            { mutatorName: 'C', status: 'Survived', location: { start: { column: 3 } } },
            { status: 'Survived', location: { start: { line: 2, column: 3 } } },
            { mutatorName: 'E', location: { start: { line: 2, column: 3 } } },
            'not a mutant',
            { mutatorName: 'G', status: 'Survived', replacement: 7, location: { start: { line: 4, column: 5 } } },
          ],
        },
      },
    })
    const read = readReport(written).files['a.ts']?.mutants ?? []
    expect(read.map((one) => one.mutatorName)).toEqual(['G'])
    expect(read[0]?.replacement).toBeUndefined()
  })

  it('reads a file section that lists no mutants as listing none', () => {
    expect(readReport(JSON.stringify({ files: { 'a.ts': {}, 'b.ts': 7, 'c.ts': { mutants: 'none' } } }))).toEqual({
      files: { 'a.ts': { mutants: [] }, 'b.ts': { mutants: [] }, 'c.ts': { mutants: [] } },
    })
  })

  it('refuses a document that names no files at all', () => {
    expect(() => readReport('{}')).toThrow('mutation report: the document names no files')
    expect(() => readReport(JSON.stringify({ files: [] }))).toThrow('mutation report: the document names no files')
  })
})
