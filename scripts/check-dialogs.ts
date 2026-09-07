/**
 * Run the dialog-ownership rule over the shipped UI.
 *
 * The rule lives in `dialog-gate.ts`, which is also what the gate's own
 * fixtures drive, so what runs here and what is proved there are the same
 * code. What the gate says about itself is the `GATE` declaration below, which
 * `tests/gate-declarations.spec.ts` drives directly; the walk and the exit
 * status are `gate-runner.ts`.
 *
 * The modules the dialog is made of are the one place its vocabulary is
 * allowed, and they are named in `dialog-gate.ts` rather than matched by a
 * suffix.
 *
 * @module
 */

import { DIALOG_MODULES, scanDialogs } from './dialog-gate.ts'
import { CONSOLE, type Gate, readGate, reportGate } from './gate-runner.ts'
import { repositoryFiles } from './source-tree.ts'

/** The one tree whose dialogs a reader of this product meets. */
const UI_SOURCE = 'apps/deeptail/src/'

/** What this gate opens, what it says when it refuses, and what it says when it does not. */
export const GATE: Gate = {
  extensions: ['.ts'],
  refusal: 'a dialog is built outside the module that owns it',
  clean: (modules) => `every dialog is the one the product ships (${String(modules)} modules)`,
  scan: scanDialogs,
  only: (file) => file.label.startsWith(UI_SOURCE) && !DIALOG_MODULES.has(file.label),
}

// Guarded, as every runnable script here is: importing a module must run
// nothing. A suite that imports one for the readers it exports would
// otherwise run the whole gate as a side effect of the import.
if (import.meta.main) {
  process.exit(reportGate(await readGate(GATE, repositoryFiles(GATE.extensions)), CONSOLE))
}
