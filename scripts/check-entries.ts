/**
 * Hold every script to doing nothing when it is imported.
 *
 * The rule lives in `entry-gate.ts`, which is also what the gate's own fixtures
 * drive, so what runs here and what is proved there are the same code.
 *
 * A gate rather than a suite, for the reason the others here are: the
 * instrumenter writes a top-level call into every file it touches, so the case
 * would fail for every mutant alike and a run whose every mutant is killed by
 * the same always-failing case scores a hundred while proving nothing.
 */

import { scanEntry } from './entry-gate.ts'
import { CONSOLE, type Gate, readGate, reportGate } from './gate-runner.ts'

/**
 * What this gate reads and refuses.
 *
 * Exported because it is the gate's whole declaration — which files, what it
 * says when it refuses, and what it says when it does not — and a declaration
 * only the command line can reach is one no suite can read.
 */
export const GATE: Gate = {
  extensions: ['.ts'],
  only: (file) => file.label.startsWith('scripts/'),
  refusal: 'a script does work when it is imported',
  clean: (scripts) => `every script does nothing when imported (${String(scripts)} scripts)`,
  scan: scanEntry,
}

// Guarded, as every runnable script here is: importing a module must run
// nothing.
if (import.meta.main) process.exitCode = reportGate(await readGate(GATE), CONSOLE)
