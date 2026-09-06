/**
 * Hold every script to doing nothing when it is imported.
 *
 * The rule lives in `entry-gate.ts`, which is also what the gate's own fixtures
 * drive, so what runs here and what is proved there are the same code.
 *
 * A gate rather than a suite, for the reason the others here are: the
 * instrumenter writes a top-level call into every file it touches, so the case
 * would fail for every mutant alike and a run whose every mutant is killed by
 * the same always-failing case scores a hundred while proving nothing.
 */

import { readFile } from 'node:fs/promises'
import { scanEntry } from './entry-gate.ts'
import { repositoryFiles } from './source-tree.ts'

// Guarded, as every runnable script here is: importing a module must run
// nothing.
if (import.meta.main) {
  const files = repositoryFiles(['.ts']).filter((file) => file.label.startsWith('scripts/'))
  const scanned = await Promise.all(files.map(async (file) => scanEntry(file.label, await readFile(file.path, 'utf8'))))
  const offences = scanned.flat()
  if (offences.length > 0) {
    const lines = offences.map((offence) => `  ${offence.label}:${String(offence.line)}: ${offence.why}`)
    process.stderr.write(`a script does work when it is imported:\n${lines.join('\n')}\n`)
    process.exit(1)
  }
  process.stdout.write(`every script does nothing when imported (${String(files.length)} scripts)\n`)
}
