/**
 * The core ban rules: how a node is recognised as an idiom the project has
 * moved past, read through whatever the file renamed.
 *
 * The framework-specific bans — the React 19 removals and the Tauri v1 paths —
 * live in `react-tauri-rules.ts`; both sets read names through the same
 * helpers in `rule-helpers.ts`.
 *
 * @module
 */

import { type Field, isNode, type Node, unwrap } from './ast.ts'
import { staticString } from './fold.ts'
import { LEGACY_RULES } from './react-tauri-rules.ts'
import { callsGlobal, callsMethod, identifier, literalKey, type Names, property, type Rule } from './rule-helpers.ts'

/** Properties whose assignment replaces an element's markup. */
const MARKUP_PROPERTIES = ['innerHTML', 'outerHTML']

/** Test runners whose modifiers take a case out of the run. */
const RUNNERS = new Set(['it', 'test', 'describe'])

/** Modifiers that stop a case reporting, or stop its siblings reporting. */
const MODIFIERS = new Set(['skip', 'only', 'todo', 'failing', 'skipIf', 'todoIf'])

/** Idioms the project has moved past, stated about the tree. */
export const BANNED: readonly Rule[] = [
  { holds: (node) => node.type === 'VariableDeclaration' && node.kind === 'var', why: 'use const or let' },
  { holds: (node, names) => callsGlobal(node, 'require', names), why: 'use ES module imports' },
  {
    holds: (node, names) => callsGlobal(node, 'eval', names),
    why: 'eval executes text as code; call the function directly',
  },
  { holds: (node) => node.type === 'WithStatement', why: 'with is forbidden in strict mode; name the object' },
  {
    holds: (node, names) =>
      (node.type === 'AssignmentExpression' && writesMarkup(node.left, names)) ||
      writesProperty(node, MARKUP_PROPERTIES, names),
    why: 'use textContent, or insertAdjacentHTML with markup this repository does not author',
  },
  {
    holds: (node, names) => callsMethod(node, 'document', ['write', 'writeln'], names),
    why: 'document.write is removed from modern engines',
  },
  {
    holds: (node, names) => node.type === 'MemberExpression' && property(node, names) === 'substr',
    why: 'String.prototype.substr is deprecated; use slice',
  },
  {
    holds: (node, names) =>
      (node.type === 'NewExpression' && identifier(node.callee, names) === 'Array') ||
      reflectsConstruct(node, 'Array', names),
    why: 'use an array literal or Array.from',
  },
  {
    holds: (node, names) => callsGlobal(node, 'escape', names) || callsGlobal(node, 'unescape', names),
    why: 'the global escape and unescape are deprecated; use encodeURIComponent, or CSS.escape for a selector',
  },
  {
    holds: (node, names) => runsTextAsCode(node, names),
    why: 'a timer called with text runs the text as code; pass a function',
  },
  { holds: (node, names) => namesPrototype(node, names), why: 'use Object.getPrototypeOf or Object.create' },
  { holds: (node) => node.type === 'TSAnyKeyword', why: 'any defeats the type system; name the shape' },
  {
    holds: (node, names) => skipsTest(node, names),
    why: 'a test that is skipped, focused or expected to fail is a test that does not report',
  },
  {
    holds: (node) => node.type === 'TSNonNullExpression',
    why: 'a non-null assertion overrides the checker; narrow the value or handle the absent case',
  },
  {
    holds: (node) => node.type === 'TSImportEqualsDeclaration',
    why: 'import-equals is TypeScript 6 syntax; use a default import or `import type`',
  },
  {
    holds: (node) =>
      node.type === 'TSModuleDeclaration' &&
      isNode(node.id) &&
      node.id.type === 'Identifier' &&
      node.id.name !== 'global',
    why: 'a namespace is a TypeScript 6 module system; use ES module exports',
  },
  {
    holds: (node, names) => expandoPrototype(node, names),
    why: 'the constructor-function expando pattern was removed in TypeScript 7; use a class',
  },
  ...LEGACY_RULES,
]

/**
 * Whether a timer call receives text to run rather than a function.
 *
 * `setTimeout("code()")` and `setInterval("code()")` evaluate their first
 * argument as script, which is `eval` with a delay and slips a rule written
 * only about the global itself. The first argument is read through the same
 * folding as every other string, so a concatenated or interpolated body is
 * caught with the literal one.
 * @param node - the node to test.
 * @param names - what this file renamed and holds in constants.
 * @returns true when a timer is handed text to execute.
 */
