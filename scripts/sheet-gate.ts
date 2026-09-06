/**
 * The rules a stylesheet is read against.
 *
 * No gate read a `.css` file at all: the ban gate and the inline-style gate
 * both parse scripts and markup, and the whole visual layer sat outside every
 * one of them. What that left unchecked was the design system itself — a
 * spacing value written out twenty-nine times, nine hand-rolled radii, a
 * stacking order written twice and racing itself, a breakpoint restated in a
 * second syntax in a second file, and a rule set duplicated byte for byte
 * fifty-five lines from its twin.
 *
 * The rules are stated about declarations, so the sheet is read the way the
 * engine reads it: a comment that names a length is prose, and the token file
 * is where a length is allowed to be written. The read itself lives in
 * `sheet-reader.ts`, shared with every gate that walks a sheet.
 *
 * @module
 */

import type { Offence } from './offence.ts'
import { declarationOffences } from './sheet-declarations.ts'
import { deepSelectors, MAX_COMPOUNDS } from './sheet-depth.ts'
import { duplicateRulesets } from './sheet-duplicates.ts'
import { importOffences } from './sheet-imports.ts'
import { rulesetsOf, withoutComments } from './sheet-reader.ts'

export { deepSelectors, duplicateRulesets }

/**
 * The sheet that is allowed to hold raw values, because it is where they live.
 *
 * Named by its whole path, not by its ending. A gate that exempted any file
 * whose name ended `tokens.css` exempted a file anyone could add: a sheet
 * called `probe-tokens.css` carrying a float, a physical margin, a raw hex
 * colour, a static viewport height and a remote asset passed every rule here
 * whole, because of what it was called.
 */
export const TOKEN_SHEET = 'apps/deeptail/src/styles/tokens.css'

/** Extensions this gate reads. */
export const STYLE_EXTENSIONS = ['.css'] as const

/** A viewport size a media query switches layout on, in either syntax. */
// Layout switches at a size in either query family the sheets use: media for
// the document-level facts, container for a box the component fills. Both axes
// are read: a height breakpoint decides a layout exactly as a width one does,
// and while only widths were read a height could be restated in as many sheets
// as anyone liked with nothing to say so.
const BREAKPOINT = /@(?:media|container)[^{]*?\b(?:(?:width|height)\s*<=|max-(?:width|height)\s*:)\s*(\d+px)/gu

/**
 * The at-rules the utility pipeline this product retired shipped in its sheets.
 *
 * `@apply` and its siblings compile away into the declarations a stylesheet
 * here states directly, so one of them marks a sheet written for a pipeline
 * the repository no longer runs — with a class vocabulary no gate reads. The
 * cascade layer CSS itself ships is untouched; only the pipeline's own names
 * are refused.
 */
const RETIRED_AT_RULES =
  /@(?:apply|tailwind|config|plugin|utility|variant|source|theme|screen|responsive|layer\s+utilities)\b/u

/**
 * Every rule a sheet writes inside another rule.
 *
 * A nested rule rides its parent's scope, and the scoping it is doing — which
 * page, which state — is exactly what stops being reviewed when the rule is
 * read on its own. A selector at the top level states its own scope, so none
 * may ride on another's.
 *
 * Read from the brace structure, not from the `&` operator. CSS nesting needs
 * no `&` at all: `.a { .b { ... } }` is a nest, and while this rule looked for
 * the operator it was one keystroke to write a nest the gate said nothing
 * about — and, worse, a nest hid every declaration of its enclosing rule from
 * the reader that found rules by pattern.
 * @param text - the sheet's contents.
 * @returns one entry per nested rule, with its selector and line.
 */
function nestedSelectors(text: string): { readonly selector: string; readonly line: number }[] {
  return rulesetsOf(text)
    .filter((rule) => rule.nested)
    .map((rule) => ({ selector: rule.selector, line: rule.line }))
}

/**
 * Every line a sheet writes one of the retired at-rules on.
 * @param text - the sheet's contents, comments already blanked.
 * @returns one entry per retired at-rule, with its line.
 */
function retiredAtRules(text: string): { readonly rule: string; readonly line: number }[] {
  const found: { rule: string; line: number }[] = []
  const lines = text.split('\n')
  for (const [index, line] of lines.entries()) {
    const match = RETIRED_AT_RULES.exec(line)
    if (match !== null) found.push({ rule: match[0], line: index + 1 })
  }
  return found
}

/**
 * Every rule a stylesheet breaks.
 * @param label - the path to report offences under.
 * @param text - the sheet's contents.
 * @returns one offence per rejected construct.
 */
export function scanSheet(label: string, text: string): Offence[] {
  const blanked = withoutComments(text)
  const offences: Offence[] = [...duplicateRulesets(label, text)]
  if (label === TOKEN_SHEET) return offences
  for (const deep of deepSelectors(text)) {
    offences.push({
      label,
      line: deep.line,
      why: `${deep.selector} chains past ${String(MAX_COMPOUNDS)} compounds; scope the rule by class instead of structure`,
    })
  }
  for (const nested of nestedSelectors(text)) {
    offences.push({
      label,
      line: nested.line,
      why: `${nested.selector} rides another rule's scope; state the selector at the top level`,
    })
  }
  for (const retired of retiredAtRules(blanked)) {
    offences.push({
      label,
      line: retired.line,
      why: `${retired.rule} belongs to the utility pipeline this product retired; state the declarations directly`,
    })
  }
  offences.push(...importOffences(label, blanked), ...declarationOffences(label, blanked))
  return offences
}

/**
 * Every viewport size a sheet switches its layout at, on either axis.
 *
 * Both syntaxes are read. A gate that knew only the range form reported one
 * breakpoint while a second sat in the other form, in another sheet, deciding
 * another layout — and the invariant it claimed to hold, that the number is
 * written in exactly one place, was false as shipped. Heights are read for the
 * same reason: the drawer's chrome yields at a height, and a number that
 * decides a layout is one decision wherever it is written.
 * @param text - the sheet's contents.
 * @returns the sizes, in the order they are written.
 */
export function breakpointsOf(text: string): string[] {
  // Every captured group of every match, which is one group: reading it by
  // index needs a guard for a case the pattern cannot produce.
  return [...text.matchAll(BREAKPOINT)].flatMap((found) => [...found].slice(1))
}
