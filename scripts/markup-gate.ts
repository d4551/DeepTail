/**
 * What markup is refused, read out by the parser a browser would use.
 *
 * parse5 implements the HTML parsing algorithm, so an attribute is found
 * wherever a browser would find one: in any case, quoted or not, inside a
 * template, and however the surrounding tags are malformed.
 *
 * Beyond the style attribute, what is refused is anything a page would have to
 * ship inline: an event handler, a script body, or a style block. Each of
 * those is a per-page one-off that no module ships and no gate reads once it
 * is inside a tag, so none may exist in the first place.
 *
 * @module
 */

import { type DefaultTreeAdapterTypes, parseFragment } from 'parse5'
import type { Offence } from './offence.ts'

/** The attribute this gate exists to keep out of the product. */
const STYLE_ATTRIBUTE = 'style'

/** An inline event handler attribute: a per-page script no module ships. */
const HANDLER = /^on[a-z]+$/iu

/** A parse5 element, and the children every node may carry. */
type Parsed = DefaultTreeAdapterTypes.Node & {
  childNodes?: readonly DefaultTreeAdapterTypes.Node[]
  content?: DefaultTreeAdapterTypes.DocumentFragment
  attrs?: readonly { readonly name: string }[]
  tagName?: string
  sourceCodeLocation?: { readonly startLine?: number } | null
}

/** One refusal, with its line. */
interface MarkupOffence {
  readonly line: number
  readonly why: string
}

/**
 * Every construct a fragment carries that no page may ship inline.
 * @param text - the markup.
 * @returns one entry per refused construct, with the line it starts on.
 */
export function markupOffences(text: string): MarkupOffence[] {
  const found: MarkupOffence[] = []
  const visit = (node: Parsed): void => {
    const line = node.sourceCodeLocation?.startLine ?? 1
    const attrs = node.attrs ?? []
    const tag = typeof node.tagName === 'string' ? node.tagName.toLowerCase() : undefined
    if (attrs.some((attribute) => attribute.name.toLowerCase() === STYLE_ATTRIBUTE)) {
      found.push({ line, why: 'a style attribute is an inline style; put the rule in a stylesheet and add a class' })
    }
    if (attrs.some((attribute) => HANDLER.test(attribute.name))) {
      found.push({ line, why: 'an inline event handler is a per-page script; attach the listener in a module' })
    }
    if (tag === 'script' && !attrs.some((attribute) => attribute.name.toLowerCase() === 'src')) {
      found.push({ line, why: 'an inline script is a per-page script; ship a module and load it by src' })
    }
    if (tag === 'style') {
      found.push({ line, why: 'an inline stylesheet is a per-page sheet; ship a file and link it' })
    }
    for (const child of node.childNodes ?? []) visit(child as Parsed)
    for (const child of node.content?.childNodes ?? []) visit(child as Parsed)
  }
  visit(parseFragment(text, { sourceCodeLocationInfo: true }) as Parsed)
  return found
}

/**
 * Every refused construct a markup file carries.
 * @param label - the path to report offences under.
 * @param text - the file's contents.
 * @returns one offence per refused construct.
 */
export function scanMarkup(label: string, text: string): Offence[] {
  return markupOffences(text).map((offence) => ({ label, line: offence.line, why: offence.why }))
}
