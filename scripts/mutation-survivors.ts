/**
 * Read a Stryker report and list what survived, grouped by file.
 *
 * A mutation report is a list of tests that do not exist yet. Reading it by
 * hand out of the HTML is how a survivor gets forgotten, so the survivors are
 * printed here in source order with the mutation each one made.
 */

import { readFile } from 'node:fs/promises'

/** One mutant, as the report records it. */
interface Mutant {
  readonly mutatorName: string
  readonly replacement?: string
  readonly status: string
  readonly location: { readonly start: { readonly line: number; readonly column: number } }
}

/** The shape of the report this reads. */
interface Report {
  readonly files: Readonly<Record<string, { readonly mutants: readonly Mutant[] }>>
}

// Guarded, as every runnable script here is: importing a module must run
// nothing. A suite that imports one for the readers it exports would
// otherwise run the whole gate as a side effect of the import.
if (import.meta.main) {
  const [path = 'reports/mutation/mutation.json', wanted = 'Survived'] = Bun.argv.slice(2)
  const report = JSON.parse(await readFile(path, 'utf8')) as Report
  let total = 0
  for (const [file, { mutants }] of Object.entries(report.files)) {
    const open = mutants
      .filter((mutant) => mutant.status === wanted)
      .toSorted((left, right) => left.location.start.line - right.location.start.line)
    if (open.length === 0) continue
    total += open.length
    process.stdout.write(`\n${file} (${String(open.length)})\n`)
    for (const mutant of open) {
      const where = `${String(mutant.location.start.line)}:${String(mutant.location.start.column)}`
      const to = (mutant.replacement ?? '').replaceAll('\n', ' ').slice(0, 90)
      process.stdout.write(`  ${where.padEnd(9)} ${mutant.mutatorName.padEnd(22)} -> ${to}\n`)
    }
  }
  process.stdout.write(`\n${String(total)} ${wanted.toLowerCase()}\n`)
}
