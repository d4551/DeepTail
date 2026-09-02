/**
 * Reading a string as far as it can be read.
 *
 * `staticString` answers all or nothing, so one interpolation hides a whole
 * string from every rule. Markup does not work that way: half-written in the
 * source and half-supplied at runtime, it still names its attributes. This
 * reads what it can and stands in for what it cannot.
 *
 * @module
 */

import { isNode, type Node, unwrap } from './ast.ts'
import { type Constants, staticString } from './fold.ts'

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
 * that way — `'<b style="' + colour + '">'` names the attribute regardless of
 * what the colour turns out to be.
 * @param env - the file's constants.
 * @param unwrapped - the expression to read, wrappers and all.
 * @returns the approximation, or undefined when the node produces no string.
 */
export function approximateString(env: Constants, unwrapped: unknown): string | undefined {
  const exact = staticString(env, unwrapped)
  if (exact !== undefined) return exact
  const node = unwrap(unwrapped)
  if (!isNode(node)) return undefined
  switch (node.type) {
    case 'TemplateLiteral':
      return approximateTemplate(env, node)
    case 'BinaryExpression':
      return node.operator === '+'
        ? `${approximateString(env, node.left) ?? UNREADABLE}${approximateString(env, node.right) ?? UNREADABLE}`
        : undefined
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
    case 'TSNonNullExpression':
      return approximateString(env, node.expression)
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
    const cooked = (quasi as { value?: { cooked?: unknown } }).value?.cooked
    if (typeof cooked !== 'string') return undefined
    text += cooked
    if (index < expressions.length) text += approximateString(env, expressions[index]) ?? UNREADABLE
  }
  return text
}
