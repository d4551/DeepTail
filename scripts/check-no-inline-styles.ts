/**
 * Run the inline-style ban over the whole repository.
 *
 * The rules live in `style-gate.ts`, which is also what the gate's own suite
 * drives, so what runs here and what is proved there are the same code.
 */

import { CONSOLE, type Gate, readGate, reportGate } from './gate-runner.ts'
import { MARKUP_EXTENSIONS, SCRIPT_EXTENSIONS, scanSource } from './style-gate.ts'

/**
 * What this gate reads and refuses.
 *
 * Exported because it is the gate's whole declaration — which files, what it
 * says when it refuses, and what it says when it does not — and a declaration
 * only the command line can reach is one no suite can read.
 */
export const GATE: Gate = {
  extensions: [...SCRIPT_EXTENSIONS, ...MARKUP_EXTENSIONS],
  refusal: 'inline styles are not allowed',
  clean: (files) => `no inline styles (${String(files)} files)`,
  scan: scanSource,
}

// Guarded, as every runnable script here is: importing a module must run
// nothing.
if (import.meta.main) process.exitCode = reportGate(await readGate(GATE), CONSOLE)
