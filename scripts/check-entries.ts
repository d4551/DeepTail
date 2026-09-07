/**
 * Hold every script to doing nothing when it is imported.
 *
 * The rule lives in `entry-gate.ts`, which is also what the gate's own fixtures
 * drive, so what runs here and what is proved there are the same code. What the
 * gate says about itself is the `GATE` declaration below, which
 * `tests/gate-declarations.spec.ts` drives directly; the walk and the exit
 * status are `gate-runner.ts`.
 *
 * A gate rather than a suite, for the reason the others here are: the
 * instrumenter writes a top-level call into every file it touches, so the case
 * would fail for every mutant alike and a run whose every mutant is killed by
 * the same always-failing case scores a hundred while proving nothing.
 *
 * @module
 */

import { scanEntry } from './entry-gate.ts'
import { CONSOLE, type Gate, readGate, reportGate } from './gate-runner.ts'
import { repositoryFiles } from './source-tree.ts'

/** The one directory whose scripts this gate is written about. */
const SCRIPTS = 'scripts/'

/** What this gate opens, what it says when it refuses, and what it says when it does not. */
export const GATE: Gate = {
  extensions: ['.ts'],
  refusal: 'a script does work when it is imported',
  clean: (scripts) => `every script does nothing when imported (${String(scripts)} scripts)`,
  scan: scanEntry,
  only: (file) => file.label.startsWith(SCRIPTS),
}

// Guarded, as every runnable script here is: importing a module must run
// nothing.
if (import.meta.main) {
  process.exit(reportGate(await readGate(GATE, repositoryFiles(GATE.extensions)), CONSOLE))
}
