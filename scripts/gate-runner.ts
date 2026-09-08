/**
 * The reading every gate in the chain shares.
 *
 * Five gates had written this out apiece — walk the files, render an offence,
 * choose an exit status — and every copy sat inside an `import.meta.main`
 * guard, where nothing but the command line could reach it. A refusal could
 * have been emptied, a count could have overstated what was read, and every
 * suite would have stayed green while the chain went on printing a clean line
 * over nothing.
 *
 * It is stated here once, and driven directly by `tests/gate-runner.spec.ts`
 * and `tests/gate-declarations.spec.ts`. The streams are a parameter rather
 * than a global so the report is a value a case can read, not a side effect it
 * has to intercept.
 *
 * @module
 */

import { readFile } from 'node:fs/promises'
import type { Offence } from './offence.ts'
import { repositoryFiles, type SourceFile } from './source-tree.ts'

/**
 * What one gate declares about itself.
 *
 * Every field is what a reader of the chain's output acts on, so every field is
 * reachable from a suite: the kinds of file the gate opens, the two sentences it
 * prints, and the rule it applies to one file's text.
 */
export interface Gate {
  /** The file kinds this gate opens, each including its dot. */
  readonly extensions: readonly string[]
  /** The sentence printed above the offences, without its colon. */
  readonly refusal: string
  /**
   * The sentence printed when nothing was refused.
   * @param files - how many files were actually read.
   * @returns the line, without its newline.
   */
  readonly clean: (files: number) => string
  /**
   * The rule, applied to one file.
   * @param label - the file's repository-relative path.
   * @param text - the file's contents.
   * @returns one entry per rejected construct.
   */
  readonly scan: (label: string, text: string) => readonly Offence[]
  /**
   * Which of the listed files this gate reads, when it reads a subset.
   *
   * A gate that narrows here also counts what it narrowed to: a gate that read
   * a subset and reported the whole list would overstate its own reach.
   * @param file - one file from the listing.
   * @returns true when this gate reads it.
   */
  readonly only?: (file: SourceFile) => boolean
}

/** What a gate said, and whether the chain may continue past it. */
export interface GateOutcome {
  /** True when the gate refused nothing. */
  readonly ok: boolean
  /** Everything the gate has to say, newline-terminated. */
  readonly text: string
}

/**
 * The streams a gate run from the command line writes to.
 *
 * The pair a report is written to is typed from this object rather than
 * declared beside it: a second declaration is a shape that can drift from the
 * one thing that actually reaches a person.
 */
export const CONSOLE = {
  /**
   * Write a clean run.
   * @param text - the line to write, newline included.
   */
  out(text: string) {
    process.stdout.write(text)
  },
  /**
   * Write a refusal.
   * @param text - the report to write, newline included.
   */
  err(text: string) {
    process.stderr.write(text)
  },
}

/** The two streams a report is written to. */
export type GateStreams = typeof CONSOLE

/**
 * One offence, as a reader sees it: indented under the refusal above it.
 * @param offence - the rejected construct.
 * @returns the line, without its newline.
 */
export function renderOffence(offence: Offence): string {
  return `  ${offence.label}:${String(offence.line)}: ${offence.why}`
}

/**
 * Run one gate over the files it reads.
 * @param gate - the gate to drive.
 * @param files - the listing to read it through.
 * @returns what the gate has to say, and whether it refused anything.
 */
export async function readGate(gate: Gate, files = repositoryFiles(gate.extensions)): Promise<GateOutcome> {
  const narrow = gate.only
  const read = narrow === undefined ? files : files.filter((file) => narrow(file))
  const scanned = await Promise.all(read.map(async (file) => gate.scan(file.label, await readFile(file.path, 'utf8'))))
  const offences = scanned.flat()
  if (offences.length > 0) {
    return { ok: false, text: `${gate.refusal}:\n${offences.map((offence) => renderOffence(offence)).join('\n')}\n` }
  }
  // The count is of what was read, not of what was listed: the clean line is a
  // claim about how much was looked at.
  return { ok: true, text: `${gate.clean(read.length)}\n` }
}

/**
 * Write one gate's report and answer with the status the chain exits on.
 * @param outcome - what the gate said.
 * @param streams - where to write it.
 * @returns the exit status: zero when the gate refused nothing.
 */
export function reportGate(outcome: GateOutcome, streams: GateStreams): number {
  if (outcome.ok) {
    streams.out(outcome.text)
    return 0
  }
  streams.err(outcome.text)
  return 1
}
