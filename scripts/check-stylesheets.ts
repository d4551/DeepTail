/**
 * Run the stylesheet rules over the whole repository.
 *
 * The rules live in `sheet-gate.ts`, which is also what the gate's own suite
 * drives, so what runs here and what is proved there are the same code.
 */

import { CONSOLE, type Gate, readGate, reportGate } from './gate-runner.ts'
import { STYLE_EXTENSIONS, scanSheet } from './sheet-gate.ts'

/**
 * What this gate reads and refuses.
 *
 * Exported because it is the gate's whole declaration — which files, what it
 * says when it refuses, and what it says when it does not — and a declaration
 * only the command line can reach is one no suite can read.
 */
export const GATE: Gate = {
  extensions: [...STYLE_EXTENSIONS],
  refusal: 'stylesheets carry values that belong to the scale',
  clean: (sheets) => `stylesheets read the scale (${String(sheets)} sheets)`,
  scan: scanSheet,
}

// Guarded, as every runnable script here is: importing a module must run
// nothing.
if (import.meta.main) process.exitCode = reportGate(await readGate(GATE), CONSOLE)
