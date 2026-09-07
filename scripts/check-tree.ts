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
 */

import { CONSOLE, type Gate, readGate, reportGate } from './gate-runner.ts'

/** The switch the instrumenter wraps around every mutated expression. */
const MARKER = ['stry', 'MutAct_'].join('')

/**
 * What this gate reads and refuses.
 *
 * Exported because it is the gate's whole declaration — which files, what it
 * says when it refuses, and what it says when it does not — and a declaration
 * only the command line can reach is one no suite can read.
 */
export const GATE: Gate = {
  extensions: ['.ts', '.tsx', '.js'],
  refusal: 'a mutation run left these files instrumented; run `bun scripts/mutate-restore.ts`',
  clean: (files) => `no instrumentation left behind (${String(files)} files)`,
  scan: (label, text) =>
    text.includes(MARKER) ? [{ label, line: 1, why: "this file carries the instrumenter's switch" }] : [],
}

// Guarded, as every runnable script here is: importing a module must run
// nothing.
if (import.meta.main) process.exitCode = reportGate(await readGate(GATE), CONSOLE)
