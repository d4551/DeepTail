/**
 * How a rule reads a name, whatever the file renamed or folded it into.
 *
 * Rules are written about names — `document`, `Array`, `it` — and a name is
 * exactly what a `const`, an import alias or a pair of brackets can change
 * without changing what runs. Every rule reads names through the helpers here,
 * so a rename changes nothing about what is judged.
 *
 * @module
 */

import type { Aliases } from './aliases.ts'
import { type Field, isNode, memberName, type Node, unwrap } from './ast.ts'
import { type Constants, staticString } from './fold.ts'

/**
 * What a file renamed, and what it holds in constants.
 *
 * Rules are written about names and a name is exactly what a `const`, an
 * import alias or a pair of brackets can change without changing what runs.
 * Every rule is read through this.
 */
export interface Names {
  /** Local names that stand for another name. */
  readonly aliases: Aliases
  /** Constants bound to strings, for a member reached through brackets. */
  readonly constants: Constants
}

/** A rule stated about a node, rather than about the text of a line. */
export interface Rule {
  /** Whether this node is the banned construct. */
  readonly holds: (node: Node, names: Names) => boolean
  /** What is wrong, and what to do instead. */
  readonly why: string
}

/**
 * The name an identifier carries, read through whatever it was renamed from.
 * @param holder - the node to read, parentheses and all.
 * @param names - what this file renamed.
 * @returns the name, or undefined.
 */
export function identifier(holder: Field | undefined, names: Names): string | undefined {
  const value = unwrap(holder)
  if (!isNode(value) || value.type !== 'Identifier' || typeof value.name !== 'string') return undefined
  const written = value.name
  return names.aliases.get(written) ?? written
}

/**
 * The property a member expression names, however it is reached.
 * @param node - the member expression.
 * @param names - what this file renamed and what it holds in constants.
 * @returns the property name, or undefined.
 */
export function property(node: Node, names: Names): string | undefined {
  if (node.type !== 'MemberExpression') return undefined
  return memberName(node) ?? staticString(names.constants, node.property)
}

/**
 * Whether a call goes through a global of the given name, reached directly or
 * through the global object.
 * @param node - the node to test.
 * @param name - the global's name.
 * @param names - what this file renamed.
 * @returns true when the node is that call.
 */
export function callsGlobal(node: Node, name: string, names: Names): boolean {
  if (node.type !== 'CallExpression') return false
  const callee = unwrap(node.callee)
  if (identifier(callee, names) === name) return true
  if (!isNode(callee) || callee.type !== 'MemberExpression') return false
  const host = identifier(callee.object, names)
  return (host === 'globalThis' || host === 'window' || host === 'self') && property(callee, names) === name
}

/**
 * Whether a call goes through a named method on a named object.
 * @param node - the node to test.
 * @param host - the object's name.
 * @param methods - the method names to reject.
 * @param names - what this file renamed.
 * @returns true when the node is one of those calls.
 */
export function callsMethod(node: Node, host: string, methods: readonly string[], names: Names): boolean {
  if (node.type !== 'CallExpression') return false
  const callee = unwrap(node.callee)
  if (!isNode(callee)) return false
  const method = property(callee, names)
  return method !== undefined && methods.includes(method) && identifier(callee.object, names) === host
}

/**
 * The string a literal carries, when it is a string.
 * @param value - the node to read.
 * @returns the string, or undefined.
 */
export function literalKey(value: Field | undefined): string | undefined {
  return isNode(value) && value.type === 'Literal' && typeof value.value === 'string' ? value.value : undefined
}
