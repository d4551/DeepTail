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

/**
 * Every rule a stylesheet breaks.
 * @param label - the path to report offences under.
 * @param text - the sheet's contents.
 * @returns one offence per rejected declaration.
 */
export function scanSheet(label: string, text: string): Offence[] {
  if (label.endsWith(TOKEN_SHEET)) return []
  const offences: Offence[] = []
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

/** The properties that can paint a focus ring. */
const RING_PROPERTIES = new Set(['outline', 'outline-width', 'outline-style', 'box-shadow'])

/** A value that paints nothing. */
const BLANK_VALUES = new Set(['none', '0', '0px'])

/** What a rule's body does to the focus ring. */
interface RingEffect {
  /** True when it switches the user agent's outline off. */
  readonly hides: boolean
  /** True when it paints a ring of its own. */
  readonly paints: boolean
}

/**
 * What one rule body does to the focus ring.
 *
 * The declarations are walked rather than matched with a lookahead: a pattern
 * that reads `outline:` and then asserts the value is not `none` can satisfy
 * the assertion by matching fewer spaces, and reads `outline: none` as a ring.
 * @param body - the rule's declarations, whitespace already collapsed.
 * @returns whether it hides a ring and whether it paints one.
 */
function ringEffect(body: string): RingEffect {
  let hides = false
  let paints = false
  for (const declaration of body.split(';')) {
    const colon = declaration.indexOf(':')
    if (colon === -1) continue
    const property = declaration.slice(0, colon).trim().toLowerCase()
    const value = declaration
      .slice(colon + 1)
      .trim()
      .toLowerCase()
    if (!RING_PROPERTIES.has(property) || value === '') continue
    if (BLANK_VALUES.has(value)) {
      if (property === 'outline' || property === 'outline-style') hides = true
      continue
    }
    paints = true
  }
  return { hides, paints }
}

/**
 * Selectors that switch the focus ring off without writing one back.
 *
 * A control that hides the user agent's ring and never restores it is
 * unreachable by keyboard in any meaningful sense — and `select` and `textarea`
 * shipped that way, hidden by a class rule while the rule that gave the ring
 * back named elements the class did not cover. The restoration is required on
 * the selector that did the hiding, so the two are read together rather than
 * one relying on a coincidence in the other.
 * @param text - the sheet's contents.
 * @returns each selector that hides the ring and restores nothing.
 */
export function unringedSelectors(text: string): string[] {
  const rules = rulesetsOf(text)
  const restored = new Set<string>()
  for (const rule of rules) {
    if (!ringEffect(rule.body).paints) continue
    for (const one of rule.selector.split(',')) {
      const base = one.trim()
      if (base.endsWith(':focus-visible')) restored.add(base.slice(0, -':focus-visible'.length))
    }
  }
  const hidden: string[] = []
  for (const rule of rules) {
    if (!ringEffect(rule.body).hides) continue
    for (const one of rule.selector.split(',')) {
      const base = one.trim()
      if (base !== '' && !restored.has(base)) hidden.push(base)
    }
  }
  return hidden
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
