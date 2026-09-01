/**
 * Run the inline-style ban over the whole repository.
 *
 * The rules live in `style-gate.ts`, which is also what the gate's own suite
 * drives, so what runs here and what is proved there are the same code.
 */

import { readFile } from 'node:fs/promises'
import { repositoryFiles } from './source-tree.ts'
import { MARKUP_EXTENSIONS, SCRIPT_EXTENSIONS, scanSource } from './style-gate.ts'

const files = repositoryFiles([...SCRIPT_EXTENSIONS, ...MARKUP_EXTENSIONS])
const scanned = await Promise.all(files.map(async (file) => scanSource(file.label, await readFile(file.path, 'utf8'))))
const offences = scanned.flat()

if (offences.length > 0) {
  const lines = offences.map((offence) => `  ${offence.label}:${String(offence.line)}: ${offence.why}`)
  process.stderr.write(`inline styles are not allowed:\n${lines.join('\n')}\n`)
  process.exit(1)
}
process.stdout.write(`no inline styles (${String(files.length)} files)\n`)
