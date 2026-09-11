/**
 * The import rules a stylesheet is read against.
 *
 * Split from `sheet-gate.ts` the day that module outgrew the size its own
 * rules allow a file to reach. An import is read off the whole sheet rather
 * than off the rule bodies: it sits at the top of the sheet, outside every
 * rule, and a reader that walks only rulesets never sees it — which is how a
 * sheet could import a retired framework's pipeline with every other check
 * green.
 *
 * @module
 */

import { lineReader } from './lines.ts'
import type { Offence } from './offence.ts'

/** An `@import` target that pulls a retired framework's pipeline in. */
const RETIRED_IMPORT =
  /^@?(?:tailwindcss|daisyui|bootstrap|bulma|foundation-sites|htmx(?:\.org)?|alpinejs|materialize-css|semantic-ui|uikit|animate\.css|normalize\.css)(?:\/|\.|["';]|$)/iu

/** A URL that loads from outside the shipped bundle, absolute or protocol-relative. */
const REMOTE_URL = /^(?:https?:)?\/\//iu

/** One `@import` target, with the line it is written on. */
export interface SheetImport {
  /** The imported path, quotes and `url()` stripped. */
  readonly target: string
  /** The line the import opens on. */
  readonly line: number
}

/**
 * The line an offset falls on.
 * @param text - the sheet's contents.
 * @param at - the offset.
 * @returns the one-based line.
 */
function lineOf(text: string, at: number): number {
  return lineReader(text)(at)
}

/**
 * Every `@import` target a sheet names.
 *
 * Exported because it is a contract of its own: what counts as the target of an
 * import, and which line it is written on, is what every rule below is stated
 * about, and neither is observable through those rules once a target has been
 * judged.
 * @param text - the sheet's contents, comments already blanked.
 * @returns one entry per import.
 */
export function importsOf(text: string): SheetImport[] {
  const found: SheetImport[] = []
  // The target stops at the closing quote, the parenthesis or the semicolon,
  // so nothing after it needs matching; and the capture is read as the group it
  // is rather than by an index that has to be defended against being absent.
  for (const match of text.matchAll(/@import\s+(?:url\(\s*)?["']?([^"');]+)/gu)) {
    for (const target of [...match].slice(1)) {
      found.push({ target, line: lineOf(text, match.index) })
    }
  }
  return found
}

/**
 * Every import a sheet makes that it may not make.
 * @param label - the path to report offences under.
 * @param text - the sheet's contents, comments already blanked.
 * @returns one offence per remote or retired import.
 */
export function importOffences(label: string, text: string): Offence[] {
  const offences: Offence[] = []
  for (const imported of importsOf(text)) {
    if (REMOTE_URL.test(imported.target)) {
      offences.push({
        label,
        line: imported.line,
        why: 'a remote import loads a sheet no local install ships; ship the sheet in the bundle',
      })
      continue
    }
    if (RETIRED_IMPORT.test(imported.target)) {
      offences.push({
        label,
        line: imported.line,
        why: `${imported.target} is a retired framework's pipeline; state the declarations directly`,
      })
    }
  }
  return offences
}
