/**
 * What a string-producing expression always evaluates to.
 *
 * Constant folding is what closes the assembled-name routes. A name split with
 * `+`, built in a template, spelt from character codes, case-shifted, joined
 * out of an array or simply held in a well-named constant is the same name, and
 * a gate that cannot fold them is a gate that can be spelt around.
 *
 * @module
 */

import { isNode, memberName, type Node, unwrap, walk } from './ast.ts'

/**
 * The constants a file declares, so a name held in one is still a name.
 *
 * A binding whose value differs between declarations is recorded as undecided
 * rather than as either value, which reports rather than excuses it.
 */
export type Constants = ReadonlyMap<string, string | null>

/**
 * Every `const` in a file that is bound to a string this gate can fold.
 * @param program - the parsed body.
 * @returns the bindings, with contested names marked undecided.
 */
export function constants(program: unknown): Constants {
  const found = new Map<string, string | null>()
  const empty: Constants = new Map()
  walk(program, (node) => {
    if (node.type !== 'VariableDeclaration' || node.kind !== 'const') return
    const declarations = node.declarations
    if (!Array.isArray(declarations)) return
    for (const declaration of declarations) {
      if (!isNode(declaration)) continue
      const id = unwrap(declaration.id)
      if (!isNode(id) || id.type !== 'Identifier' || typeof id.name !== 'string') continue
      const value = staticString(empty, declaration.init)
      if (value === undefined) continue
      const seen = found.get(id.name)
      found.set(id.name, seen === undefined || seen === value ? value : null)
    }
  })
  return found
}

/**
 * The string an expression always evaluates to, when there is one.
 *
 * Constant folding is what closes the assembled-name routes: a name split with
 * `+`, built in a template, spelt from character codes, case-shifted or simply
 * held in a well-named constant is the same name, and a gate that cannot fold
 * them is a gate that can be spelt around.
 * @param env - the file's constants.
 * @param unwrapped - the expression to fold, wrappers and all.
 * @returns the string, or undefined when it is not decidable here.
 */
export function staticString(env: Constants, unwrapped: unknown): string | undefined {
  const node = unwrap(unwrapped)
  if (!isNode(node)) return undefined
  switch (node.type) {
    case 'Literal':
      return typeof node.value === 'string' ? node.value : undefined
    case 'Identifier':
      return typeof node.name === 'string' ? (env.get(node.name) ?? undefined) : undefined
    case 'TemplateLiteral':
      return foldTemplate(env, node)
    case 'BinaryExpression':
      return foldConcatenation(env, node)
    case 'CallExpression':
      return foldCall(env, node)
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
    case 'TSNonNullExpression':
      return staticString(env, node.expression)
    default:
      return undefined
  }
}

/**
 * Fold a template whose every interpolation folds.
 * @param env - the file's constants.
 * @param node - the template literal.
 * @returns the string, or undefined.
 */
function foldTemplate(env: Constants, node: Node): string | undefined {
  const quasis = node.quasis
  const expressions = node.expressions
  if (!Array.isArray(quasis) || !Array.isArray(expressions)) return undefined
  let text = ''
  for (const [index, quasi] of quasis.entries()) {
    const cooked = (quasi as { value?: { cooked?: unknown } }).value?.cooked
    if (typeof cooked !== 'string') return undefined
    text += cooked
    if (index >= expressions.length) continue
    const part = staticString(env, expressions[index])
    if (part === undefined) return undefined
    text += part
  }
  return text
}

/**
 * Fold `'a' + 'b'`, however deeply it nests.
 * @param env - the file's constants.
 * @param node - the binary expression.
 * @returns the string, or undefined.
 */
function foldConcatenation(env: Constants, node: Node): string | undefined {
  if (node.operator !== '+') return undefined
  const left = staticString(env, node.left)
  const right = staticString(env, node.right)
  return left === undefined || right === undefined ? undefined : left + right
}

/**
 * Fold the calls that assemble a name: character codes, case shifts, joins and
 * concatenation.
 * @param env - the file's constants.
 * @param node - the call expression.
 * @returns the string, or undefined.
 */
function foldCall(env: Constants, node: Node): string | undefined {
  const callee = node.callee
  const args = node.arguments
  if (!isNode(callee) || callee.type !== 'MemberExpression' || !Array.isArray(args)) return undefined
  const method = memberName(callee)
  if (method === 'fromCharCode' || method === 'fromCodePoint') return foldCharacters(method, args)
  const receiver = callee.object
  if (method === 'toLowerCase' || method === 'toUpperCase') {
    const text = staticString(env, receiver)
    return text === undefined ? undefined : method === 'toLowerCase' ? text.toLowerCase() : text.toUpperCase()
  }
  if (method === 'concat') return foldParts(env, [receiver, ...args])
  if (method === 'join') return foldJoin(env, receiver, args)
  return undefined
}

