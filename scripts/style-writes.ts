/**
 * The calls that write a styling attribute or property onto something, and the
 * names those calls carry.
 *
 * @module
 */

import { type Field, isNode, memberName, type Node, unwrap } from './ast.ts'
import { type Constants, staticString } from './fold.ts'

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
 * @param holder - the property or member expression, parentheses and all.
 * @param computed - whether the key is an expression rather than a name.
 * @returns the key, or undefined when it is not decidable.
 */
export function keyOf(env: Constants, holder: Field | undefined, computed: boolean): string | undefined {
  const node = unwrap(holder)
  if (!isNode(node)) return undefined
  if (!computed) {
    if (node.type === 'Identifier' && typeof node.name === 'string') return node.name
    if (node.type === 'Literal' && typeof node.value === 'string') return node.value
    return undefined
  }
  return staticString(env, node)
}

/**
 * Reject the calls that set an attribute, unless they name one that is not the
 * style attribute, in a form the gate can read.
 * @param env - the file's constants.
 * @param node - the call expression.
 * @param report - records an offence.
 */
export function inspectCall(env: Constants, node: Node, report: (node: Node, why: string) => void): void {
  const callee = unwrap(node.callee)
  if (!isNode(callee) || callee.type !== 'MemberExpression') return
  // A method reached through brackets is the same method. Reading only the
  // plainly written form let one pair of brackets step past every rule below.
  const method = memberName(callee) ?? staticString(env, callee.property)
  if (method === undefined) return
  const args = Array.isArray(node.arguments) ? node.arguments : []
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
  const host = unwrap(callee.object)
  if (!isNode(host) || host.type !== 'Identifier' || typeof host.name !== 'string') return
  if (!KEYED_WRITE_HOSTS.has(host.name)) return
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
 * @param merged - the object being merged, parentheses and all.
 * @param report - records an offence.
 */
function inspectMergedKeys(env: Constants, merged: Field | undefined, report: (node: Node, why: string) => void): void {
  const argument = unwrap(merged)
  if (!isNode(argument) || argument.type !== 'ObjectExpression') return
  const properties = argument.properties
  if (!Array.isArray(properties)) return
  for (const property of properties) {
    if (!isNode(property) || property.type !== 'Property') continue
    const key = keyOf(env, property.key, property.computed === true)
    const why = key === undefined ? undefined : STYLE_PROPERTIES.get(key.toLowerCase())
    if (why !== undefined) report(property, why)
  }
}

/** Properties that reach an element's own style declaration, keyed in lower case. */
export const STYLE_PROPERTIES = new Map<string, string>([
  ['style', 'an element style declaration is an inline style; put the rule in a stylesheet and add a class'],
  ['csstext', 'writing cssText replaces an inline style block; put the rule in a stylesheet and add a class'],
  ['attributestylemap', 'the typed style map is the style attribute; put the rule in a stylesheet and add a class'],
])

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
  argument: Field | undefined,
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
