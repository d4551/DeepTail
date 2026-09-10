/**
 * The coverage gate, driven off tables a run wrote.
 *
 * The gate's decision is the half a suite can reach without running the chain:
 * a table is text, the floors are arguments with the pinned values behind
 * them, and what the gate refuses — a file below its floor, a file with no
 * floor, a floor for a file the chain no longer reaches, a whole chain below
 * its own — is each a case a fixture table and a fixture floor table can
 * carry. The program is driven as a process too, against a table this suite
 * wrote, held to the floors the gate actually pins.
 */

import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { coverageReport, coverageRows, FLOORS, OVERALL, OVERALL_FLOOR, suiteFiles } from '../scripts/check-coverage.ts'

/** Where the program is run against a table of its own. */
const PROGRAM = new URL('../scripts/check-coverage.ts', import.meta.url).pathname

/** Directories this suite made, removed when it ends. */
const made: string[] = []

afterEach(async () => {
  await Promise.all(made.splice(0).map(async (root) => await rm(root, { recursive: true, force: true })))
})

/**
 * A table with one row.
 * @param file - the file the row names, or the summary name.
 * @param funcs - the function percentage.
 * @param lines - the line percentage.
 * @returns the row.
 */
function row(file: string, funcs: number, lines: number): string {
  return ` ${file.padEnd(46)}|${funcs.toFixed(2).padStart(8)} |${lines.toFixed(2).padStart(8)} | `
}

/**
 * A whole table, as bun prints it.
 * @param files - the file rows, under the summary row.
 * @param overall - the line percentage the summary row carries.
 * @returns the table text.
 */
function table(files: readonly string[], overall: number): string {
  return [
    'File                                            | % Funcs | % Lines | Uncovered Line #s',
    '------------------------------------------------|---------|---------|------------------',
    row(OVERALL, overall, overall),
    ...files,
    '',
  ].join('\n')
}

/** The floors the fixture cases hold their tables to. */
const FIXTURE_FLOORS: Readonly<Record<string, number>> = { 'apps/deeptail/src/api.ts': 100 }

/**
 * The table the pinned floors describe: every floored file at exactly its
 * floor, and the whole at the floor the whole is held to.
 * @param lower - one file to write below its floor, instead of at it.
 * @returns the table text.
 */
function pinnedTable(lower?: string): string {
  const files = Object.entries(FLOORS).map(([file, floor]) =>
    row(file, lower === file ? floor - 1 : floor, lower === file ? floor - 1 : floor),
  )
  return table(files, OVERALL_FLOOR)
}

describe('the rows of one coverage table', () => {
  it('reads every row, in the order the table lists them', () => {
    const rows = coverageRows(
      table([row('apps/deeptail/src/api.ts', 100, 100), row('scripts/ast.ts', 98.31, 98.31)], 90),
    )
    expect(rows.map((entry) => [entry.file, entry.funcs, entry.lines])).toEqual([
      [OVERALL, 90, 90],
      ['apps/deeptail/src/api.ts', 100, 100],
      ['scripts/ast.ts', 98.31, 98.31],
    ])
  })

  it('reads nothing out of the header, the rule between them, or the prose around the table', () => {
    const rows = coverageRows(`${table([], 90)}\n 1073 pass\nRan 1073 tests across 92 files. [16.23s]\n`)
    expect(rows.map((entry) => entry.file)).toEqual([OVERALL])
  })

  it('reads nothing out of a run that printed no table at all', () => {
    expect(coverageRows('bun test v1.4.2\n1073 pass\n')).toEqual([])
  })
})

describe('what the gate reports for one table', () => {
  it('holds every file at its floor, and says so with the count and the whole', () => {
    const report = coverageReport(table([row('apps/deeptail/src/api.ts', 100, 100)], 90), FIXTURE_FLOORS, 90)
    expect(report.code).toBe(0)
    expect(report.out).toContain('1 files')
    expect(report.out).toContain(`${OVERALL} at 90.00`)
  })

  it('refuses a file measured below its floor, naming the value and the floor', () => {
    const report = coverageReport(table([row('apps/deeptail/src/api.ts', 50, 50)], 90), FIXTURE_FLOORS, 90)
    expect(report.code).toBe(1)
    expect(report.err).toContain('apps/deeptail/src/api.ts: measured 50.00, below its floor of 100.00')
  })

  it('refuses a file the chain measured with no floor stated for it', () => {
    const report = coverageReport(table([row('scripts/never-floored.ts', 100, 100)], 90), FIXTURE_FLOORS, 90)
    expect(report.code).toBe(1)
    expect(report.err).toContain('scripts/never-floored.ts: measured 100.00, and no floor is stated for it')
  })

  it('refuses a floor stated for a file the chain no longer reaches', () => {
    const report = coverageReport(table([], 90), FIXTURE_FLOORS, 90)
    expect(report.code).toBe(1)
    expect(report.err).toContain('a floor is stated for it, and the chain measured nothing there')
  })

  it('refuses a whole chain below the floor the whole is held to', () => {
    const report = coverageReport(table([], 89.99), {}, 90)
    expect(report.code).toBe(1)
    expect(report.err).toContain(`${OVERALL}: measured 89.99, below the floor of 90.00`)
  })

  it('refuses a run that printed no table, rather than passing over it', () => {
    const report = coverageReport('bun test v1.4.2\n1073 pass\n')
    expect(report.code).toBe(1)
    expect(report.err).toContain('the run printed no coverage table')
  })
})

describe('the suites the gate measures', () => {
  it('is every spec the unit command names, in path order', async () => {
    const files = await suiteFiles()
    expect(files.length).toBeGreaterThan(0)
    expect(files.toSorted()).toEqual([...files])
    expect(files.some((file) => file.startsWith('packages/host-fleet/tests/'))).toBe(true)
    expect(files.some((file) => file.startsWith('tests/tree/'))).toBe(true)
  })
})

describe('the program, run the way a reader runs it', () => {
  // Imported, the module is a pair of readers and nothing runs. Run, it is a
  // program — and the whole of what makes it one lives under a guard no
  // importing suite can reach, so it is driven here as a process, against a
  // table this suite wrote, in a directory of its own.
  it('holds the pinned table, which is the whole chain at the floors it states', async () => {
    const root = await mkdtemp(join(tmpdir(), 'check-coverage-'))
    made.push(root)
    await writeFile(join(root, 'table.txt'), pinnedTable())
    const run = Bun.spawn([process.execPath, PROGRAM, 'table.txt'], {
      cwd: root,
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const printed = await new Response(run.stdout).text()
    const complaint = await new Response(run.stderr).text()
    expect([await run.exited, complaint]).toEqual([0, ''])
    expect(printed).toContain('held at the detection measured')
  })

  it('fails, and says why, when one file falls below the floor pinned for it', async () => {
    const root = await mkdtemp(join(tmpdir(), 'check-coverage-'))
    made.push(root)
    await writeFile(join(root, 'table.txt'), pinnedTable('apps/deeptail/src/api.ts'))
    const run = Bun.spawn([process.execPath, PROGRAM, 'table.txt'], {
      cwd: root,
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const complaint = await new Response(run.stderr).text()
    expect([await run.exited, complaint.includes('below its floor of')]).toEqual([1, true])
  })
})
