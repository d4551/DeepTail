/**
 * Run the legacy and suppression bans over everything the repository ships.
 *
 * The rules live in `ban-gate.ts`, which is also what the gate's own fixtures
 * drive, so what runs here and what is proved there are the same code.
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
 */

import { readFile } from 'node:fs/promises'
import { PLAIN_EXTENSIONS, SCRIPT_EXTENSIONS, scanSource } from './ban-gate.ts'
import { repositoryFiles } from './source-tree.ts'
import { MARKUP_EXTENSIONS } from './style-gate.ts'

// Guarded, as every runnable script here is: importing a module must run
// nothing. A suite that imports one for the readers it exports would
// otherwise run the whole gate as a side effect of the import.
if (import.meta.main) {
  const extensions = [...new Set([...SCRIPT_EXTENSIONS, ...PLAIN_EXTENSIONS, ...MARKUP_EXTENSIONS])]
  const files = repositoryFiles(extensions)
  const scanned = await Promise.all(
    files.map(async (file) => scanSource(file.label, await readFile(file.path, 'utf8'))),
  )
  const offences = scanned.flat()

  if (offences.length > 0) {
    const lines = offences.map((offence) => `  ${offence.label}:${String(offence.line)}: ${offence.why}`)
    process.stderr.write(`the repository carries a banned idiom or a suppression:\n${lines.join('\n')}\n`)
    process.exit(1)
  }
  process.stdout.write(`no banned idiom or suppression (${String(files.length)} files)\n`)
}
