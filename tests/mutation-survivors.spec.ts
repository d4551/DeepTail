/**
 * The survivor reader, driven both ways.
 *
 * A mutation report is a list of tests that do not exist yet, and this module
 * is what turns one into that list. It was mutated by the tools scope and
 * driven by nothing at all, so every mutant in it survived and the scope's
 * score was reporting on a file no case exercised.
 *
 * The report was also asserted into shape rather than read. An interrupted run
 * is the ordinary case — `check-tree.ts` exists because one happened — and a
 * half-written report reached `Object.entries` on nothing, failing with a type
 * error about a property instead of saying the report could not be read.
 *
 * Fixtures are written as the JSON a report actually carries and read through
 * the same JSONC reader every other gate uses, so what these cases hand the
 * module is what a run would hand it.
 */

import { describe, expect, it } from 'bun:test'
import { type Json, readJsonc } from '../scripts/jsonc.ts'
import {
  DEFAULT_REPORT,
  DEFAULT_STATUS,
  type Mutant,
  readMutationReport,
  renderSurvivors,
  survivingFiles,
} from '../scripts/mutation-survivors.ts'

/** One mutant, as the JSON text a report records it in. */
function recorded(status: string, line: number, column = 1): string {
  const at = `{"start":{"line":${String(line)},"column":${String(column)}}}`
  return `{"mutatorName":"ConditionalExpression","replacement":"true","status":"${status}","location":${at}}`
}

/** A report carrying one file and the mutants given. */
function reportOf(...mutants: readonly string[]): { [key: string]: Json } {
  return readJsonc(`{"files":{"scripts/a.ts":{"mutants":[${mutants.join(',')}]}}}`)
}

/** One mutant this module has already read. */
function read(status: string, line: number, column = 1): Mutant {
  return { mutatorName: 'ConditionalExpression', replacement: 'true', status, line, column }
}

/** One file's read mutants, as the reader answers them. */
function listed(...mutants: readonly Mutant[]): ReadonlyMap<string, readonly Mutant[]> {
  return new Map([['scripts/a.ts', mutants]])
}

describe('the report reader', () => {
  it('reads a file and the mutants recorded against it', () => {
    expect(readMutationReport(reportOf(recorded('Survived', 12)))?.get('scripts/a.ts')).toEqual([read('Survived', 12)])
  })

  it('reads a mutant that replaced nothing, which records no replacement', () => {
    const bare = '{"mutatorName":"BlockStatement","status":"Killed","location":{"start":{"line":1,"column":2}}}'
    expect(readMutationReport(reportOf(bare))?.get('scripts/a.ts')?.[0]?.replacement).toBeUndefined()
  })

  it('reads a report that records no files, which is a run that mutated nothing', () => {
    expect(readMutationReport(readJsonc('{"files":{}}'))?.size).toBe(0)
  })

  it('refuses a report with no files section, which is a half-written one', () => {
    expect(readMutationReport(readJsonc('{}'))).toBeUndefined()
    expect(readMutationReport(readJsonc('{"files":[]}'))).toBeUndefined()
  })

  it('refuses a file whose mutants are not a list', () => {
    expect(readMutationReport(readJsonc('{"files":{"a.ts":{}}}'))).toBeUndefined()
    expect(readMutationReport(readJsonc('{"files":{"a.ts":7}}'))).toBeUndefined()
  })

  it('refuses a mutant with no place, which is where it would be reported', () => {
    expect(readMutationReport(reportOf('{"mutatorName":"X","status":"Survived"}'))).toBeUndefined()
    expect(readMutationReport(reportOf('{"mutatorName":"X","status":"S","location":{}}'))).toBeUndefined()
  })

  it('refuses a mutant whose name or line is of the wrong kind', () => {
    expect(readMutationReport(reportOf(recorded('Survived', 1), '{"mutatorName":7}'))).toBeUndefined()
    const worded = '{"mutatorName":"X","status":"S","location":{"start":{"line":"3","column":1}}}'
    expect(readMutationReport(reportOf(worded))).toBeUndefined()
  })
})

describe('the survivors of one report', () => {
  it('keeps only the status asked for', () => {
    const open = survivingFiles(listed(read('Survived', 2), read('Killed', 1)), 'Survived')
    expect(open.map(({ mutants }) => mutants.map((mutant) => mutant.line))).toEqual([[2]])
  })

  it('orders a file’s survivors by line, then by column', () => {
    const open = survivingFiles(listed(read('S', 9, 4), read('S', 2, 7), read('S', 9, 1)), 'S')
    expect(open[0]?.mutants.map((mutant) => `${String(mutant.line)}:${String(mutant.column)}`)).toEqual([
      '2:7',
      '9:1',
      '9:4',
    ])
  })

  it('leaves out a file that carries none, because an empty entry is not work', () => {
    expect(survivingFiles(listed(read('Killed', 1)), 'Survived')).toEqual([])
  })

  it('lists a status other than the default when asked for one', () => {
    expect(survivingFiles(listed(read('Timeout', 1)), 'Timeout')).toHaveLength(1)
  })
})

describe('the report a reader acts on', () => {
  it('names the file, the place, the mutator and the replacement, and totals them', () => {
    const text = renderSurvivors([{ file: 'scripts/a.ts', mutants: [read('Survived', 12, 3)] }], 'Survived')
    expect(text).toContain('scripts/a.ts (1)')
    expect(text).toContain('12:3')
    expect(text).toContain('ConditionalExpression')
    expect(text.endsWith('1 survived\n')).toBe(true)
  })

  it('reports a clean run as none, rather than printing nothing at all', () => {
    expect(renderSurvivors([], 'Survived')).toBe('\n\n0 survived\n')
  })

  it('flattens a multi-line replacement so one mutant stays one line', () => {
    const wrapped: Mutant = { mutatorName: 'M', replacement: 'a\nb', status: 'S', line: 1, column: 1 }
    expect(renderSurvivors([{ file: 'a.ts', mutants: [wrapped] }], 'S')).toContain('-> a b')
  })

  it('names where the report is read from and which status it lists', () => {
    expect([DEFAULT_REPORT, DEFAULT_STATUS]).toEqual(['reports/mutation/mutation.json', 'Survived'])
  })
})