function runsTextAsCode(node: Node, names: Names): boolean {
  const timer = callsGlobal(node, 'setTimeout', names) || callsGlobal(node, 'setInterval', names)
  if (!timer) return false
  const args = node.arguments
  if (!Array.isArray(args)) return false
  return staticString(names.constants, args[0]) !== undefined
}

/**
 * Whether a call reaches a constructor through `Reflect`, which is the same
 * construction spelt as a call.
 * @param node - the node to test.
 * @param target - the constructor's name.
 * @param names - what this file renamed.
 * @returns true when it does.
 */
function reflectsConstruct(node: Node, target: string, names: Names): boolean {
  if (!callsMethod(node, 'Reflect', ['construct'], names)) return false
  const args = node.arguments
  return Array.isArray(args) && identifier(args[0], names) === target
}

/**
 * Whether a call writes a named property onto something, through `Reflect.set`,
 * `Object.defineProperty`, or an object merged with `Object.assign`.
 * @param node - the node to test.
 * @param wanted - the property names to reject.
 * @param names - what this file renamed and holds in constants.
 * @returns true when it does.
 */
function writesProperty(node: Node, wanted: readonly string[], names: Names): boolean {
  const args = node.arguments
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
 * @param merged - the object being merged, parentheses and all.
 * @param wanted - the property names to reject.
 * @param names - what this file holds in constants.
 * @returns true when it does.
 */
function mergesKey(merged: Field | undefined, wanted: readonly string[], names: Names): boolean {
  const argument = unwrap(merged)
  if (!isNode(argument) || argument.type !== 'ObjectExpression') return false
  const properties = argument.properties
  if (!Array.isArray(properties)) return false
  return properties.some((property_) => {
    if (!isNode(property_) || property_.type !== 'Property') return false
    const key =
      property_.computed === true
        ? staticString(names.constants, property_.key)
        : (identifier(property_.key, names) ?? literalKey(property_.key))
    return key !== undefined && wanted.includes(key)
  })
}

/**
 * Whether a node takes a test case out of the run, or takes every other case
 * out of it.
 * @param node - the node to test.
 * @param names - what this file renamed.
 * @returns true when it does.
 */
function skipsTest(node: Node, names: Names): boolean {
  if (node.type !== 'MemberExpression') return false
  const modifier = property(node, names)
  if (modifier === undefined || !MODIFIERS.has(modifier)) return false
  const host = node.object
  const name = identifier(host, names) ?? (isNode(host) ? identifier(host.object, names) : undefined)
  return name !== undefined && RUNNERS.has(name)
}

/**
 * Whether an assignment target writes an element's markup.
 * @param target - the left-hand side, parentheses and all.
 * @param names - what this file renamed and holds in constants.
 * @returns true when it is innerHTML or outerHTML.
 */
function writesMarkup(target: Field | undefined, names: Names): boolean {
  const assigned = unwrap(target)
  if (!isNode(assigned) || assigned.type !== 'MemberExpression') return false
  const name = property(assigned, names)
  return name !== undefined && MARKUP_PROPERTIES.includes(name)
}

/**
 * Whether an assignment writes a member onto something's prototype, the
 * constructor-function expando pattern TypeScript 7 stopped checking.
 *
 * `Chart.prototype.draw = function () {}` is how a class was spelled before
 * classes: the checker no longer follows it, so every assignment through
 * `.prototype` is refused and the shape moves into a `class` declaration.
 * @param node - the node to test.
 * @param names - what this file renamed and holds in constants.
 * @returns true when it is such an assignment.
 */
function expandoPrototype(node: Node, names: Names): boolean {
  if (node.type !== 'AssignmentExpression') return false
  const assigned = unwrap(node.left)
  if (!isNode(assigned) || assigned.type !== 'MemberExpression') return false
  if (property(assigned, names) === undefined) return false
  const carrier = unwrap(assigned.object)
  return isNode(carrier) && carrier.type === 'MemberExpression' && property(carrier, names) === 'prototype'
}

/**
 * Whether a node names the legacy prototype accessor, as a property or a key.
 * @param node - the node to test.
 * @param names - what this file renamed and holds in constants.
 * @returns true when it does.
 */
function namesPrototype(node: Node, names: Names): boolean {
  const name = '__proto__'
  if (node.type === 'MemberExpression') return property(node, names) === name || literalKey(node.property) === name
  if (node.type === 'Property') return identifier(node.key, names) === name || literalKey(node.key) === name
  return false
}
