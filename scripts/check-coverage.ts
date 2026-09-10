/**
 * Hold the unit chain to the detection it measured, file by file.
 *
 * `bun test --coverage` prints the table, and nothing read it: a suite quietly
 * dropped from the unit command, or a module a rename detached from every
 * suite, moved the table and moved nothing else. This runs the same suites the
 * unit command names, reads the table bun prints, and holds every file it
 * measured to a floor pinned here — at the value the chain measured, so a
 * regression fails by name and an improvement has to be restated here, the
 * same hold `tests/stack.spec.ts` puts on the toolchain pins.
 *
 * A file the chain measures with no floor stated is an offence, and so is a
 * floor stated for a file the chain no longer reaches: nothing joins without a
 * floor, and nothing stays behind as decoration.
 *
 * @module
 */

import { readFile } from 'node:fs/promises'
import { allThree } from './captures.ts'

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
  const found: string[] = []
  for (const [directory, pattern] of SUITE_GLOBS) {
    const glob = new Bun.Glob(pattern)
    for await (const path of glob.scan({ cwd: directory, onlyFiles: true })) found.push(`${directory}/${path}`)
  }
  return found.toSorted()
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

/**
 * The line coverage each measured file is held to, pinned at what the chain
 * measured.
 *
 * Every entry is the value a full run of the unit chain printed for that file.
 * Raising a floor is the record of an improvement; lowering one is the defect
 * this gate exists to refuse. The low entries are stated, not excused: the
 * carrier's network half and the page-contract helpers are driven by the
 * browser suites, and a gate program's own section is driven at process level
 * by its program spec — the unit chain's table is what this gate holds, and
 * the browser chain has its own.
 */
