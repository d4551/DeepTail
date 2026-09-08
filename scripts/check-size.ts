/**
 * Refuse a monolith in the languages no linter here reads.
 *
 * TypeScript is already held: oxlint's `max-lines` is on through the pedantic
 * category and caps every module at three hundred lines. Rust, CSS and the
 * shell's markup are held by nothing at all — clippy states no file length,
 * and no stylesheet tool in this chain reads one — so `commands.rs` could have
 * grown to any size it liked and every gate would have stayed green.
 *
 * This is therefore scoped to exactly those three kinds. A second rule over
 * TypeScript would be a rule that can never fire: oxlint counts every line
 * and this counts a subset of them, so any file this refused would have been
 * refused there first, and a gate that cannot fire is a clean line printed
 * over nothing.
 *
 * What is counted is code, not prose. This repository documents heavily and on
 * purpose, and a ceiling that counted docblocks would be a ceiling that paid
 * for every explanation by taking a line of the budget — the exact incentive
 * that leaves the next reader with nothing. Comment lines and blank lines are
 * therefore dropped before counting, so the number is what the file actually
 * asks a reader to follow.
 *
 * The comment reader is deliberately generous: a block comment opening inside
 * a string literal would blank text that is really code, which can only make a
 * file measure smaller. This gate would then stay quiet about a file it should
 * refuse, which is a gap in coverage — and never a refusal aimed at a file
 * that has done nothing wrong.
 *
 * @module
 */

import { CONSOLE, type Gate, readGate, reportGate } from './gate-runner.ts'
import type { Offence } from './offence.ts'
import { repositoryFiles } from './source-tree.ts'

/**
 * The most code one file may carry, in lines that are neither blank nor
 * comment.
 *
 * The same three hundred oxlint holds TypeScript to, so the tree has one
 * ceiling rather than two numbers a reader has to keep apart. What differs is
 * what is counted: this drops the prose, which is why a Rust file dense with
 * doc comments is measured on the code a reader has to follow rather than on
 * the explanation that helps them follow it.
 *
 * The largest file this reads is `apps/deeptail/src-tauri/src/commands.rs` at
 * 268 lines of code, so the margin is real but not wide — which is the point
 * of stating it here.
 */
export const MAX_CODE_LINES = 300

/** Where a block comment opens and closes, in every dialect this reads. */
const BLOCK_COMMENTS = /\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/gu

const COMMENT_LINE = /^\/\//u

/**
 * How many lines of a file are code.
 *
 * Blanked rather than deleted, so a multi-line comment leaves its lines behind
 * as empty ones and is dropped by the same rule that drops a blank line.
 * @param text - the file's contents.
 * @returns the count.
 */
export function codeLines(text: string): number {
  const blanked = text.replaceAll(BLOCK_COMMENTS, (comment) => comment.replaceAll(/[^\n]/gu, ' '))
  return blanked.split('\n').filter((line) => {
    const trimmed = line.trim()
    return trimmed !== '' && !COMMENT_LINE.test(trimmed)
  }).length
}

/** The gate the chain runs, and the suites drive. */
export const GATE: Gate = {
  extensions: ['.rs', '.css', '.html'],
  refusal: 'files have grown past the size a reader can hold, and want splitting along a seam',
  clean: (files: number) => `every file is a size a reader can hold (${String(files)} files)\n`,
  scan(label: string, text: string): readonly Offence[] {
    const lines = codeLines(text)
    if (lines <= MAX_CODE_LINES) return []
    return [
      {
        label,
        line: 1,
        why: `${String(lines)} lines of code, past the ${String(MAX_CODE_LINES)} a file may carry; split it along a seam it already has`,
      },
    ]
  },
}

// Guarded, as every runnable script here is: importing a module must run
// nothing. A suite that imports one for the readers it exports would
// otherwise run the whole gate as a side effect of the import.
if (import.meta.main) {
  process.exit(reportGate(await readGate(GATE, repositoryFiles(GATE.extensions)), CONSOLE))
}
