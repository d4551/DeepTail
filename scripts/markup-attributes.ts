/**
 * The per-attribute refusals a markup gate makes: wiring, raw values, layout,
 * framework directives and remote loads.
 *
 * Split from `markup-gate.ts` the day that module outgrew the size its own
 * rules allow a file to reach. The two halves share one vocabulary of offences,
 * and every rule here is stated about attributes, so nothing written here can
 * see past the parser the caller walks.
 *
 * @module
 */

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
  // A remote base re-roots every relative load in the document to that host,
  // which is every resource URL above with the scheme borrowed.
  ['base', ['href']],
])

/** A URL that loads from outside the shipped bundle, absolute or protocol-relative. */
export const REMOTE_URL = /^(?:https?:)?\/\//iu

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

/** One refusal, with its line. */
export interface MarkupOffence {
  readonly line: number
  readonly why: string
}

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
export function recordAttributeOffences(
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
