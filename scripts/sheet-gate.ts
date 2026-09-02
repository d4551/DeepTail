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
 * is where a length is allowed to be written.
 *
 * @module
 */

import { scanColour } from './colour-gate.ts'
import type { Offence } from './offence.ts'

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
const BREAKPOINT = /@media[^{]*?\b(?:width\s*<=|max-width\s*:)\s*(\d+px)/gu

/** Where a comment opens and closes. */
const COMMENTS = /\/\*[\s\S]*?\*\//gu

/** A rule: its selector list, and the declarations between its braces. */
const RULE = /([^{}]+)\{([^{}]*)\}/gu

/**
 * The at-rules the utility pipeline this product retired shipped in its sheets.
 *
 * `@apply` and its siblings compile away into the declarations a stylesheet
 * here states directly, so one of them marks a sheet written for a pipeline
 * the repository no longer runs — with a class vocabulary no gate reads. The
 * cascade layer CSS itself ships is untouched; only the pipeline's own names
 * are refused.
 */
const RETIRED_AT_RULES = /@(?:apply|tailwind|config|plugin|utility|variant|source|theme|screen|responsive|layer\s+utilities)\b/u

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
 * The sheet with its comments blanked out, offsets preserved.
 *
 * A comment that names a length is prose about the design, not a decision, and
 * a selector written inside one is an example rather than a rule. Blanking
 * rather than deleting keeps every offset, so a line number stays true.
 * @param text - the sheet's contents.
 * @returns the sheet, same length, comments replaced by spaces.
 */
function withoutComments(text: string): string {
  return text.replaceAll(COMMENTS, (comment) => comment.replaceAll(/[^\n]/gu, ' '))
}

/**
 * One declaration, and where it was written.
 *
 * Read out of the rule's body rather than off a line, because one declaration
 * per line is a formatting convention, not a fact: a sheet written or minified
 * onto one line is still a sheet, and a gate that reads lines sees nothing in
 * it at all.
 */
interface Declaration {
  /** The property name, lower case. */
  readonly property: string
  /** Everything after the colon, trimmed. */
  readonly value: string
  /** One-based line the declaration is written on. */
  readonly line: number
}

/**
 * Every declaration a sheet holds, in source order.
 * @param text - the sheet's contents, comments already blanked.
 * @returns the declarations.
 */
function declarationsOf(text: string): Declaration[] {
  const declarations: Declaration[] = []
  for (const rule of text.matchAll(RULE)) {
    const body = rule[2] ?? ''
    const bodyAt = rule.index + (rule[1] ?? '').length + 1
    let cursor = 0
    for (const part of body.split(';')) {
      const colon = part.indexOf(':')
      if (colon !== -1) {
        const property = part.slice(0, colon).trim().toLowerCase()
        const value = part.slice(colon + 1).trim()
        if (property !== '' && value !== '') {
          const at = bodyAt + cursor + part.indexOf(property)
          declarations.push({ property, value, line: text.slice(0, at).split('\n').length })
        }
      }
      cursor += part.length + 1
    }
  }
  return declarations
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
  for (const retired of retiredAtRules(withoutComments(text))) {
    offences.push({
      label,
      line: retired.line,
      why: `${retired.rule} belongs to the utility pipeline this product retired; state the declarations directly`,
    })
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

/** A rule's selector list and the declarations it holds, normalized. */
export interface Ruleset {
  /** The selectors, comma-separated as written, with whitespace collapsed. */
  readonly selector: string
  /** The declarations, in source order, with whitespace collapsed. */
  readonly body: string
  /** One-based line the selector opens on. */
  readonly line: number
}

/**
 * Every rule a sheet declares, with its comments stripped.
 *
 * Read so that two rules with the same selector and the same declarations can
 * be found: the token sheet carried the same four-line block twice, fifty-five
 * lines apart, each with its own paragraph explaining why it was needed, and
 * nothing could see it because both copies declared and both were read.
 * @param text - the sheet's contents.
 * @returns one entry per rule, in source order.
 */
export function rulesetsOf(text: string): Ruleset[] {
  const blanked = withoutComments(text)
  const rules: Ruleset[] = []
  for (const found of blanked.matchAll(RULE)) {
    const raw = found[1] ?? ''
    const selector = raw.trim().replaceAll(/\s+/gu, ' ')
    const body = (found[2] ?? '').trim().replaceAll(/\s+/gu, ' ')
    if (selector === '' || body === '' || selector.startsWith('@')) continue
    // Where the selector is written, not where the match opens: the match runs
    // back through whatever separated this rule from the last one, so a rule
    // after a blanked comment would otherwise be reported on the comment's line.
    const at = found.index + (raw.length - raw.trimStart().length)
    rules.push({ selector, body, line: blanked.slice(0, at).split('\n').length })
  }
  return rules
}
