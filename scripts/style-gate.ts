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

import { isNode, type Node, parseScript, walk } from './ast.ts'
import { approximateString, type Constants, constants } from './fold.ts'
import { markupOffences, scanMarkup } from './markup-gate.ts'
import type { Offence } from './offence.ts'
import { inspectCall, keyOf, STYLE_PROPERTIES } from './style-writes.ts'

/** Extensions the script scanner reads. */
export const SCRIPT_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'] as const

/** Extensions the markup scanner reads. */
export const MARKUP_EXTENSIONS = ['.html', '.htm'] as const

/**
 * Every inline style a script reaches for.
 * @param label - the path to report offences under.
 * @param text - the file's contents.
 * @returns one offence per rejected construct.
 */
export function scanScript(label: string, text: string): Offence[] {
  const parsed = parseScript(label, text)
  const offences: Offence[] = []
  const report = (node: Node, why: string): void => {
    offences.push({ label, line: parsed.lineAt(node.start), why })
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
 * Judge one node against every rule.
 * @param env - the file's constants.
 * @param node - the node to judge.
 * @param report - records an offence against a node.
 */
function inspect(env: Constants, node: Node, report: (node: Node, why: string) => void): void {
  INSPECTORS.get(node.type)?.(env, node, report)
}

/** Which rule reads which kind of node. */
const INSPECTORS = new Map<string, (env: Constants, node: Node, report: (node: Node, why: string) => void) => void>([
  ['MemberExpression', inspectMember],
  ['ObjectPattern', inspectPattern],
  ['JSXAttribute', inspectJsxAttribute],
  ['CallExpression', inspectCall],
  ['Literal', inspectMarkupString],
  ['TemplateLiteral', inspectMarkupString],
  ['BinaryExpression', inspectMarkupString],
])

/**
 * Reject reaching an element's style declaration, spelt plainly or computed.
 * @param env - the file's constants.
 * @param node - the member expression.
 * @param report - records an offence.
 */
function inspectMember(env: Constants, node: Node, report: (node: Node, why: string) => void): void {
  const key = keyOf(env, node.property, node.computed === true)
  if (key === undefined) return
  const why = STYLE_PROPERTIES.get(key.toLowerCase())
  if (why !== undefined) report(node, why)
}

/**
 * Reject taking the style declaration out of an element by destructuring it.
 *
 * Only a binding pattern is judged, not every object that happens to carry a
 * key of that name: `{ style: 'narrow' }` is an option some platform formatters
 * take, and an object built with such a key can only become an inline style by
 * passing through one of the writes above, each of which is already refused.
 * @param env - the file's constants.
 * @param node - the object pattern.
 * @param report - records an offence.
 */
function inspectPattern(env: Constants, node: Node, report: (node: Node, why: string) => void): void {
  const properties = node.properties
  if (!Array.isArray(properties)) return
  for (const property of properties) {
    if (!isNode(property) || property.type !== 'Property') continue
    const key = keyOf(env, property.key, property.computed === true)
    if (key === undefined) continue
    const why = STYLE_PROPERTIES.get(key.toLowerCase())
    if (why !== undefined) report(property, why)
  }
}

/**
 * Reject the style attribute written in JSX.
 *
 * The dialects this gate reads include the ones that carry JSX, so the markup
 * form of the attribute has to be refused there as well as in a string.
 * @param _env - the file's constants, which a written attribute name needs none of.
 * @param node - the JSX attribute.
 * @param report - records an offence.
 */
function inspectJsxAttribute(_env: Constants, node: Node, report: (node: Node, why: string) => void): void {
  const name = node.name
  if (!isNode(name)) return
  const written = typeof name.name === 'string' ? name.name : undefined
  if (written === undefined) return
  const why = STYLE_PROPERTIES.get(written.toLowerCase())
  if (why !== undefined) report(node, why)
}

/**
 * Reject markup written in the source that carries a style attribute, whatever
 * is going to insert it.
 * @param env - the file's constants.
 * @param node - a string-producing expression.
 * @param report - records an offence.
 */
function inspectMarkupString(env: Constants, node: Node, report: (node: Node, why: string) => void): void {
  // Read as far as it can be read: a value interpolated into the markup stands
  // in as a placeholder, so a tag whose refused attribute is written half in
  // the source still names that attribute. Requiring the whole string to fold
  // let every runtime-assembled fragment through.
  const text = approximateString(env, node)
  if (text === undefined || !text.includes('<')) return
  const found = markupOffences(text)
  if (found.length === 0) return
  for (const offence of found) report(node, offence.why)
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
