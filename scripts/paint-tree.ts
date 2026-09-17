/**
 * How one node of a parsed page is read.
 *
 * The paint contract and the rules it is made of read the bytes with the parser
 * a browser uses — parse5 — and every one of them asks the same few questions
 * of the tree it hands back: an element's tag, its attributes, the elements
 * below it, the class tokens it carries, the text it holds and the line it
 * opens on. One notion of each is one place to be wrong, so the readers share
 * this one.
 *
 * @module
 */

import type { DefaultTreeAdapterTypes } from 'parse5'

/** One parsed node, as parse5's own tree builder writes it. */
export type Parsed = DefaultTreeAdapterTypes.Node

/** The attributes one node carries, in the order written. */
export function attrsOf(node: Parsed): readonly { readonly name: string; readonly value: string }[] {
  return 'attrs' in node ? node.attrs.map((attr) => ({ name: attr.name, value: attr.value })) : []
}

/** The children one node carries, in document order. */
function childrenOf(node: Parsed): readonly Parsed[] {
  return 'childNodes' in node ? node.childNodes : []
}

/** The lowercased tag name of one node, when it is an element. */
export function tagOf(node: Parsed): string | undefined {
  return 'tagName' in node ? node.tagName : undefined
}

/**
 * The line one node opens on.
 *
 * The parser is asked for source locations, so a refusal names the line a
 * reader has to open rather than the top of the file. A node built without one
 * — an implied element, the document itself — is reported at the first line.
 * @param node - the node to read.
 * @returns the one-based line number.
 */
export function lineOf(node: Parsed): number {
  return node.sourceCodeLocation?.startLine ?? 1
}

/** The value one node states under one attribute, lowercased. */
export function attributeOf(node: Parsed, name: string): string | undefined {
  return attrsOf(node).find((attr) => attr.name === name)?.value
}

/**
 * The class tokens one element carries.
 *
 * Read as a token list, the way a browser reads one: an element carrying the
 * title class beside another class is still the titled heading, and a reader
 * that compared the whole attribute would refuse a heading that merely carries
 * one class more.
 * @param node - the element to read.
 * @returns its tokens, blanks left out.
 */
export function classesOf(node: Parsed): readonly string[] {
  return (attributeOf(node, 'class') ?? '').split(/\s+/u).filter((token) => token !== '')
}

/** Every element below one node, the node itself excluded. */
export function elementsOf(node: Parsed): Parsed[] {
  const found: Parsed[] = []
  for (const child of childrenOf(node)) {
    if (tagOf(child) !== undefined) found.push(child)
    for (const below of elementsOf(child)) found.push(below)
  }
  return found
}

/** The text one element carries, however deeply it nests it, whitespace collapsed. */
export function textOf(node: Parsed): string {
  const here = 'value' in node ? node.value : ''
  return `${here}${childrenOf(node)
    .map((child) => textOf(child))
    .join('')}`
    .replaceAll(/\s+/gu, ' ')
    .trim()
}
