/**
 * Refuse a working tree a mutation run left rewritten.
 *
 * The mutation runs mutate in place, because the gates read the repository
 * through `git ls-files` and a sandbox copy is not a repository. An interrupted
 * run therefore leaves every file it touched carrying the instrumenter's switch
 * wrapped around every expression — which happened here, to all of `scripts/`.
 * A tree in that state still type-checks and still passes its suites, so
 * nothing else says so.
 *
 * This is a property of the tree at rest rather than of any code in it, so it
 * is a gate rather than a test: a suite would fail during every mutation run,
 * where the tree is instrumented on purpose, and a run whose every mutant is
 * killed by the same always-failing case scores a hundred while proving
 * nothing.
 */

import { readFile } from 'node:fs/promises'
import { repositoryFiles } from './source-tree.ts'

/** The switch the instrumenter wraps around every mutated expression. */
const MARKER = ['stry', 'MutAct_'].join('')

// Guarded, as every runnable script here is: importing a module must run
// nothing. A suite that imports one for the readers it exports would
// otherwise run the whole gate as a side effect of the import.
if (import.meta.main) {
  const files = repositoryFiles(['.ts', '.tsx', '.js'])
  const read = await Promise.all(
    files.map(async (file) => ({ label: file.label, text: await readFile(file.path, 'utf8') })),
  )
  const carrying = read.flatMap((file) => (file.text.includes(MARKER) ? [file.label] : []))

  if (carrying.length > 0) {
    process.stderr.write(
      `a mutation run left these files instrumented; run \`bun scripts/mutate-restore.ts\`:\n${carrying
        .map((label) => `  ${label}`)
        .join('\n')}\n`,
    )
    process.exit(1)
  }
  process.stdout.write(`no instrumentation left behind (${String(files.length)} files)\n`)
}
