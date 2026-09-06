/**
 * Run the stylesheet rules over the whole repository.
 *
 * The rules live in `sheet-gate.ts`, which is also what the gate's own suite
 * drives, so what runs here and what is proved there are the same code.
 */

import { readFile } from 'node:fs/promises'
import { STYLE_EXTENSIONS, scanSheet } from './sheet-gate.ts'
import { repositoryFiles } from './source-tree.ts'

// Guarded, as every runnable script here is: importing a module must run
// nothing. A suite that imports one for the readers it exports would
// otherwise run the whole gate as a side effect of the import.
if (import.meta.main) {
  const files = repositoryFiles([...STYLE_EXTENSIONS])
  const scanned = await Promise.all(files.map(async (file) => scanSheet(file.label, await readFile(file.path, 'utf8'))))
  const offences = scanned.flat()

  if (offences.length > 0) {
    const lines = offences.map((offence) => `  ${offence.label}:${String(offence.line)}: ${offence.why}`)
    process.stderr.write(`stylesheets carry values that belong to the scale:\n${lines.join('\n')}\n`)
    process.exit(1)
  }
  process.stdout.write(`stylesheets read the scale (${String(files.length)} sheets)\n`)
}
