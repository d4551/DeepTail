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

import { type Field, fieldOf, isNode, memberName, type Node, unwrap, walk } from './ast.ts'

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
export function constants(program: readonly Node[]): Constants {
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
 * @param node - the expression to fold, parentheses and assertions included.
 * @returns the string, or undefined when it is not decidable here.
 */
export function staticString(env: Constants, node: Field | undefined): string | undefined {
  const folded = unwrap(node)
  if (!isNode(folded)) return undefined
  switch (folded.type) {
    case 'Literal':
      return typeof folded.value === 'string' ? folded.value : undefined
    case 'Identifier':
      return typeof folded.name === 'string' ? (env.get(folded.name) ?? undefined) : undefined
    case 'TemplateLiteral':
      return foldTemplate(env, folded)
    case 'BinaryExpression':
      return foldConcatenation(env, folded)
    case 'CallExpression':
      return foldCall(env, folded)
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
    case 'TSNonNullExpression':
      return staticString(env, folded.expression)
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
    const cooked = fieldOf(fieldOf(quasi, 'value'), 'cooked')
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
function foldCharacters(method: string, args: readonly Field[]): string | undefined {
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
function foldParts(env: Constants, parts: readonly Field[]): string | undefined {
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
function foldJoin(env: Constants, receiver: Field | undefined, args: readonly Field[]): string | undefined {
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
 * The placeholder an unreadable part of a string leaves behind.
 *
 * A private-use code point, so it can never collide with anything the source
 * actually contains, and one character wide so the shape of what surrounds it
 * survives — which is the whole point: markup half-written in the source and
 * half-supplied at runtime is still markup, and its attributes are still
 * readable even when their values are not.
 */
export const UNREADABLE = '\u{F8FF}'

/**
 * The nearest string an expression can be read as, with everything undecidable
 * standing in as {@link UNREADABLE}.
 *
 * This is what `staticString` cannot do: it answers all-or-nothing, so a single
 * interpolation hides the whole string from every rule. Markup does not work
 * that way — a tag half-written in the source names its styling attribute
 * regardless of what the colour interpolation turns out to be.
 * @param env - the file's constants.
 * @param node - the expression to read, parentheses and assertions included.
 * @returns the approximation, or undefined when the node produces no string.
 */
export function approximateString(env: Constants, node: Field | undefined): string | undefined {
  const exact = staticString(env, node)
  if (exact !== undefined) return exact
  const read = unwrap(node)
  if (!isNode(read)) return undefined
  switch (read.type) {
    case 'TemplateLiteral':
      return approximateTemplate(env, read)
    case 'BinaryExpression':
      return read.operator === '+'
        ? `${approximateString(env, read.left) ?? UNREADABLE}${approximateString(env, read.right) ?? UNREADABLE}`
        : undefined
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
    case 'TSNonNullExpression':
      return approximateString(env, read.expression)
    default:
      return undefined
  }
}

/**
 * Read a template, standing in for each interpolation that cannot be folded.
 * @param env - the file's constants.
 * @param node - the template literal.
 * @returns the approximation, or undefined when its parts are not readable.
 */
function approximateTemplate(env: Constants, node: Node): string | undefined {
  const quasis = node.quasis
  const expressions = node.expressions
  if (!Array.isArray(quasis) || !Array.isArray(expressions)) return undefined
  let text = ''
  for (const [index, quasi] of quasis.entries()) {
    const cooked = fieldOf(fieldOf(quasi, 'value'), 'cooked')
    if (typeof cooked !== 'string') return undefined
    text += cooked
    if (index < expressions.length) text += approximateString(env, expressions[index]) ?? UNREADABLE
  }
  return text
}
