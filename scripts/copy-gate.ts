/**
 * Refuse copy the reader can see that never reached a dictionary.
 *
 * Every sentence this product shows is looked up through `createTranslate`, so
 * both shipped locales carry it and `tests/locales.spec.ts` holds them to the
 * same keys, the same placeholders and no empty entry. Nothing held the other
 * direction: a string written straight onto an element renders in English to
 * every reader, and no dictionary, no suite and no gate would ever mention it.
 * The product is clean today, which is exactly when the rule is cheap to state.
 *
 * The sinks are the ones a reader actually perceives — the text of a node, the
 * name an assistive technology announces, the hint inside an empty field, the
 * tooltip, the alternative for an image. A value folded from a constant counts
 * as written here: the engine shows what the constant holds, not its name.
 *
 * The empty string is not copy. Clearing a strip, or emptying a field, says
 * nothing to translate, and a rule that refused it would push every reset
 * through a dictionary key that reads `""` in both locales.
 *
 * @module
 */

import { type Field, isNode, type Node, unwrap } from './ast.ts'
import { staticString } from './fold.ts'
import { literalKey, type Names, property } from './rule-helpers.ts'

/** Properties whose assignment puts copy in front of a reader. */
const COPY_PROPERTIES: ReadonlySet<string> = new Set([
  'alt',
  'ariaDescription',
  'ariaLabel',
  'ariaPlaceholder',
  'ariaValueText',
  'innerText',
  'placeholder',
  'textContent',
  'title',
])

/** Attributes whose value puts copy in front of a reader. */
const COPY_ATTRIBUTES: ReadonlySet<string> = new Set([
  'alt',
  'aria-description',
  'aria-label',
  'aria-placeholder',
  'aria-valuetext',
  'placeholder',
  'title',
])

/** What this gate says when it finds copy that no dictionary carries. */
export const COPY_REFUSAL =
  'this reaches the reader without a dictionary; look it up with the translate function so both locales carry it'

/**
 * The copy a node writes directly, if it writes any.
 *
 * Read through the same folding the other gates use, so a sentence assembled
 * from constants is the sentence it assembles rather than the names it was
 * spelled with.
 * @param node - the node to read.
 * @param names - what this file renamed and what it holds in constants.
 * @returns the copy, or undefined when the node writes none.
 */
function writtenCopy(node: Node, names: Names): string | undefined {
  if (node.type === 'AssignmentExpression') {
    const target = unwrap(node.left)
    if (!isNode(target)) return undefined
    const written = property(target, names)
    return written !== undefined && COPY_PROPERTIES.has(written) ? staticString(names.constants, node.right) : undefined
  }
  if (node.type !== 'CallExpression') return undefined
  const callee = unwrap(node.callee)
  if (!isNode(callee) || property(callee, names) !== 'setAttribute') return undefined
  // The parser's argument list is a field like any other, so it is narrowed
  // rather than asserted: a call written with no arguments at all reads as an
  // empty list here instead of throwing where the gate walks it.
  const argument: readonly Field[] = Array.isArray(node.arguments) ? node.arguments : []
  const attribute = literalKey(argument[0])
  return attribute !== undefined && COPY_ATTRIBUTES.has(attribute.toLowerCase())
    ? staticString(names.constants, argument[1])
    : undefined
}

/**
 * Whether one node puts copy in front of a reader without a dictionary.
 * @param node - the node to test.
 * @param names - what this file renamed and what it holds in constants.
 * @returns true when the node writes non-empty copy of its own.
 */
export function writesUntranslatedCopy(node: Node, names: Names): boolean {
  const copy = writtenCopy(node, names)
  // The empty string clears a surface rather than saying anything, and a value
  // this reader cannot fold is one the engine decides at run time — which is
  // what a dictionary lookup looks like from here.
  return copy !== undefined && copy.length > 0
}
