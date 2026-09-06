/**
 * Idioms the project has moved past, and directives that switch a checker off.
 *
 * A toolchain that silently slips back, or source that revives an idiom the
 * project has left behind, is a regression no other gate reports: the build
 * still succeeds and every other suite stays green.
 *
 * Both bans are read off a parse. That matters most for the suppression ban,
 * because a directive is *only ever a comment* — so the comments are what is
 * searched, and the tables below, being string data in code, are not comments
 * and cannot match themselves. There is no declaration to skip, and therefore
 * no shape a directive can be dressed in to slip past the skipping.
 *
 * @module
 */

import { aliases } from './aliases.ts'
import { type Comment, type Parsed, parseScript, walk } from './ast.ts'
import { BANNED } from './ban-rules.ts'
import { SCRIPT_EXTENSIONS } from './extensions.ts'
import { constants } from './fold.ts'
import { lineReader } from './lines.ts'
import type { Offence } from './offence.ts'
import type { Names } from './rule-helpers.ts'
import { LINT_LEVEL, rustAttributes } from './rust-attributes.ts'

export { PLAIN_EXTENSIONS } from './extensions.ts'
export { SCRIPT_EXTENSIONS }

/**
 * Directives that switch a checker off, in every language the repository uses.
 *
 * Suppressing a rule hides the defect rather than fixing it, so the ban is
 * absolute; a rule that genuinely does not apply is a rule to remove from the
 * configuration, where the removal is visible.
 */
const SUPPRESSIONS: readonly { readonly pattern: RegExp; readonly why: string }[] = [
  { pattern: /@ts-(?:ignore|nocheck|expect-error)/u, why: 'suppressing the type checker hides the defect' },
  {
    pattern: /(?:eslint|oxlint|biome|knip|rustfmt|clippy)-(?:disable|ignore)/u,
    why: 'suppressing a rule hides the defect',
  },
  { pattern: /(?:istanbul|c8|v8)\s+ignore/u, why: 'excluding a line from coverage hides the gap' },
  { pattern: /@public\b/u, why: 'marking an unused export public hides that nothing imports it' },
]

/**
 * Every doc comment that documents nothing.
 *
 * A doc comment attaches to whatever follows it, so one immediately followed by
 * another attaches to nothing: the reader reads the second, and the first is
 * prose about something that is no longer there. It is what a split leaves
 * behind — the function moved and its documentation stayed — so the stranded
 * block goes on describing a contract at a place that does not hold it, and the
 * function that does hold it is left with none.
 *
 * A file's opening block is exempt, being about the module rather than about
 * the declaration under it: the exemption is positional, so nothing is exempted
 * by carrying a marker.
 * @param parsed - the file's parse.
 * @param text - the file's contents, read for what stands between two blocks.
 * @returns one entry per stranded block, with its line.
 */
function orphanedDocs(parsed: Parsed, text: string): { readonly line: number }[] {
  const firstStatement = parsed.body[0]?.start
  const opensFile = (at: number): boolean => typeof firstStatement !== 'number' || at < firstStatement
  const docs = parsed.comments.filter((comment) => comment.value.startsWith('*'))
  return docs.flatMap((comment, index) => {
    const next = docs[index + 1]
    if (next === undefined || opensFile(comment.start)) return []
    // What stands between them, with every other comment blanked out: a note
    // written between two doc blocks consumes neither of them, so the first is
    // stranded just the same, while a declaration between them is what the
    // first documents.
    const between = blankComments(text, comment.end, next.start, parsed.comments)
    return between.trim() === '' ? [{ line: parsed.lineAt(comment.start) }] : []
  })
}

/**
 * One span of a file with every comment inside it replaced by spaces.
 * @param text - the file's contents.
 * @param from - where the span starts.
 * @param to - where it ends.
 * @param comments - every comment in the file.
 * @returns the span, same length, comments blanked.
 */
function blankComments(text: string, from: number, to: number, comments: readonly Comment[]): string {
  let span = text.slice(from, to)
  for (const comment of comments) {
    if (comment.end <= from || comment.start >= to) continue
    const opens = Math.max(comment.start, from) - from
    const closes = Math.min(comment.end, to) - from
    span = span.slice(0, opens) + ' '.repeat(closes - opens) + span.slice(closes)
  }
  return span
}

/**
 * Every ban a script breaks.
 * @param label - the path to report offences under.
 * @param text - the file's contents.
 * @returns one offence per rejected construct.
 */
export function scanScript(label: string, text: string): Offence[] {
  const parsed = parseScript(label, text)
  const offences: Offence[] = parsed.errors.map((error) => ({
    label,
    line: 1,
    why: `this file does not parse, so it cannot be checked: ${error.message}`,
  }))
  for (const comment of parsed.comments) {
    for (const { pattern, why } of SUPPRESSIONS) {
      if (pattern.test(comment.value)) offences.push({ label, line: parsed.lineAt(comment.start), why })
    }
  }
  for (const orphan of orphanedDocs(parsed, text)) {
    offences.push({
      label,
      line: orphan.line,
      why: 'this doc comment is followed by another, so it documents nothing; move it to what it describes',
    })
  }
  const names: Names = { aliases: aliases(parsed.body), constants: constants(parsed.body) }
  walk(parsed.body, (node) => {
    for (const { holds, why } of BANNED) {
      if (holds(node, names)) offences.push({ label, line: parsed.lineAt(node.start), why })
    }
  })
  return offences
}

/**
 * Every suppression a file with no parser here carries.
 *
 * Rust and the configuration formats have no parser in this repository, so they
 * are read as text. A directive named inside one of their comments is still
 * rejected: a directive that is merely commented out is one someone is keeping.
 * @param label - the path to report offences under.
 * @param text - the file's contents.
 * @returns one offence per directive.
 */
export function scanPlain(label: string, text: string): Offence[] {
  const offences: Offence[] = []
  const at = lineReader(text)
  for (const [index, line] of text.split('\n').entries()) {
    for (const { pattern, why } of SUPPRESSIONS) {
      if (pattern.test(line)) offences.push({ label, line: index + 1, why })
    }
  }
  for (const { start, held } of rustAttributes(text)) {
    if (held === undefined) {
      offences.push({ label, line: at(start), why: 'this attribute never closes, so it cannot be checked' })
      continue
    }
    if (LINT_LEVEL.test(held)) {
      offences.push({ label, line: at(start), why: 'suppressing a Rust lint hides the defect' })
    }
  }
  return offences
}

/**
 * Scan one file, choosing the reader its extension calls for.
 * @param label - the path, which also selects the reader.
 * @param text - the file's contents.
 * @returns one offence per rejected construct.
 */
export function scanSource(label: string, text: string): Offence[] {
  if (SCRIPT_EXTENSIONS.some((extension) => label.endsWith(extension))) return scanScript(label, text)
  return scanPlain(label, text)
}
