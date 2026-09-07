/**
 * Refuse a working tree a mutation run left rewritten.
 *
 * The mutation runs mutate in place, because the gates read the repository
 * through `git ls-files` and a sandbox copy is not a repository. An interrupted
 * run therefore leaves every file it touched carrying the instrumenter's switch
 * wrapped around every expression — which happened here, to all of `scripts/`.
 * A tree in that state still type-checks and still passes its suites, so
 * nothing else says so.
 *
 * This is a property of the tree at rest rather than of any code in it, so it
 * is a gate rather than a test: a suite would fail during every mutation run,
 * where the tree is instrumented on purpose, and a run whose every mutant is
 * killed by the same always-failing case scores a hundred while proving
 * nothing.
 *
 * What the gate says about itself is the `GATE` declaration below, which
 * `tests/gate-declarations.spec.ts` drives directly; the walk and the exit
 * status are `gate-runner.ts`.
 *
 * @module
 */

import { CONSOLE, type Gate, readGate, reportGate } from './gate-runner.ts'
import type { Offence } from './offence.ts'
import { repositoryFiles } from './source-tree.ts'

/**
 * The switch the instrumenter wraps around every mutated expression.
 *
 * Assembled from parts so this file's own source does not carry the marker it
 * is written to find, which would make the gate refuse itself.
 */
const MARKER = ['stry', 'MutAct_'].join('')

/**
 * Where a file first carries the instrumenter's switch, if it carries it.
 *
 * The first line rather than every line: the finding is about the file, and one
 * interrupted run rewrites every expression in it, so a line apiece would bury
 * the file list this gate exists to print.
 * @param label - the file's repository-relative path.
 * @param text - the file's contents.
 * @returns one offence when the file is instrumented, none when it is not.
 */
export function scanInstrumentation(label: string, text: string): readonly Offence[] {
  if (!text.includes(MARKER)) return []
  const line = text.split('\n').findIndex((one) => one.includes(MARKER)) + 1
  return [{ label, line, why: "this file carries the instrumenter's switch" }]
}

/** What this gate opens, what it says when it refuses, and what it says when it does not. */
export const GATE: Gate = {
  extensions: ['.ts', '.tsx', '.js'],
  refusal: 'a mutation run left these files instrumented; run `bun scripts/mutate-restore.ts`',
  clean: (files) => `no instrumentation left behind (${String(files)} files)`,
  scan: scanInstrumentation,
}

// Guarded, as every runnable script here is: importing a module must run
// nothing. A suite that imports one for the readers it exports would
// otherwise run the whole gate as a side effect of the import.
if (import.meta.main) {
  process.exit(reportGate(await readGate(GATE, repositoryFiles(GATE.extensions)), CONSOLE))
}
