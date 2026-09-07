/**
 * Run the retired-idiom and suppression bans over everything the repository
 * ships.
 *
 * The rules live in `ban-gate.ts`, which is also what the gate's own fixtures
 * drive, so what runs here and what is proved there are the same code. What the
 * gate says about itself — the kinds it opens and the two sentences it prints —
 * is the `GATE` declaration below, which `tests/gate-declarations.spec.ts`
 * drives directly; the walk and the exit status are `gate-runner.ts`.
 *
 * This is a gate rather than a suite for the same reason `check-tree.ts` is: it
 * is a property of the tree, and a suite that reads the whole tree cannot judge
 * a mutation run of the very modules it reads — the instrumenter writes `var`
 * and the bans refuse it, so the case would fail for every mutant alike and a
 * run whose every mutant is killed by the same always-failing case scores a
 * hundred while proving nothing.
 *
 * Two suites carried a copy of this scan, over two different file sets: one
 * read markup and the other did not. One scan, over the union of what every
 * reader here declares, is one answer.
 *
 * @module
 */

import { scanSource } from './ban-gate.ts'
import { MARKUP_EXTENSIONS, PLAIN_EXTENSIONS, SCRIPT_EXTENSIONS } from './extensions.ts'
import { CONSOLE, type Gate, readGate, reportGate } from './gate-runner.ts'
import { repositoryFiles } from './source-tree.ts'

/** What this gate opens, what it says when it refuses, and what it says when it does not. */
export const GATE: Gate = {
  extensions: [...new Set([...SCRIPT_EXTENSIONS, ...PLAIN_EXTENSIONS, ...MARKUP_EXTENSIONS])],
  refusal: 'the repository carries a banned idiom or a suppression',
  clean: (files) => `no banned idiom or suppression (${String(files)} files)`,
  scan: scanSource,
}

// Guarded, as every runnable script here is: importing a module must run
// nothing. A suite that imports one for the readers it exports would
// otherwise run the whole gate as a side effect of the import.
if (import.meta.main) {
  process.exit(reportGate(await readGate(GATE, repositoryFiles(GATE.extensions)), CONSOLE))
}
