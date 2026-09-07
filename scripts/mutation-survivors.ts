/**
 * Read a Stryker report and list what survived, grouped by file.
 *
 * A mutation report is a list of tests that do not exist yet. Reading it by
 * hand out of the HTML is how a survivor gets forgotten, so the survivors are
 * printed here in source order with the mutation each one made.
 *
 * The report is read rather than asserted into shape. An interrupted run is
 * the ordinary case here — `check-tree.ts` exists because one happened — and a
 * half-written report reached `Object.entries` on nothing and failed with a
 * type error about a property, rather than saying the report could not be
 * read.
 *
 * @module
 */

import { readFile } from 'node:fs/promises'
import { isJsonObject, type Json, member, readJsonc } from './jsonc.ts'

/** One mutant, as the report records it. */
export interface Mutant {
  readonly mutatorName: string
  readonly replacement?: string
  readonly status: string
  readonly line: number
  readonly column: number
}

/** One file's surviving mutants, in source order. */
export interface SurvivingFile {
  readonly file: string
  readonly mutants: readonly Mutant[]
}

/** Where the report is written, and which status this tool lists by default. */
export const DEFAULT_REPORT = 'reports/mutation/mutation.json'
export const DEFAULT_STATUS = 'Survived'

/**
 * The columns one survivor is written in.
 *
 * A survivor line is read down a terminal, so the place and the mutator's name
 * are padded to a common width and the replacement is cut to what fits beside
 * them. Named rather than written into the template: three widths spelled at
 * the point of use are three numbers nobody can line up by reading.
 */
const PLACE_WIDTH = 9
const MUTATOR_WIDTH = 22
const REPLACEMENT_WIDTH = 90

/**
 * One mutant, read off the report rather than asserted.
 * @param value - one entry of a file's mutant list.
 * @returns the mutant, or undefined when the entry is not one.
 */
function readMutant(value: Json): Mutant | undefined {
  if (!isJsonObject(value)) return undefined
  const location = member(value, 'location')
  const start = isJsonObject(location) ? member(location, 'start') : undefined
  if (!isJsonObject(start)) return undefined
  const line = member(start, 'line')
  const column = member(start, 'column')
  const name = member(value, 'mutatorName')
  const status = member(value, 'status')
  const replacement = member(value, 'replacement')
  if (typeof name !== 'string' || typeof status !== 'string') return undefined
  if (typeof line !== 'number' || typeof column !== 'number') return undefined
  return typeof replacement === 'string'
    ? { mutatorName: name, replacement, status, line, column }
    : { mutatorName: name, status, line, column }
}

/**
 * Every file the report records, with the mutants it records for each.
 * @param document - the parsed report.
 * @returns file to mutants, or undefined when the report is not one this reads.
 */
export function readMutationReport(document: { [key: string]: Json }): ReadonlyMap<string, Mutant[]> | undefined {
  const files = member(document, 'files')
  if (!isJsonObject(files)) return undefined
  const read = new Map<string, Mutant[]>()
  for (const [file, entry] of Object.entries(files)) {
    const listed = isJsonObject(entry) ? member(entry, 'mutants') : undefined
    if (!Array.isArray(listed)) return undefined
    const mutants: Mutant[] = []
    for (const one of listed) {
      const mutant = readMutant(one)
      if (mutant === undefined) return undefined
      mutants.push(mutant)
    }
    read.set(file, mutants)
  }
  return read
}

/**
 * The files carrying a mutant of the wanted status, each in source order.
 *
 * Files carrying none are left out rather than reported empty: this is a list
 * of work to do, and an empty entry is not work.
 * @param report - the report, by file.
 * @param wanted - the status to list, as the report spells it.
 * @returns one entry per file that has one, in the report's own order.
 */
export function survivingFiles(report: ReadonlyMap<string, readonly Mutant[]>, wanted: string): SurvivingFile[] {
  const open: SurvivingFile[] = []
  for (const [file, mutants] of report) {
    const kept = mutants
      .filter((mutant) => mutant.status === wanted)
      .toSorted((left, right) => left.line - right.line || left.column - right.column)
    if (kept.length > 0) open.push({ file, mutants: kept })
  }
  return open
}

/**
 * The report a reader acts on: one heading per file, one line per mutant, and
 * a total.
 * @param open - the files carrying a mutant of the wanted status.
 * @param wanted - the status listed, as the report spells it.
 * @returns the text to write.
 */
export function renderSurvivors(open: readonly SurvivingFile[], wanted: string): string {
  const lines: string[] = []
  let total = 0
  for (const { file, mutants } of open) {
    total += mutants.length
    lines.push(`\n${file} (${String(mutants.length)})`)
    for (const mutant of mutants) {
      const where = `${String(mutant.line)}:${String(mutant.column)}`
      const to = (mutant.replacement ?? '').replaceAll('\n', ' ').slice(0, REPLACEMENT_WIDTH)
      lines.push(`  ${where.padEnd(PLACE_WIDTH)} ${mutant.mutatorName.padEnd(MUTATOR_WIDTH)} -> ${to}`)
    }
  }
  return `${lines.join('\n')}\n\n${String(total)} ${wanted.toLowerCase()}\n`
}

// Guarded, as every runnable script here is: importing a module must run
// nothing. A suite that imports one for the readers it exports would
// otherwise run the whole gate as a side effect of the import.
if (import.meta.main) {
  const [path = DEFAULT_REPORT, wanted = DEFAULT_STATUS] = Bun.argv.slice(2)
  const report = readMutationReport(readJsonc(await readFile(path, 'utf8')))
  if (report === undefined) {
    process.stderr.write(`mutation-survivors: ${path} is not a report this reads\n`)
    process.exit(1)
  }
  process.stdout.write(renderSurvivors(survivingFiles(report, wanted), wanted))
}
