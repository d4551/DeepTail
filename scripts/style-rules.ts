/**
 * The rules the inline-style gate is made of, one per kind of node.
 *
 * A rule is stated about a node, so there is nothing to spell around: the name
 * it reads is folded first, and a name the folder cannot decide is reported as
 * unreadable rather than allowed through. The tables are string data in arrays
 * and maps, which is not a property access, a call, or an attribute, so this
 * module cannot match itself.
 *
 * @module
 */

import { isNode, memberName, type Node, unwrap } from './ast.ts'
import { approximateString, type Constants, staticString } from './fold.ts'
import { markupOffences } from './markup-gate.ts'

/** Records an offence against a node. */
export type Report = (node: Node, why: string) => void

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

/**
 * Calls that write every property an object literal carries.
 *
 * `Object.assign(el, { style })` reaches the same declaration as `el.style`,
 * and it is already this codebase's idiom for merging onto an object, so the
 * keys of what is being merged are read.
 */
const MERGED_WRITES = new Set(['assign', 'defineProperties'])

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
 * @param unwrapped - the property or member expression, wrappers and all.
 * @param computed - whether the key is an expression rather than a name.
 * @returns the key, or undefined when it is not decidable.
 */
export function keyOf(env: Constants, unwrapped: unknown, computed: boolean): string | undefined {
  const node = unwrap(unwrapped)
  if (!isNode(node)) return undefined
  if (!computed) {
    if (node.type === 'Identifier' && typeof node['name'] === 'string') return node['name']
    if (node.type === 'Literal' && typeof node.value === 'string') return node.value
    return undefined
  }
  return staticString(env, node)
}

/**
 * Judge one node against every rule.
 * @param env - the file's constants.
 * @param node - the node to judge.
 * @param report - records an offence against a node.
 */
export function inspect(env: Constants, node: Node, report: Report): void {
  INSPECTORS.get(node.type)?.(env, node, report)
}

/** Which rule reads which kind of node. */
const INSPECTORS = new Map<string, (env: Constants, node: Node, report: Report) => void>([
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
function inspectMember(env: Constants, node: Node, report: Report): void {
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
function inspectPattern(env: Constants, node: Node, report: Report): void {
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
 * Reject the style attribute written in JSX.
 *
 * The dialects this gate reads include the ones that carry JSX, so the markup
 * form of the attribute has to be refused there as well as in a string.
 * @param _env - the file's constants, which a written attribute name needs none of.
 * @param node - the JSX attribute.
 * @param report - records an offence.
 */
function inspectJsxAttribute(_env: Constants, node: Node, report: Report): void {
  const name = node['name']
  if (!isNode(name)) return
  const written = typeof name['name'] === 'string' ? name['name'] : undefined
  if (written === undefined) return
  const why = STYLE_PROPERTIES.get(written.toLowerCase())
  if (why !== undefined) report(node, why)
}

/**
 * Reject the calls that set an attribute, unless they name one that is not the
 * style attribute, in a form the gate can read.
 * @param env - the file's constants.
 * @param node - the call expression.
 * @param report - records an offence.
 */
function inspectCall(env: Constants, node: Node, report: Report): void {
  const callee = unwrap(node['callee'])
  if (!isNode(callee) || callee.type !== 'MemberExpression') return
  // A method reached through brackets is the same method. Reading only the
  // plainly written form let one pair of brackets step past every rule below.
  const method = memberName(callee) ?? staticString(env, callee['property'])
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
  const host = unwrap(callee['object'])
  if (!isNode(host) || host.type !== 'Identifier' || typeof host['name'] !== 'string') return
  if (!KEYED_WRITE_HOSTS.has(host['name'])) return
  const keyed = KEYED_WRITES.get(method)
  if (keyed !== undefined) {
    checkName(env, node, args[keyed], 'property', report)
    return
  }
  if (MERGED_WRITES.has(method)) {
    for (const argument of args.slice(1)) inspectMergedKeys(env, argument, report)
  }
}

/**
 * Reject an object literal being merged onto something when it names the style
 * declaration.
 * @param env - the file's constants.
 * @param unwrapped - the object being merged, wrappers and all.
 * @param report - records an offence.
 */
function inspectMergedKeys(env: Constants, unwrapped: unknown, report: Report): void {
  const argument = unwrap(unwrapped)
  if (!isNode(argument) || argument.type !== 'ObjectExpression') return
  const properties = argument['properties']
  if (!Array.isArray(properties)) return
  for (const property of properties) {
    if (!isNode(property) || property.type !== 'Property') continue
    const key = keyOf(env, property['key'], property['computed'] === true)
    const why = key === undefined ? undefined : STYLE_PROPERTIES.get(key.toLowerCase())
    if (why !== undefined) report(property, why)
  }
}

/**
 * Require a name the gate can read, and reject it when it is the style one.
 * @param env - the file's constants.
 * @param node - the call, for the line it is reported on.
 * @param argument - the expression that names the attribute or property.
 * @param kind - the word the message uses for what is being named.
 * @param report - records an offence.
 */
function checkName(env: Constants, node: Node, argument: unknown, kind: string, report: Report): void {
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
function inspectMarkupString(env: Constants, node: Node, report: Report): void {
  // Read as far as it can be read: a value interpolated into the markup stands
  // in as a placeholder, so `'<b style="' + colour + '">'` still names the
  // attribute it is about to set. Requiring the whole string to fold let every
  // runtime-assembled fragment through.
  const text = approximateString(env, node)
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
