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
 * The attributes an element fetches a resource from.
 *
 * A URL in one of these loads an asset — a script, a sheet, an image, a frame —
 * and a remote one is a dependency no manifest declares and no lock resolves:
 * it loads over the network on a page this product ships, unversioned and
 * unaudited. Every asset belongs to the bundle, so a remote load is refused
 * and a local one (a root-relative path) is what remains.
 */
const RESOURCE_URLS = new Map<string, readonly string[]>([
  ['script', ['src']],
  ['link', ['href']],
  ['img', ['src', 'srcset']],
  ['video', ['src', 'poster']],
  ['audio', ['src']],
  ['source', ['src', 'srcset']],
  ['iframe', ['src']],
  ['embed', ['src']],
  ['object', ['data']],
  ['track', ['src']],
  ['input', ['src']],
])

/** A URL that loads from outside the shipped bundle, absolute or protocol-relative. */
const REMOTE_URL = /^(?:https?:)?\/\//iu

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
 * Elements the platform retired because they decide alignment or type in the
 * tag itself.
 *
 * The centering element, the type element and the marquee are alignment,
 * type and motion a page ships inline; the sheet is where those decisions
 * live, and a tag that carries one arrives with no class for a gate to read.
 */
const PRESENTATIONAL_ELEMENTS = new Set(['center', 'font', 'marquee'])

/**
 * Attributes that move a box or its content from the tag.
 *
 * `align`, `valign` and their spacing kin are layout written where markup
 * goes, so the alignment never reaches the sheet the grid rules read.
 */
const ALIGNMENT_ATTRIBUTES = new Set(['align', 'valign', 'hspace', 'vspace', 'cellpadding', 'cellspacing'])

/**
 * Attributes that decide size or type in the tag.
 *
 * `width` and `height` stay allowed on `img`, where they are the aspect-ratio
 * hint that stops a layout shift before the sheet applies — on every other
 * element they are sizing decided in markup. The colour and border attributes
 * are palette decisions in the tag; `size`, `face`, `clear`, `nowrap` and the
 * table chrome are type and layout that belong to a class.
 */
const PRESENTATIONAL_ATTRIBUTES = new Set([
  'width',
  'height',
  'border',
  'bgcolor',
  'background',
  'color',
  'face',
  'size',
  'clear',
  'nowrap',
  'bordercolor',
  'rules',
  'frame',
])

/**
 * An attribute that is a framework's directive, the utilities this product
 * retired by name.
 *
 * `data-theme` is the daisyUI theme hook: the palette this product ships is
 * tokens.css, and a second theme switch on the tag is a second palette. The
 * `x-`, `@` and `:` prefixes are the Alpine and Vue directive shorthands, one
 * more way a listener or a binding can move into the tag where no module
 * ships it and no gate reads it.
 */
const DIRECTIVE_ATTRIBUTES: readonly { readonly pattern: RegExp; readonly why: string }[] = [
  { pattern: /^data-theme$/iu, why: 'data-theme is the daisyUI theme hook; the palette lives in tokens.css' },
  {
    pattern: /^(?:x-|@|:)/u,
    why: 'a directive attribute wires behaviour into the tag; attach the listener in a module',
  },
]

/** The one element a document may carry, whose duplication splits the shell a reader lands in. */
const LANDMARK = 'main'

/**
 * Whether a URL attribute value loads from outside the shipped bundle.
 * @param value - the attribute's value.
 * @param candidates - true for a list attribute, where each entry is one URL.
 * @returns true when any URL is remote.
 */
function isRemoteLoad(value: string, candidates: boolean): boolean {
  if (!candidates) return REMOTE_URL.test(value.trim())
  return value.split(',').some((candidate) => REMOTE_URL.test((candidate.trim().split(/\s+/u)[0] ?? '').trim()))
}

/**
 * The per-attribute refusals a tag carries: wiring, raw values and layout.
 *
 * @param attrs - the element's attributes, as the parser read them.
 * @param tag - the element's name, lowercased when it has one.
 * @param line - the line the element starts on.
 * @param found - the refusal list to append to.
 */
function recordAttributeOffences(
  attrs: readonly { readonly name: string; readonly value?: string }[],
  tag: string | undefined,
  line: number,
  found: MarkupOffence[],
): void {
  for (const attribute of attrs) {
    const name = attribute.name.toLowerCase()
    if (HTMX_ATTRIBUTE.test(attribute.name)) {
      found.push({ line, why: 'an hx attribute wires behaviour into the tag; attach the listener in a module' })
    }
    for (const { pattern, why } of DIRECTIVE_ATTRIBUTES) {
      if (pattern.test(attribute.name)) found.push({ line, why })
    }
    if (name === 'class' && ARBITRARY_UTILITY.test(attribute.value ?? '')) {
      found.push({
        line,
        why: 'a bracketed utility class carries a raw value; read the size or colour from tokens.css',
      })
    }
    if (ALIGNMENT_ATTRIBUTES.has(name)) {
      found.push({
        line,
        why: 'an alignment attribute is layout in the tag; put the alignment in a stylesheet and add a class',
      })
    }
    if (PRESENTATIONAL_ATTRIBUTES.has(name) && !(tag === 'img' && (name === 'width' || name === 'height'))) {
      found.push({
        line,
        why: 'a presentational attribute decides size or type in the tag; put it in a stylesheet and add a class',
      })
    }
    const resource = RESOURCE_URLS.get(tag ?? '')
    if (resource?.includes(name) && isRemoteLoad(attribute.value ?? '', name === 'srcset')) {
      found.push({
        line,
        why: 'a remote resource URL loads an asset no local install ships; ship the asset in the bundle',
      })
    }
  }
}

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