/**
 * Fold `String.fromCharCode(…)` and its code-point sibling.
 * @param method - which of the two was called.
 * @param args - the character codes.
 * @returns the string, or undefined.
 */
function foldCharacters(method: string, args: readonly unknown[]): string | undefined {
  const codes: number[] = []
  for (const argument of args) {
    if (!isNode(argument) || argument.type !== 'Literal' || typeof argument.value !== 'number') return undefined
    codes.push(argument.value)
  }
  // `fromCharCode` truncates each argument to sixteen bits; the mask reproduces
  // that without calling the deprecated form.
  const units = method === 'fromCharCode' ? codes.map((code) => code & 0xff_ff) : codes
  return String.fromCodePoint(...units)
}

/**
 * Fold a run of expressions into one string, when every one of them folds.
 * @param env - the file's constants.
 * @param parts - the expressions.
 * @returns the string, or undefined.
 */
function foldParts(env: Constants, parts: readonly unknown[]): string | undefined {
  let text = ''
  for (const part of parts) {
    const folded = staticString(env, part)
    if (folded === undefined) return undefined
    text += folded
  }
  return text
}

/**
 * Fold `['s','t'].join('')` and its separator.
 * @param env - the file's constants.
 * @param receiver - the array being joined.
 * @param args - the separator, when given.
 * @returns the string, or undefined.
 */
function foldJoin(env: Constants, receiver: unknown, args: readonly unknown[]): string | undefined {
  if (!isNode(receiver) || receiver.type !== 'ArrayExpression') return undefined
  const elements = receiver.elements
  if (!Array.isArray(elements)) return undefined
  const separator = args.length === 0 ? '' : staticString(env, args[0])
  if (separator === undefined) return undefined
  const parts: string[] = []
  for (const element of elements) {
    const folded = staticString(env, element)
    if (folded === undefined) return undefined
    parts.push(folded)
  }
  return parts.join(separator)
}

/**
 * Names that stand for another name.
 *
 * `const d = document` and `import { it as check }` both rename something the
 * rules are written about. A rule that matches on the written name alone is a
 * rule one `const` defeats.
 */
export type Aliases = ReadonlyMap<string, string>

/**
 * Every local name in a file that stands for another name.
 * @param program - the parsed body.
 * @returns local name to the name it stands for, resolved through chains.
 */
export function aliases(program: unknown): Aliases {
  const direct = new Map<string, string>()
  walk(program, (node) => {
    if (node.type === 'VariableDeclaration' && node.kind === 'const') recordConstAliases(node, direct)
    if (node.type === 'ImportSpecifier') recordImportAlias(node, direct)
  })
  const resolved = new Map<string, string>()
  for (const [local] of direct) {
    let target = local
    // A chain of renames is still one name; the cap stops a cycle spinning.
    for (let step = 0; step < 8; step += 1) {
      const next = direct.get(target)
      if (next === undefined || next === target) break
      target = next
    }
    if (target !== local) resolved.set(local, target)
  }
  return resolved
}

/**
 * Record `const local = other`.
 * @param node - the declaration.
 * @param into - the map to add to.
 */
function recordConstAliases(node: Node, into: Map<string, string>): void {
  const declarations = node.declarations
  if (!Array.isArray(declarations)) return
  for (const declaration of declarations) {
    if (!isNode(declaration)) continue
    const id = unwrap(declaration.id)
    const init = unwrap(declaration.init)
    if (!isNode(id) || id.type !== 'Identifier' || !isNode(init) || init.type !== 'Identifier') continue
    if (typeof id.name !== 'string' || typeof init.name !== 'string') continue
    into.set(id.name, init.name)
  }
}

/**
 * Record `import { imported as local }`.
 * @param node - the specifier.
 * @param into - the map to add to.
 */
function recordImportAlias(node: Node, into: Map<string, string>): void {
  const imported = node.imported
  const local = node.local
  if (!isNode(imported) || !isNode(local)) return
  const from = imported.type === 'Identifier' ? imported.name : imported.value
  if (typeof from !== 'string' || typeof local.name !== 'string' || local.name === from) return
  into.set(local.name, from)
}
