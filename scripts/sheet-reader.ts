/**
 * The reader a stylesheet is parsed with.
 *
 * Reading a sheet is its own concern: the rules a gate states are stated about
 * declarations and rules, and the same read — comments blanked with offsets
 * preserved, rules found wherever the braces sit — serves every gate that
 * walks a sheet. Keeping the read here is what keeps one gate's notion of
 * "a rule" from drifting from another's.
 *
 * @module
 */

/** Where a comment opens and closes. */
const COMMENTS = /\/\*[\s\S]*?\*\//gu

/** A rule: its selector list, and the declarations between its braces. */
const RULE = /([^{}]+)\{([^{}]*)\}/gu

/** A class selector: a dot and the compound token that names the class. */
const CLASS_TOKEN = /\.([a-zA-Z][a-zA-Z0-9-]*)/gu

/**
 * The sheet with its comments blanked out, offsets preserved.
 *
 * A comment that names a length is prose about the design, not a decision, and
 * a selector written inside one is an example rather than a rule. Blanking
 * rather than deleting keeps every offset, so a line number stays true.
 * @param text - the sheet's contents.
 * @returns the sheet, same length, comments replaced by spaces.
 */
export function withoutComments(text: string): string {
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
export interface Declaration {
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
export function declarationsOf(text: string): Declaration[] {
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
 * every gate that read the sheet read right past it.
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

/**
 * Every class name a sheet's selectors name.
 *
 * The set is the shipped class vocabulary: the one place a class is given
 * meaning. A class a stylesheet never names carries no style and no reviewer,
 * so markup or script that writes one is shipping a decision outside the
 * design system.
 * @param text - the sheet's contents.
 * @returns the class names, in the order first written, duplicates removed.
 */
export function classTokensOf(text: string): string[] {
  const found: string[] = []
  for (const rule of rulesetsOf(text)) {
    for (const match of rule.selector.matchAll(CLASS_TOKEN)) {
      const token = match[1]
      if (token !== undefined && !found.includes(token)) found.push(token)
    }
  }
  return found
}
