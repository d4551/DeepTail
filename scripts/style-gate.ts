/**
 * The inline-style ban, read off the syntax tree rather than the text.
 *
 * Every visual belongs to a stylesheet, so the two products stay one design
 * system and a token change reaches everything. Neither oxlint nor Biome has a
 * rule for `element.style.x = …` in plain DOM, so the ban is an executed gate.
 *
 * It is executed against a real parse. A gate that reads lines has to guess
 * which of them are comments, which are prose and which are its own rule
 * table, and every one of those guesses is a way through it: a different case,
 * a name in a variable, a name spelt with `+`. None of those survive a parser.
 * Scripts are parsed by oxc — the same parser the project's linter uses — and
 * markup by parse5, which implements the HTML parsing algorithm the browser
 * does. The rules below are stated about nodes, so there is nothing to spell
 * around and no allowance to grant: this module's own rule table is string
 * data in an array, which is not a property access, a call, or an attribute.
 *
 * @module
 */

import { parseScript, walk } from './ast.ts'
import { constants } from './fold.ts'
import { scanMarkup } from './markup-gate.ts'
import { inspect, type Report } from './style-rules.ts'

/** Extensions the script scanner reads. */
export const SCRIPT_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'] as const

/** Extensions the markup scanner reads. */
export const MARKUP_EXTENSIONS = ['.html', '.htm'] as const

/** One rejected construct. */
export interface Offence {
  /** Repository-relative path of the file it was found in. */
  readonly label: string
  /** One-based line number. */
  readonly line: number
  /** What is wrong, and what to do instead. */
  readonly why: string
}

/**
 * Every inline style a script reaches for.
 * @param label - the path to report offences under.
 * @param text - the file's contents.
 * @returns one offence per rejected construct.
 */
export function scanScript(label: string, text: string): Offence[] {
  const parsed = parseScript(label, text)
  const offences: Offence[] = []
  const report: Report = (node, why) => {
    offences.push({ label, line: parsed.lineAt(node['start']), why })
  }
  for (const error of parsed.errors) {
    offences.push({ label, line: 1, why: `this file does not parse, so it cannot be checked: ${error.message}` })
  }
  const env = constants(parsed.body)
  walk(parsed.body, (node) => {
    inspect(env, node, report)
  })
  return offences
}

/**
 * Scan one file, choosing the reader its extension calls for.
 * @param label - the path, which also selects the reader.
 * @param text - the file's contents.
 * @returns one offence per rejected construct.
 */
export function scanSource(label: string, text: string): Offence[] {
  if (MARKUP_EXTENSIONS.some((extension) => label.endsWith(extension))) return scanMarkup(label, text)
  return scanScript(label, text)
}
