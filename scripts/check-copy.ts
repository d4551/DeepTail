/**
 * Hold every sentence the product shows to a dictionary.
 *
 * The rule lives in `copy-gate.ts`, which is also what the gate's own fixtures
 * drive, so what runs here and what is proved there are the same code. What
 * the gate says about itself is the `GATE` declaration below, which
 * `tests/gate-declarations.spec.ts` drives directly; the walk and the exit
 * status are `gate-runner.ts`.
 *
 * Only the shipped UI is read. A suite plants copy on purpose — a probe
 * labelled `probe`, a heading that must skip a level — and that copy reaches no
 * reader of this product; refusing it there would push test fixtures through a
 * dictionary nobody translates.
 *
 * @module
 */

import { aliases } from './aliases.ts'
import { parseScript, walk } from './ast.ts'
import { COPY_REFUSAL, writesUntranslatedCopy } from './copy-gate.ts'
import { constants } from './fold.ts'
import { CONSOLE, type Gate, readGate, reportGate } from './gate-runner.ts'
import type { Offence } from './offence.ts'
import type { Names } from './rule-helpers.ts'
import { repositoryFiles } from './source-tree.ts'

/** The one tree whose copy a reader of this product actually sees. */
const UI_SOURCE = 'apps/deeptail/src/'

/**
 * The copy one module writes without a dictionary.
 * @param label - the file's repository-relative path.
 * @param text - the file's contents.
 * @returns one offence per sentence written straight onto a surface.
 */
export function scanCopy(label: string, text: string): readonly Offence[] {
  const parsed = parseScript(label, text)
  const names: Names = { aliases: aliases(parsed.body), constants: constants(parsed.body) }
  const offences: Offence[] = parsed.errors.map((error) => ({
    label,
    line: 1,
    why: `this file does not parse, so it cannot be checked: ${error.message}`,
  }))
  walk(parsed.body, (node) => {
    if (writesUntranslatedCopy(node, names)) {
      offences.push({ label, line: parsed.lineAt(node.start), why: COPY_REFUSAL })
    }
  })
  return offences
}

/** What this gate opens, what it says when it refuses, and what it says when it does not. */
export const GATE: Gate = {
  extensions: ['.ts'],
  refusal: 'copy reaches the reader without a dictionary',
  clean: (modules) => `every sentence the product shows is looked up (${String(modules)} modules)`,
  scan: scanCopy,
  only: (file) => file.label.startsWith(UI_SOURCE),
}

// Guarded, as every runnable script here is: importing a module must run
// nothing. A suite that imports one for the readers it exports would
// otherwise run the whole gate as a side effect of the import.
if (import.meta.main) {
  process.exit(reportGate(await readGate(GATE, repositoryFiles(GATE.extensions)), CONSOLE))
}
