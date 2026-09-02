/**
 * Reading a node for the name it carries, through whatever renamed it.
 *
 * Rules are written about names — `document`, `Array`, `it` — and a name is
 * exactly what a `const`, an import alias or a pair of brackets can change
 * without changing what runs. The predicates here are what every rule in the
 * ban gate is stated in terms of, so a rule is never written against the
 * spelling at the call site.
 *
 * @module
 */

import type { Aliases } from './aliases.ts'
import { isNode, memberName, type Node, unwrap } from './ast.ts'
import { type Constants, staticString } from './fold.ts'

/**
 * What a file renamed, and what it holds in constants.
 *
 * Rules are written about names — `document`, `Array`, `it` — and a name is
 * exactly what a `const`, an import alias or a pair of brackets can change
 * without changing what runs. Every rule is read through this.
 */
export interface Names {
  /** Local names that stand for another name. */
  readonly aliases: Aliases
  /** Constants bound to strings, for a member reached through brackets. */
  readonly constants: Constants
}

/**
 * The name an identifier carries, read through whatever it was renamed from.
 * @param unwrapped - the node to read, wrappers and all.
 * @param names - what this file renamed.
 * @returns the name, or undefined.
 */
export function identifier(unwrapped: unknown, names: Names): string | undefined {
  const value = unwrap(unwrapped)
  if (!isNode(value) || value.type !== 'Identifier' || typeof value['name'] !== 'string') return undefined
  const written = value['name']
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
  return memberName(node) ?? staticString(names.constants, node['property'])
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
  const callee = unwrap(node['callee'])
  if (identifier(callee, names) === name) return true
  if (!isNode(callee) || callee.type !== 'MemberExpression') return false
  const host = identifier(callee['object'], names)
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
  const callee = unwrap(node['callee'])
  if (!isNode(callee)) return false
  const method = property(callee, names)
  return method !== undefined && methods.includes(method) && identifier(callee['object'], names) === host
}

/**
 * Whether a call reaches a constructor through `Reflect`, which is the same
 * construction spelt as a call.
 * @param node - the node to test.
 * @param constructed - the constructor's name.
 * @param names - what this file renamed.
 * @returns true when it does.
 */
export function reflectsConstruct(node: Node, constructed: string, names: Names): boolean {
  if (!callsMethod(node, 'Reflect', ['construct'], names)) return false
  const args = node['arguments']
  return Array.isArray(args) && identifier(args[0], names) === constructed
}

/**
 * Whether a call writes a named property onto something, through `Reflect.set`,
 * `Object.defineProperty`, or an object merged with `Object.assign`.
 * @param node - the node to test.
 * @param wanted - the property names to reject.
 * @param names - what this file renamed and holds in constants.
 * @returns true when it does.
 */
export function writesProperty(node: Node, wanted: readonly string[], names: Names): boolean {
  const args = node['arguments']
  if (!Array.isArray(args)) return false
  if (
    callsMethod(node, 'Reflect', ['set', 'defineProperty'], names) ||
    callsMethod(node, 'Object', ['defineProperty'], names)
  ) {
    const key = staticString(names.constants, args[1])
    return key !== undefined && wanted.includes(key)
  }
  if (!callsMethod(node, 'Object', ['assign', 'defineProperties'], names)) return false
  return args.slice(1).some((argument) => mergesKey(argument, wanted, names))
}

/**
 * Whether an object literal being merged carries one of the named keys.
 * @param unwrapped - the object being merged, wrappers and all.
 * @param wanted - the property names to reject.
 * @param names - what this file holds in constants.
 * @returns true when it does.
 */
export function mergesKey(unwrapped: unknown, wanted: readonly string[], names: Names): boolean {
  const argument = unwrap(unwrapped)
  if (!isNode(argument) || argument.type !== 'ObjectExpression') return false
  const properties = argument['properties']
  if (!Array.isArray(properties)) return false
  return properties.some((property_) => {
    if (!isNode(property_) || property_.type !== 'Property') return false
    const key =
      property_['computed'] === true
        ? staticString(names.constants, property_['key'])
        : (identifier(property_['key'], names) ?? literalKey(property_['key']))
    return key !== undefined && wanted.includes(key)
  })
}

/** Properties whose assignment replaces an element's markup. */
export const MARKUP_PROPERTIES = ['innerHTML', 'outerHTML']

/** Test runners whose modifiers take a case out of the run. */
const RUNNERS = new Set(['it', 'test', 'describe'])

/** Modifiers that stop a case reporting, or stop its siblings reporting. */
const MODIFIERS = new Set(['skip', 'only', 'todo', 'failing', 'skipIf', 'todoIf'])

/**
 * Whether a node takes a test case out of the run, or takes every other case
 * out of it.
 * @param node - the node to test.
 * @param names - what this file renamed.
 * @returns true when it does.
 */
export function skipsTest(node: Node, names: Names): boolean {
  if (node.type !== 'MemberExpression') return false
  const modifier = property(node, names)
  if (modifier === undefined || !MODIFIERS.has(modifier)) return false
  const host = node['object']
  const name = identifier(host, names) ?? (isNode(host) ? identifier(host['object'], names) : undefined)
  return name !== undefined && RUNNERS.has(name)
}

/**
 * Whether an assignment target writes an element's markup.
 * @param unwrapped - the left-hand side, wrappers and all.
 * @param names - what this file renamed and holds in constants.
 * @returns true when it is innerHTML or outerHTML.
 */
export function writesMarkup(unwrapped: unknown, names: Names): boolean {
  const target = unwrap(unwrapped)
  if (!isNode(target) || target.type !== 'MemberExpression') return false
  const name = property(target, names)
  return name !== undefined && MARKUP_PROPERTIES.includes(name)
}

/**
 * Whether a node names the legacy prototype accessor, as a property or a key.
 * @param node - the node to test.
 * @param names - what this file renamed and holds in constants.
 * @returns true when it does.
 */
export function namesPrototype(node: Node, names: Names): boolean {
  const name = '__proto__'
  if (node.type === 'MemberExpression') return property(node, names) === name || literalKey(node['property']) === name
  if (node.type === 'Property') return identifier(node['key'], names) === name || literalKey(node['key']) === name
  return false
}

/**
 * The string a literal carries, when it is a string.
 * @param value - the node to read.
 * @returns the string, or undefined.
 */
function literalKey(value: unknown): string | undefined {
  return isNode(value) && value.type === 'Literal' && typeof value.value === 'string' ? value.value : undefined
}
