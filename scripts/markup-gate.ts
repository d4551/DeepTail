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

/**
 * A URL scheme that executes text as code.
 *
 * A `javascript:` URL is an inline script with nowhere to hang a handler ban,
 * so it slips past both the handler rule and the script-body rule while doing
 * exactly what they refuse. `vbscript:` is the same construct, and a
 * `data:text/html` document runs its payload in the page's origin.
 */
const SCRIPTED_URL = /^(?:javascript|vbscript):|data:text\/html/iu

/** Attributes a browser navigates on, so a scripted URL in them runs. */
const URL_ATTRIBUTES = new Set(['href', 'src', 'action', 'formaction', 'xlink:href', 'poster', 'data', 'cite'])

/**
 * An htmx wiring attribute.
 *
 * An `hx-` attribute moves an element's behaviour into the tag: a listener, a
 * fetch and a swap all decided where the markup is written. This product wires
 * interactivity in modules, so no wiring attribute may ship.
 */
const HTMX_ATTRIBUTE = /^hx-/iu

/**
 * A Tailwind arbitrary-value utility in a class list.
 *
 * A token whose bracketed payload follows a hyphen — a width, a colour, a font
 * size spelled inline — is syntax only a utility pipeline reads. No stylesheet
 * this repository ships selects such a token, so it names a spacing or colour
 * decision the design system never sees: the scale and the palette live in
 * tokens.css.
 */
const ARBITRARY_UTILITY = /-[^\s"']*\[[^\]]+\]/u

/**
 * Whether an attribute value navigates to a scripted URL.
 *
 * A browser strips ASCII control characters and leading whitespace before it
 * reads the scheme, so the gate reads the value the same way: a tab inside
 * `java\tscript:` is how the prefix is spelled to get past a plain test.
 * @param value - the attribute's value, entities already decoded by the parser.
 * @returns true when the scheme executes text as code.
 */
function isScriptedUrl(value: string): boolean {
  // Every character a browser skips is at or below the space, and a filter
  // over code points reads the same set without spelling control characters
  // out — the way a regex would — to a reader or a rule about them.
  const stripped = [...value].filter((char) => (char.codePointAt(0) ?? 0) > 32).join('')
  return SCRIPTED_URL.test(stripped)
}

/** A parse5 element, and the children every node may carry. */
type Parsed = DefaultTreeAdapterTypes.Node & {
  childNodes?: readonly DefaultTreeAdapterTypes.Node[]
  content?: DefaultTreeAdapterTypes.DocumentFragment
  attrs?: readonly { readonly name: string; readonly value?: string }[]
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
    for (const attribute of attrs) {
      const name = attribute.name.toLowerCase()
      if (HTMX_ATTRIBUTE.test(attribute.name)) {
        found.push({
          line,
          why: 'an hx attribute wires behaviour into the tag; attach the listener in a module',
        })
      }
      if (name === 'class' && ARBITRARY_UTILITY.test(attribute.value ?? '')) {
        found.push({
          line,
          why: 'a bracketed utility class carries a raw value; read the size or colour from tokens.css',
        })
      }
    }
    for (const attribute of attrs) {
      if (!URL_ATTRIBUTES.has(attribute.name.toLowerCase())) continue
      const url = attribute.value ?? ''
      if (isScriptedUrl(url)) {
        found.push({
          line,
          why: 'a URL that executes text as code is an inline script; navigate by address or call a module',
        })
      }
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
