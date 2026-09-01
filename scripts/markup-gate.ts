/**
 * The style attribute, read out of markup by the parser a browser would use.
 *
 * parse5 implements the HTML parsing algorithm, so an attribute is found
 * wherever a browser would find one: in any case, quoted or not, inside a
 * template, and however the surrounding tags are malformed.
 *
 * @module
 */

import { type DefaultTreeAdapterTypes, parseFragment } from 'parse5'
import type { Offence } from './style-gate.ts'

/** The attribute this gate exists to keep out of the product. */
const STYLE_ATTRIBUTE = 'style'

/** A parse5 element, and the children every node may carry. */
type Parsed = DefaultTreeAdapterTypes.Node & {
  childNodes?: readonly DefaultTreeAdapterTypes.Node[]
  content?: DefaultTreeAdapterTypes.DocumentFragment
  attrs?: readonly { readonly name: string }[]
  sourceCodeLocation?: { readonly startLine?: number } | null
}

/**
 * Every element in a fragment that carries a style attribute.
 * @param text - the markup.
 * @returns the line each offending element starts on.
 */
export function markupOffences(text: string): number[] {
  const lines: number[] = []
  const visit = (node: Parsed): void => {
    if (node.attrs?.some((attribute) => attribute.name.toLowerCase() === STYLE_ATTRIBUTE) === true) {
      lines.push(node.sourceCodeLocation?.startLine ?? 1)
    }
    for (const child of node.childNodes ?? []) visit(child as Parsed)
    for (const child of node.content?.childNodes ?? []) visit(child as Parsed)
  }
  visit(parseFragment(text, { sourceCodeLocationInfo: true }) as Parsed)
  return lines
}

/**
 * Every inline style a markup file carries.
 * @param label - the path to report offences under.
 * @param text - the file's contents.
 * @returns one offence per element carrying a style attribute.
 */
export function scanMarkup(label: string, text: string): Offence[] {
  return markupOffences(text).map((line) => ({
    label,
    line,
    why: 'a style attribute is an inline style; put the rule in a stylesheet and add a class',
  }))
}
