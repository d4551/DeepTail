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
 * is inside a tag, so none may exist in the first place. The per-attribute
 * refusals — wiring, raw utility values, layout attributes, framework
 * directives and remote loads — live in `markup-attributes.ts`.
 *
 * @module
 */

import { type DefaultTreeAdapterTypes, parse } from 'parse5'
import { type MarkupOffence, recordAttributeOffences, REMOTE_URL } from './markup-attributes.ts'
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
 * Elements the platform retired because they decide alignment or type in the
 * tag itself.
 *
 * The centering element, the type element and the marquee are alignment,
 * type and motion a page ships inline; the sheet is where those decisions
 * live, and a tag that carries one arrives with no class for a gate to read.
 */
const PRESENTATIONAL_ELEMENTS = new Set(['center', 'font', 'marquee'])

/** The one element a document may carry, whose duplication splits the shell a reader lands in. */
const LANDMARK = 'main'

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

/**
 * Whether a meta refresh redirects the page to a remote address.
 *
 * A refresh is navigation the page performs on its own, and a remote target is
 * a load outside the bundle that no manifest declares; a local one is an
 * internal redirect, which is what remains.
 * @param content - the meta content value.
 * @returns true when it redirects to a remote URL.
 */
function isRemoteRefresh(content: string): boolean {
  const target = /url\s*=\s*["']?([^"';]+)/iu.exec(content)
  return target !== null && REMOTE_URL.test((target[1] ?? '').trim())
}

/**
 * The offence a meta element carries, when it redirects the page to a remote
 * address.
 * @param attrs - the element's attributes.
 * @param line - the line the element starts on.
 * @returns the offence, or undefined when the meta is not a remote redirect.
 */
function metaRedirectOffence(
  attrs: readonly { readonly name: string; readonly value?: string }[],
  line: number,
): MarkupOffence | undefined {
  const equiv = attrs.find((attribute) => attribute.name.toLowerCase() === 'http-equiv')
  const content = attrs.find((attribute) => attribute.name.toLowerCase() === 'content')
  if ((equiv?.value ?? '').toLowerCase() !== 'refresh' || !isRemoteRefresh(content?.value ?? '')) return undefined
  return { line, why: 'a meta refresh to a remote address loads outside the bundle; redirect in a module instead' }
}

/** A parse5 element, and the children every node may carry. */
type Parsed = DefaultTreeAdapterTypes.Node & {
  childNodes?: readonly DefaultTreeAdapterTypes.Node[]
  content?: DefaultTreeAdapterTypes.DocumentFragment
  attrs?: readonly { readonly name: string; readonly value?: string }[]
  tagName?: string
  sourceCodeLocation?: { readonly startLine?: number } | null
}

/**
 * Every construct a fragment carries that no page may ship inline.
 *
 * Parsed in document mode, not fragment mode: the fragment algorithm ignores
 * `html`, `head` and `body` start tags, and those are exactly where a theme
 * hook such as daisyUI's `data-theme` is written. A document parse keeps those
 * elements and their attributes in the tree, so the refusal reaches the shape
 * a framework reintroduction would actually take.
 * @param text - the markup.
 * @returns one entry per refused construct, with the line it starts on.
 */
export function markupOffences(text: string): MarkupOffence[] {
  const found: MarkupOffence[] = []
  let landmarks = 0
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
    recordAttributeOffences(attrs, tag, line, found)
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
    if (tag === 'meta') {
      const redirect = metaRedirectOffence(attrs, line)
      if (redirect !== undefined) found.push(redirect)
    }
    if (tag !== undefined && PRESENTATIONAL_ELEMENTS.has(tag)) {
      found.push({ line, why: 'a retired presentational tag is alignment or type in markup; use the stylesheet' })
    }
    if (tag === LANDMARK) {
      landmarks += 1
      if (landmarks > 1) {
        found.push({ line, why: 'a second main splits the shell; a document carries one' })
      }
    }
    for (const child of node.childNodes ?? []) visit(child as Parsed)
    for (const child of node.content?.childNodes ?? []) visit(child as Parsed)
  }
  visit(parse(text, { sourceCodeLocationInfo: true }) as Parsed)
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
