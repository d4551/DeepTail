/**
 * Reading the repository once, for every gate that reads it.
 *
 * Five gates walked the tree, scanned each file, rendered each offence and
 * chose an exit status, and all five had written it out: five copies of one
 * loop, five renderings of one offence, five decisions about what a clean run
 * prints. A copy is a place the report can drift, and four of the five were
 * reachable by no test at all — the work sat inside the `import.meta.main`
 * guard, where nothing but the command line can reach it.
 *
 * One reader, one rendering, one outcome. What each gate still says for itself
 * is its own: which files it reads, what it refuses, and how it says so.
 *
 * @module
 */

import { readFile } from 'node:fs/promises'
import type { Offence } from './offence.ts'
import { repositoryFiles, type SourceFile } from './source-tree.ts'

/** What one gate is, apart from the reading every gate shares. */
export interface Gate {
  /** The file kinds it reads, each including its dot. */
  readonly extensions: readonly string[]
  /** What it says before listing what it refused. */
  readonly refusal: string
  /** What it says when it refused nothing, given how many files it read. */
  readonly clean: (files: number) => string
  /** What it refuses, in one file. */
  readonly scan: (label: string, text: string) => readonly Offence[]
  /** Which of the files it reads, when it reads only some of them. */
  readonly only?: (file: SourceFile) => boolean
}

/** What a gate found, and what to print. */
export interface GateOutcome {
  /** True when the gate refused nothing. */
  readonly ok: boolean
  /** The whole of what the gate has to say, newline-terminated. */
  readonly text: string
}

/** Where a gate's report goes. */
export interface Streams {
  readonly out: (text: string) => void
  readonly err: (text: string) => void
}

/** The streams a gate writes to when it is run from the command line. */
export const CONSOLE: Streams = {
  out: (text: string) => {
    process.stdout.write(text)
  },
  err: (text: string) => {
    process.stderr.write(text)
  },
}

/**
 * One offence, as every gate reports it.
 * @param offence - the rejected construct.
 * @returns the line, indented under the refusal.
 */
export function renderOffence(offence: Offence): string {
  return `  ${offence.label}:${String(offence.line)}: ${offence.why}`
}

/**
 * Run one gate over the files it reads.
 * @param gate - what to read and what to refuse.
 * @param files - the files to read, for a caller that has its own list.
 * @returns what it found, and what to print.
 */
export async function readGate(gate: Gate, files = repositoryFiles(gate.extensions)): Promise<GateOutcome> {
  const read = gate.only === undefined ? files : files.filter((file) => gate.only?.(file) === true)
  const scanned = await Promise.all(read.map(async (file) => gate.scan(file.label, await readFile(file.path, 'utf8'))))
  const offences = scanned.flat()
  if (offences.length === 0) return { ok: true, text: `${gate.clean(read.length)}\n` }
  return { ok: false, text: `${gate.refusal}:\n${offences.map((one) => renderOffence(one)).join('\n')}\n` }
}

/**
 * Say what a gate found, and answer with the status it exits under.
 * @param outcome - what the gate found.
 * @param streams - where the report goes.
 * @returns the exit status: nought when it refused nothing.
 */
export function reportGate(outcome: GateOutcome, streams: Streams): number {
  if (outcome.ok) {
    streams.out(outcome.text)
    return 0
  }
  streams.err(outcome.text)
  return 1
}
