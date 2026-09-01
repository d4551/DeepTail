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

import { isNode, memberName, type Node, parseScript, walk } from './ast.ts'
import { type Constants, constants, staticString } from './fold.ts'
import { markupOffences, scanMarkup } from './markup-gate.ts'

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

/** Properties that reach an element's own style declaration, keyed in lower case. */
const STYLE_PROPERTIES = new Map<string, string>([
  ['style', 'an element style declaration is an inline style; put the rule in a stylesheet and add a class'],
  ['csstext', 'writing cssText replaces an inline style block; put the rule in a stylesheet and add a class'],
  ['attributestylemap', 'the typed style map is the style attribute; put the rule in a stylesheet and add a class'],
])

/** Calls that set an attribute, and which argument names it. */
const ATTRIBUTE_SETTERS = new Map<string, number>([
  ['setAttribute', 0],
  ['setAttributeNS', 1],
  ['createAttribute', 0],
  ['createAttributeNS', 1],
  ['toggleAttribute', 0],
])

/** Calls that write a property under a name, and which argument names it. */
const KEYED_WRITES = new Map<string, number>([
  ['set', 1],
  ['defineProperty', 1],
])

/** Namespaces whose keyed writes reach an object's own properties. */
const KEYED_WRITE_HOSTS = new Set(['Reflect', 'Object'])

/** Calls that set an attribute without ever naming it in the source. */
const OPAQUE_ATTRIBUTE_CALLS = new Map<string, string>([
  ['setAttributeNode', 'an attribute node hides its name from every checker; use setAttribute with a literal name'],
  ['setAttributeNodeNS', 'an attribute node hides its name from every checker; use setAttributeNS with a literal name'],
  ['setNamedItem', 'the attribute map hides the name from every checker; use setAttribute with a literal name'],
])

/** The attribute this gate exists to keep out of the product. */
const STYLE_ATTRIBUTE = 'style'

/**
 * The key a property or member names, however it is written.
 * @param env - the file's constants.
 * @param node - the property or member expression.
 * @param computed - whether the key is an expression rather than a name.
 * @returns the key, or undefined when it is not decidable.
 */
function keyOf(env: Constants, node: unknown, computed: boolean): string | undefined {
  if (!isNode(node)) return undefined
  if (!computed) {
    if (node.type === 'Identifier' && typeof node['name'] === 'string') return node['name']
    if (node.type === 'Literal' && typeof node.value === 'string') return node.value
    return undefined
  }
  return staticString(env, node)
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
  const report = (node: Node, why: string): void => {
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
  const key = keyOf(env, node['property'], node['computed'] === true)
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
  const properties = node['properties']
  if (!Array.isArray(properties)) return
  for (const property of properties) {
    if (!isNode(property) || property.type !== 'Property') continue
    const key = keyOf(env, property['key'], property['computed'] === true)
    if (key === undefined) continue
    const why = STYLE_PROPERTIES.get(key.toLowerCase())
    if (why !== undefined) report(property, why)
  }
}

/**
 * Reject the calls that set an attribute, unless they name one that is not the
 * style attribute, in a form the gate can read.
 * @param env - the file's constants.
 * @param node - the call expression.
 * @param report - records an offence.
 */
function inspectCall(env: Constants, node: Node, report: (node: Node, why: string) => void): void {
  const callee = node['callee']
  if (!isNode(callee) || callee.type !== 'MemberExpression') return
  const method = memberName(callee)
  if (method === undefined) return
  const args = Array.isArray(node['arguments']) ? node['arguments'] : []
  const opaque = OPAQUE_ATTRIBUTE_CALLS.get(method)
  if (opaque !== undefined) {
    report(node, opaque)
    return
  }
  const setter = ATTRIBUTE_SETTERS.get(method)
  if (setter !== undefined) {
    checkName(env, node, args[setter], 'attribute', report)
    return
  }
  const keyed = KEYED_WRITES.get(method)
  const host = callee['object']
  if (keyed === undefined || !isNode(host) || host.type !== 'Identifier') return
  if (typeof host['name'] !== 'string' || !KEYED_WRITE_HOSTS.has(host['name'])) return
  checkName(env, node, args[keyed], 'property', report)
}

/**
 * Require a name the gate can read, and reject it when it is the style one.
 * @param env - the file's constants.
 * @param node - the call, for the line it is reported on.
 * @param argument - the expression that names the attribute or property.
 * @param kind - the word the message uses for what is being named.
 * @param report - records an offence.
 */
function checkName(
  env: Constants,
  node: Node,
  argument: unknown,
  kind: string,
  report: (node: Node, why: string) => void,
): void {
  if (argument === undefined) return
  const name = staticString(env, argument)
  if (name === undefined) {
    report(node, `the ${kind} name must be written as a literal, so this gate and the next reader can both read it`)
    return
  }
  if (name.toLowerCase() === STYLE_ATTRIBUTE) {
    report(node, `setting the ${kind} named style is an inline style; put the rule in a stylesheet and add a class`)
  }
}

/**
 * Reject markup written in the source that carries a style attribute, whatever
 * is going to insert it.
 * @param env - the file's constants.
 * @param node - a string-producing expression.
 * @param report - records an offence.
 */
function inspectMarkupString(env: Constants, node: Node, report: (node: Node, why: string) => void): void {
  const text = staticString(env, node)
  if (text === undefined || !text.includes('<')) return
  if (markupOffences(text).length === 0) return
  report(node, 'this markup carries a style attribute; put the rule in a stylesheet and add a class')
}

/**
 * Scan one file, choosing the reader its extension calls for.
 * @param label - the path, which also selects the reader.
 * @param text - the file's contents.
 * @returns one offence per rejected construct.
 */
export { scanMarkup }

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
