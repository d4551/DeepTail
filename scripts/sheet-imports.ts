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

import type { Offence } from './offence.ts'

/** An `@import` target that pulls a retired framework's pipeline in. */
const RETIRED_IMPORT =
  /^["']?@?(?:tailwindcss|daisyui|bootstrap|bulma|foundation-sites|htmx\.org|materialize-css|semantic-ui|uikit|animate\.css|normalize\.css)(?:\/|\.|["';]|$)/iu

/** A URL that loads from outside the shipped bundle, absolute or protocol-relative. */
const REMOTE_URL = /^(?:https?:)?\/\//iu

/** One `@import` target, with the line it is written on. */
interface SheetImport {
  /** The imported path, quotes and `url()` stripped. */
  readonly target: string
  /** The line the import opens on. */
  readonly line: number
}

/**
 * Every `@import` target a sheet names.
 * @param text - the sheet's contents, comments already blanked.
 * @returns one entry per import.
 */
function importsOf(text: string): SheetImport[] {
  const found: SheetImport[] = []
  for (const match of text.matchAll(/@import\s+(?:url\(\s*)?["']?([^"');]+)["']?\)?/gu)) {
    found.push({ target: match[1] ?? '', line: text.slice(0, match.index).split('\n').length })
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
