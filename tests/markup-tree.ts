/**
 * The tag tree a fragment parses to.
 *
 * Two suites walked a parsed fragment to say what shape the parser hands a
 * gate, and both wrote the walk out. One walk, so the two cannot come to
 * disagree about what the parser did — and one pin for the fragment whose shape
 * decides what the rules can see, so a parser that changed it fails a named
 * case instead of quietly shifting what a rule reads.
 *
 * @module
 */

import { parseFragment } from 'parse5'
import type { DefaultTreeAdapterTypes } from 'parse5'

/** One node of a parsed document, as parse5's own tree builder writes it. */
export type MarkupNode = DefaultTreeAdapterTypes.Node

/**
 * The children one node carries.
 * @param node - the node to read.
 * @returns its children, in document order.
 */
function childrenOf(node: MarkupNode): readonly MarkupNode[] {
  return 'childNodes' in node ? node.childNodes : []
}

/**
 * Every tag below one node, indented by how deep it sits.
 * @param node - the node to walk.
 * @param depth - how deep the node itself sits.
 * @returns one line per tag, in document order.
 */
export function tagTree(node: MarkupNode, depth = 0): string[] {
  const here = 'tagName' in node ? [`${'  '.repeat(depth)}${node.tagName}`] : []
  return [...here, ...childrenOf(node).flatMap((child) => tagTree(child, depth + 1))]
}

/**
 * The tag tree one fragment parses to, through the parser a browser would use.
 * @param html - the fragment.
 * @returns one line per tag, in document order.
 */
export function fragmentTree(html: string): string[] {
  return tagTree(parseFragment(html))
}

/**
 * The fragment whose parsed shape the checks read a tree for: an activation
 * target opened inside one of its own kind.
 */
export const NESTED_ACTIVATION_TARGET = '<button>a<button>b</button></button>'

/**
 * The tree that fragment parses to, and the whole point of pinning it.
 *
 * The HTML parsing algorithm closes an open activation target the moment a
 * second start tag of its own kind arrives, so the nesting never reaches a rule
 * as one: it arrives as two siblings at the same depth. The fragment node
 * itself sits at depth zero, so its children are indented once — two `button`
 * lines at one depth, not a `button` under a `button`. That is why the
 * `nested-interactive` check says nothing about this shape, and a rule that is
 * silent for the parser's sake is read as that rather than as a rule that
 * stopped working.
 */
export const NESTED_ACTIVATION_TARGET_TREE: readonly string[] = ['  button', '  button']