export const FLOORS: Readonly<Record<string, number>> = {
  'apps/deeptail/src/actions/action-table.ts': 100,
  'apps/deeptail/src/actions/capabilities.ts': 100,
  'apps/deeptail/src/actions/dispatch.ts': 100,
  'apps/deeptail/src/actions/handlers.ts': 100,
  'apps/deeptail/src/actions/outcomes.ts': 92.31,
  'apps/deeptail/src/actions/registry.ts': 100,
  'apps/deeptail/src/api.ts': 100,
  'apps/deeptail/src/browser-locale.ts': 100,
  'apps/deeptail/src/capabilities/audit.ts': 83.33,
  'apps/deeptail/src/capabilities/grants.ts': 98.06,
  'apps/deeptail/src/fleet-pairing.ts': 100,
  'apps/deeptail/src/fleet-tailnet.ts': 100,
  'apps/deeptail/src/frames.ts': 100,
  'apps/deeptail/src/host.ts': 100,
  'apps/deeptail/src/locales.ts': 100,
  'apps/deeptail/src/native-call.ts': 100,
  'apps/deeptail/src/picker-ports.ts': 100,
  'apps/deeptail/src/picker-tailnet.ts': 98.51,
  'apps/deeptail/src/reason.ts': 100,
  'apps/deeptail/src/roster.ts': 100,
  'apps/deeptail/src/socket-state.ts': 100,
  'apps/deeptail/src/store.ts': 100,
  'apps/deeptail/src/stream.ts': 100,
  'apps/deeptail/src/tailscale.ts': 100,
  'apps/deeptail/src/transport.ts': 28.78,
  'apps/deeptail/src/ui/dom.ts': 100,
  'apps/deeptail/src/ui/roving.ts': 100,
  'apps/deeptail/src/ui/states.ts': 100,
  'apps/deeptail/src/wire.ts': 100,
  'apps/deeptail/tests/structure-layout.ts': 5.56,
  'apps/deeptail/tests/structure-pointer.ts': 4.05,
  'apps/deeptail/tests/structure-report.ts': 0,
  'apps/deeptail/tests/structure-shell.ts': 8.82,
  'apps/deeptail/tests/structure-vocabulary.ts': 23.08,
  'apps/deeptail/tests/structure.ts': 30.82,
  'packages/host-fleet/src/index.ts': 100,
  'packages/host-fleet/src/invariant.ts': 100,
  'packages/host-fleet/src/limits.ts': 100,
  'packages/host-fleet/src/session-access.ts': 100,
  'packages/host-fleet/src/session-projection.ts': 100,
  'packages/host-fleet/src/tools-direct.ts': 100,
  'packages/host-fleet/src/tools-observe.ts': 100,
  'packages/host-fleet/src/tools.ts': 100,
  'packages/host-fleet/tests/answers.ts': 88.24,
  'packages/host-fleet/tests/controller-double.ts': 98.28,
  'scripts/action-registry-emit.ts': 100,
  'scripts/action-registry-rust.ts': 100,
  'scripts/action-registry.ts': 100,
  'scripts/aliases.ts': 100,
  'scripts/ast.ts': 98.31,
  'scripts/ban-gate.ts': 95.24,
  'scripts/ban-rules.ts': 100,
  'scripts/captures.ts': 100,
  'scripts/cargo-freshness.ts': 76.92,
  'scripts/check-bans.ts': 100,
  'scripts/check-coverage.ts': 78.41,
  'scripts/check-entries.ts': 100,
  'scripts/check-no-inline-styles.ts': 100,
  'scripts/check-outdated.ts': 87.14,
  'scripts/check-stylesheets.ts': 100,
  'scripts/check-tree.ts': 100,
  'scripts/colour-gate.ts': 100,
  'scripts/compiler-face.ts': 100,
  'scripts/debt-names.ts': 100,
  'scripts/docs-versions.ts': 100,
  'scripts/entry-gate.ts': 100,
  'scripts/extensions.ts': 100,
  'scripts/focus-ring-gate.ts': 100,
  'scripts/fold.ts': 100,
  'scripts/free-names.ts': 100,
  'scripts/gate-runner.ts': 91.67,
  'scripts/gen-action-registry.ts': 97.26,
  'scripts/jsonc.ts': 100,
  'scripts/lines.ts': 100,
  'scripts/manifest.ts': 100,
  'scripts/markup-attributes.ts': 100,
  'scripts/markup-gate.ts': 100,
  'scripts/markup-vocabulary.ts': 100,
  'scripts/mutation-survivors.ts': 94.55,
  'scripts/pins.ts': 100,
  'scripts/pipeline-guard-gates.ts': 100,
  'scripts/pipeline-guard-jobs.ts': 100,
  'scripts/pipeline-guard-rules.ts': 100,
  'scripts/pipeline-guard.ts': 83.87,
  'scripts/react-tauri-rules.ts': 100,
  'scripts/registry-readers.ts': 100,
  'scripts/rule-helpers.ts': 100,
  'scripts/rust-attributes.ts': 100,
  'scripts/sheet-declarations.ts': 100,
  'scripts/sheet-depth.ts': 100,
  'scripts/sheet-duplicates.ts': 100,
  'scripts/sheet-gate.ts': 100,
  'scripts/sheet-imports.ts': 100,
  'scripts/sheet-reader.ts': 100,
  'scripts/source-tree.ts': 100,
  'scripts/stryker-config.ts': 100,
  'scripts/style-gate.ts': 100,
  'scripts/style-writes.ts': 100,
  'scripts/test-commands.ts': 100,
  'tests/dom.ts': 100,
  'tests/fixtures.ts': 100,
  'tests/grant-fixture.ts': 100,
  'tests/jsonc-io.ts': 100,
  'tests/manifests.ts': 100,
  'tests/markup-tree.ts': 100,
}

/** The line coverage the whole chain is held to, pinned the same way. */
export const OVERALL_FLOOR = 93.1

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
  if (table !== undefined) {
    // A table handed in by path: the suite drives the report off a captured
    // run, so the decision is reachable without re-running the chain.
    const report = coverageReport(await readFile(table, 'utf8'))
    process.stdout.write(report.out)
    process.stderr.write(report.err)
    process.exitCode = report.code
  } else {
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
  }
}
