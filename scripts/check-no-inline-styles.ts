/**
 * Run the inline-style ban over the whole repository.
 *
 * The rules live in `style-gate.ts`, which is also what the gate's own suite
 * drives, so what runs here and what is proved there are the same code. What
 * the gate says about itself is the `GATE` declaration below, which
 * `tests/gate-declarations.spec.ts` drives directly; the walk and the exit
 * status are `gate-runner.ts`.
 *
 * @module
 */

import { MARKUP_EXTENSIONS, SCRIPT_EXTENSIONS } from './extensions.ts'
import { CONSOLE, type Gate, readGate, reportGate } from './gate-runner.ts'
import { repositoryFiles } from './source-tree.ts'
import { scanSource } from './style-gate.ts'

/** What this gate opens, what it says when it refuses, and what it says when it does not. */
export const GATE: Gate = {
  extensions: [...SCRIPT_EXTENSIONS, ...MARKUP_EXTENSIONS],
  refusal: 'inline styles are not allowed',
  clean: (files) => `no inline styles (${String(files)} files)`,
  scan: scanSource,
}

// Guarded, as every runnable script here is: importing a module must run
// nothing. A suite that imports one for the readers it exports would
// otherwise run the whole gate as a side effect of the import.
if (import.meta.main) {
  process.exit(reportGate(await readGate(GATE, repositoryFiles(GATE.extensions)), CONSOLE))
}
