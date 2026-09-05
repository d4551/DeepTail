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

import { scanColour } from './colour-gate.ts'
import type { Offence } from './offence.ts'
import { declarationsOf, rulesetsOf, withoutComments } from './sheet-reader.ts'

/** The sheet that is allowed to hold raw values, because it is where they live. */
export const TOKEN_SHEET = 'tokens.css'

/** Extensions this gate reads. */
export const STYLE_EXTENSIONS = ['.css'] as const

/**
 * Lengths any sheet may write.
 *
 * A hairline and a focus ring are drawn, not spaced: they are one device pixel
 * and two, at every density and every scale, and naming them would be naming
 * the same number twice. Everything else is a spacing, radius or type decision
 * and belongs to the scale.
 */
const DRAWN_LENGTHS = new Set(['0px', '1px', '2px', '3px'])

/** A stacking order written as a bare number. */
const STACKING = /^-?\d+$/u

/** An `@import` target that pulls a retired framework's pipeline in. */
const RETIRED_IMPORT =
  /^["']?@?(?:tailwindcss|daisyui|bootstrap|bulma|foundation-sites|htmx\.org|materialize-css|semantic-ui|uikit|animate\.css|normalize\.css)(?:\/|\.|["';]|$)/iu

/** A URL that loads from outside the shipped bundle, absolute or protocol-relative. */
const REMOTE_URL = /^(?:https?:)?\/\//iu

/** A `url()` that loads from outside the shipped bundle. */
const REMOTE_URL_VALUE = /url\(\s*["']?(?:https?:)?\/\//giu

/** A length written as a number of pixels. */
const PIXELS = /\b\d+px\b/gu

/** Properties whose lengths are spacing, radius or type decisions. */
const SCALED = new RegExp(
  '^(margin|padding|gap|row-gap|column-gap|inset|top|right|bottom|left' +
    '|margin-(top|right|bottom|left|block|inline)(-start|-end)?' +
    '|padding-(top|right|bottom|left|block|inline)(-start|-end)?' +
    '|inset-(block|inline)(-start|-end)?' +
    '|(min-|max-)?(width|height)|(min-|max-)?(block|inline)-size' +
    '|border-radius|font-size|line-height|grid-template-columns|grid-template-rows' +
    '|scroll-margin|scroll-padding)$',
  'u',
)

/** A viewport width a media query switches on, in either syntax. */
// Layout switches at a width in either query family the sheets use: media for
// the document-level facts, container for a box the component fills.
const BREAKPOINT = /@(?:media|container)[^{]*?\b(?:width\s*<=|max-width\s*:)\s*(\d+px)/gu

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
 * A selector written relative to the rule it sits inside, the nesting
 * operator.
 *
 * This gate reads a rule as one selector list and one flat brace of
 * declarations, so a nested rule is not a structure it can see: the nest is
 * flattened into a rule whose selector carries the operator, and the scoping
 * the nest was doing — which page, which state — is exactly what stops being
 * reviewed. A selector at the top level states its own scope, so none may
 * ride on another rule's.
 */
const NESTED = /(^|[\s,+>~])&/gu

/**
 * Every line a sheet nests a selector on.
 * @param text - the sheet's contents, comments already blanked.
 * @returns one entry per nested selector, with its line.
 */
function nestedSelectors(text: string): { readonly line: number }[] {
  const found: { line: number }[] = []
  for (const match of text.matchAll(NESTED)) {
    found.push({ line: text.slice(0, match.index).split('\n').length })
  }
  return found
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

/** One `@import` target, with the line it is written on. */
interface SheetImport {
  /** The imported path, quotes and `url()` stripped. */
  readonly target: string
  /** The line the import opens on. */
  readonly line: number
}

/**
 * Every `@import` target a sheet names.
 *
 * Read off the whole sheet rather than the rule bodies, because an import is
 * not a declaration: it sits at the top of the sheet, outside every rule, and
 * a reader that walks only rulesets never sees it — which is how a sheet
 * could import a retired framework's pipeline with every other check green.
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

/** How a selector may reach from one compound to the next. */
const COMBINATORS = /\s*[>+~]\s*|\s+/gu

/**
 * The most compounds a selector may chain.
 *
 * Every chain past three is layout reaching through the DOM rather than
 * through a class: it couples a rule to a structure the markup can change
 * without the sheet ever being told, and it is how a sheet grows a branch per
 * page instead of a class per role.
 */
const MAX_COMPOUNDS = 3

/**
 * How many compounds one comma-separated selector chains.
 * @param one - a single selector, no commas.
 * @returns the count of compounds the selector reaches through.
 */
function compoundsOf(one: string): number {
  return one.split(COMBINATORS).filter((compound) => compound !== '').length
}

/**
 * Every selector that chains more compounds than the design allows.
 *
 * @param text - the sheet's contents.
 * @returns one entry per over-deep selector, with the line its rule opens on.
 */
export function deepSelectors(text: string): { readonly selector: string; readonly line: number }[] {
  return rulesetsOf(text)
    .flatMap((rule) => rule.selector.split(',').map((one) => ({ selector: one.trim(), line: rule.line }) as const))
    .filter((one) => compoundsOf(one.selector) > MAX_COMPOUNDS)
    .map((one) => ({ selector: one.selector, line: one.line }))
}

/**
 * Every rule a stylesheet breaks.
 * @param label - the path to report offences under.
 * @param text - the sheet's contents.
 * @returns one offence per rejected declaration.
 */
export function scanSheet(label: string, text: string): Offence[] {
  if (label.endsWith(TOKEN_SHEET)) return []
  const offences: Offence[] = []
  for (const deep of deepSelectors(text)) {
    offences.push({
      label,
      line: deep.line,
      why: `${deep.selector} chains past ${String(MAX_COMPOUNDS)} compounds; scope the rule by class instead of structure`,
    })
  }
  for (const nested of nestedSelectors(withoutComments(text))) {
    offences.push({
      label,
      line: nested.line,
      why: "a nested selector rides another rule's scope; state the selector at the top level",
    })
  }
  for (const retired of retiredAtRules(withoutComments(text))) {
    offences.push({
      label,
      line: retired.line,
      why: `${retired.rule} belongs to the utility pipeline this product retired; state the declarations directly`,
    })
  }
  for (const imported of importsOf(withoutComments(text))) {
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
  for (const { property, value, line } of declarationsOf(withoutComments(text))) {
    if (property.startsWith('--')) continue
    if (property === 'z-index') {
      if (STACKING.test(value)) {
        offences.push({ label, line, why: 'a stacking order belongs to the z-index scale in tokens.css' })
      }
      continue
    }
    if (property === 'float') {
      offences.push({ label, line, why: 'float is legacy layout; use flex or grid' })
      continue
    }
    if (property === 'text-align' && value.includes('justify')) {
      offences.push({
        label,
        line,
        why: 'justified text is an alignment defect; use text-align start or left',
      })
      continue
    }
    if (REMOTE_URL_VALUE.test(value)) {
      offences.push({
        label,
        line,
        why: 'a remote URL loads an asset no local install ships; ship the asset in the bundle',
      })
    }
    offences.push(...scanColour(label, value, line))
    if (!SCALED.test(property)) continue
    const lengths = [...value.matchAll(PIXELS)].map((found) => found[0]).filter((px) => !DRAWN_LENGTHS.has(px))
    if (lengths.length === 0) continue
    offences.push({
      label,
      line,
      why: `${lengths.join(', ')} is written out rather than read from the scale in tokens.css`,
    })
  }
  return offences
}

/**
 * Every viewport width a sheet switches its layout at.
 *
 * Both syntaxes are read. A gate that knew only the range form reported one
 * breakpoint while a second sat in the other form, in another sheet, deciding
 * another layout — and the invariant it claimed to hold, that the number is
 * written in exactly one place, was false as shipped.
 * @param text - the sheet's contents.
 * @returns the widths, in the order they are written.
 */
export function breakpointsOf(text: string): string[] {
  return [...text.matchAll(BREAKPOINT)].map((found) => found[1] ?? '')
}
