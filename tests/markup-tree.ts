/**
 * The tag tree a fragment parses to.
 *
 * Two suites walked a parsed fragment to say what shape the parser hands a
 * gate, and both wrote the walk out. One walk, so the two cannot come to
 * disagree about what the parser did.
 *
 * @module
 */

import type { DefaultTreeAdapterTypes } from 'parse5'

/** One node of a parsed document, as the default tree adapter builds it. */
export type MarkupNode = DefaultTreeAdapterTypes.Node

/**
 * The children one node holds, when it holds any.
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
