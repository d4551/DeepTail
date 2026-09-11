/**
 * Hold the unit chain to the detection it measured, file by file.
 *
 * `bun test --coverage` prints the table, and nothing read it: a suite quietly
 * dropped from the unit command, or a module a rename detached from every
 * suite, moved the table and moved nothing else. This runs the same suites the
 * unit command names, reads the table bun prints, and holds every file it
 * measured to a floor pinned in `coverage-floors.ts` — at the value the chain
 * measured, so a regression fails by name and an improvement has to be
 * restated there, the same hold `tests/stack.spec.ts` puts on the toolchain
 * pins.
 *
 * A file the chain measures with no floor stated is an offence, and so is a
 * floor stated for a file the chain no longer reaches: nothing joins without a
 * floor, and nothing stays behind as decoration.
 *
 * @module
 */

import { readFile } from 'node:fs/promises'
import { allThree } from './captures.ts'
import { FLOORS, OVERALL_FLOOR } from './coverage-floors.ts'

/**
 * The directories the unit command names, and the pattern each is scanned
 * with.
 *
 * The unit command hands the shell three globs; a spawned process is handed
 * none, so the same three are scanned here and the files passed by path — the
 * suite list stays the one the command names, read rather than restated.
 */
const SUITE_GLOBS: readonly (readonly [directory: string, pattern: string])[] = [
  ['packages/host-fleet/tests', '*.spec.ts'],
  ['tests', '*.spec.ts'],
  ['tests/tree', '*.spec.ts'],
]

/**
 * Every suite the unit command runs, by path.
 * @returns the files, in path order, so a run reads the same twice.
 */
export async function suiteFiles(): Promise<readonly string[]> {
  const scans = await Promise.all(
    SUITE_GLOBS.map(async ([directory, pattern]) => {
      const paths = await Array.fromAsync(new Bun.Glob(pattern).scan({ cwd: directory, onlyFiles: true }))
      return paths.map((path) => `${directory}/${path}`)
    }),
  )
  return scans.flat().toSorted()
}

/** One file's row of the table bun prints. */
export interface CoverageRow {
  /** The file, by repository-relative path, or the table's summary name. */
  readonly file: string
  /** The percentage of functions the chain reached. */
  readonly funcs: number
  /** The percentage of lines the chain reached. */
  readonly lines: number
}

/** The row the table sums across every file it measured. */
export const OVERALL = 'All files'

/** One table row: a name, two percentages, and the uncovered lines after the last pipe. */
const ROW = /^\s*(.+?)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/u

/**
 * The rows of one coverage table.
 * @param output - everything the run printed.
 * @returns one entry per row, in the order the table lists them.
 */
export function coverageRows(output: string): readonly CoverageRow[] {
  const rows: CoverageRow[] = []
  for (const line of output.split('\n')) {
    const found = ROW.exec(line)
    const parts = found === null ? undefined : allThree([found[1], found[2], found[3]])
    if (parts !== undefined) rows.push({ file: parts[0], funcs: Number(parts[1]), lines: Number(parts[2]) })
  }
  return rows
}

/** What the gate tells a reader, a shell, and each of the two streams. */
export interface CoverageOutcome {
  /** What is written to the output stream. */
  readonly out: string
  /** What is written to the error stream. */
  readonly err: string
  /** The code the shell is given. */
  readonly code: number
}

/**
 * What the gate reports for one coverage table.
 *
 * Separated from the run that produces the table, because the decision — what
 * a reader is told, and what the shell is told — is the half a suite can drive
 * without running the chain. The floors are arguments with the pinned values
 * behind them, so a suite drives the decision off floors of its own and the
 * program holds the chain to the ones pinned here.
 * @param output - everything the run printed.
 * @param floors - the line floor per file, defaulting to the pinned table.
 * @param overallFloor - the line floor for the whole chain, defaulting to the pin.
 * @returns the two streams and the exit code.
 */
export function coverageReport(
  output: string,
  floors: Readonly<Record<string, number>> = FLOORS,
  overallFloor: number = OVERALL_FLOOR,
): CoverageOutcome {
  const rows = coverageRows(output)
  const overall = rows.find((row) => row.file === OVERALL)
  const files = rows.filter((row) => row.file !== OVERALL)
  if (overall === undefined) {
    return { out: '', err: 'check-coverage: the run printed no coverage table\n', code: 1 }
  }
  const offences: string[] = []
  for (const row of files) {
    const floor = floors[row.file]
    if (floor === undefined) {
      offences.push(`  ${row.file}: measured ${row.lines.toFixed(2)}, and no floor is stated for it`)
    } else if (row.lines < floor) {
      offences.push(`  ${row.file}: measured ${row.lines.toFixed(2)}, below its floor of ${floor.toFixed(2)}`)
    }
  }
  for (const file of Object.keys(floors)) {
    if (!files.some((row) => row.file === file)) {
      offences.push(`  ${file}: a floor is stated for it, and the chain measured nothing there`)
    }
  }
  if (overall.lines < overallFloor) {
    offences.push(`  ${OVERALL}: measured ${overall.lines.toFixed(2)}, below the floor of ${overallFloor.toFixed(2)}`)
  }
  if (offences.length > 0) {
    return {
      out: '',
      err: `check-coverage: the unit chain does not reach what its floors state:\n${offences.join('\n')}\n`,
      code: 1,
    }
  }
  return {
    out: `check-coverage: every file the unit chain reaches is held at the detection measured: ${String(
      files.length,
    )} files, ${OVERALL} at ${overall.lines.toFixed(2)}\n`,
    err: '',
    code: 0,
  }
}

// Guarded, as every runnable script here is: importing a module must run
// nothing. A suite that imports one for the readers it exports would
// otherwise run the whole gate as a side effect of the import.
if (import.meta.main) {
  const [table] = Bun.argv.slice(2)
  if (table === undefined) {
    const run = Bun.spawnSync(['bun', 'test', '--coverage', ...(await suiteFiles())], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    if (run.exitCode === 0) {
      // The table is written with the test output, and bun writes that to
      // stderr, so the two are read together rather than one of them guessed
      // at — the same read the cargo gate makes of cargo's own report.
      const report = coverageReport(`${run.stdout.toString()}\n${run.stderr.toString()}`)
      process.stdout.write(report.out)
      process.stderr.write(report.err)
      process.exitCode = report.code
    } else {
      process.stderr.write(`check-coverage: the unit chain exited ${String(run.exitCode)}\n${run.stderr.toString()}`)
      process.exitCode = 1
    }
  } else {
    // A table handed in by path: the suite drives the report off a captured
    // run, so the decision is reachable without re-running the chain.
    const report = coverageReport(await readFile(table, 'utf8'))
    process.stdout.write(report.out)
    process.stderr.write(report.err)
    process.exitCode = report.code
  }
}
