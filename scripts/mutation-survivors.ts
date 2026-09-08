/**
 * Read a Stryker report and list what survived, grouped by file.
 *
 * A mutation report is a list of tests that do not exist yet. Reading it by
 * hand out of the HTML is how a survivor gets forgotten, so the survivors are
 * printed here in source order with the mutation each one made.
 *
 * The reading and the rendering are separate exported functions rather than a
 * body inside the program's guard: everything here used to live under
 * `import.meta.main`, where no suite could reach it, and the whole module
 * scored zero on the mutation run it exists to serve.
 *
 * @module
 */

import { readFile } from 'node:fs/promises'

/** One mutant, as the report records it. */
export interface Mutant {
  readonly mutatorName: string
  readonly replacement?: string
  readonly status: string
  readonly location: { readonly start: { readonly line: number; readonly column: number } }
}

/** The shape of the report this reads. */
export interface Report {
  readonly files: Readonly<Record<string, { readonly mutants: readonly Mutant[] }>>
}

/** The mutants of one status in one file, in source order. */
export interface OpenFile {
  readonly file: string
  readonly mutants: readonly Mutant[]
}

/** Where a report is written unless the caller names another. */
export const DEFAULT_REPORT = 'reports/mutation/mutation.json'

/** The status a run leaves on a mutant no test noticed. */
export const DEFAULT_STATUS = 'Survived'

/** How wide a location is padded, so the mutations line up down the column. */
const LOCATION_WIDTH = 9

/** How wide a mutator name is padded, for the same reason. */
const MUTATOR_WIDTH = 22

/** How much of a replacement is shown before it is cut. */
const REPLACEMENT_WIDTH = 90

/**
 * Every file carrying a mutant of the wanted status, with those mutants in
 * source order.
 *
 * Files carrying none are left out rather than listed empty: a report is read
 * to find work, and a file with no work in it is not work.
 * @param report - the report a run wrote.
 * @param wanted - the status to collect, such as `Survived`.
 * @returns one entry per file that has one, in the order the report lists them.
 */
export function openMutants(report: Report, wanted: string): OpenFile[] {
  return Object.entries(report.files).flatMap(([file, { mutants }]) => {
    const open = mutants
      .filter((mutant) => mutant.status === wanted)
      .toSorted((left, right) => left.location.start.line - right.location.start.line)
    return open.length === 0 ? [] : [{ file, mutants: open }]
  })
}

/**
 * One mutant as a line a reader can act on.
 * @param mutant - the mutant to render.
 * @returns the line, without its newline.
 */
function renderMutant(mutant: Mutant): string {
  const where = `${String(mutant.location.start.line)}:${String(mutant.location.start.column)}`
  const to = (mutant.replacement ?? '').replaceAll('\n', ' ').slice(0, REPLACEMENT_WIDTH)
  return `  ${where.padEnd(LOCATION_WIDTH)} ${mutant.mutatorName.padEnd(MUTATOR_WIDTH)} -> ${to}`
}

/**
 * The whole report this program prints.
 * @param open - the files carrying open mutants.
 * @param wanted - the status they were collected under.
 * @returns the text, ending in a newline.
 */
export function renderMutants(open: readonly OpenFile[], wanted: string): string {
  const total = open.reduce((count, entry) => count + entry.mutants.length, 0)
  const sections = open.map((entry) =>
    [`\n${entry.file} (${String(entry.mutants.length)})`, ...entry.mutants.map((mutant) => renderMutant(mutant))].join(
      '\n',
    ),
  )
  return `${sections.join('\n')}\n\n${String(total)} ${wanted.toLowerCase()}\n`
}

// Guarded, as every runnable script here is: importing a module must run
// nothing. A suite that imports one for the readers it exports would
// otherwise run the whole gate as a side effect of the import.
if (import.meta.main) {
  const [path = DEFAULT_REPORT, wanted = DEFAULT_STATUS] = Bun.argv.slice(2)
  const report = JSON.parse(await readFile(path, 'utf8')) as Report
  process.stdout.write(renderMutants(openMutants(report, wanted), wanted))
}
