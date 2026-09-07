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

import { retiredClassTokens } from './markup-vocabulary.ts'

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
 * An htmx wiring attribute, including HTMX 4's `:inherited` / `hx-status`
 * spellings and the `data-hx-` equivalent the docs still accept.
 *
 * An `hx-` attribute moves an element's behaviour into the tag: a listener, a
 * fetch and a swap all decided where the markup is written. This product wires
 * interactivity in modules, so no wiring attribute may ship.
 */
const HTMX_ATTRIBUTE = /^(?:data-)?hx-/iu

/**
 * A Tailwind arbitrary-value utility in a class list.
 *
 * A token whose bracketed payload follows a hyphen — a width, a colour, a font
 * size spelled inline — is syntax only a utility pipeline reads. No stylesheet
 * this repository ships selects such a token, so it names a spacing or colour
 * decision the design system never sees: the scale and the palette live in
 * tokens.css.
 */
// Tailwind 3 wrote an arbitrary value in square brackets and Tailwind 4 writes
// a custom property in parentheses — `bg-[--brand]` became `bg-(--brand)`. A
// pattern that knew only the bracket form read the current spelling as an
// ordinary class name.
const ARBITRARY_UTILITY = /-[^\s"']*(?:\[[^\]]+\]|\((?:--)[^)]+\))/u

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
  {
    pattern: /^v-/u,
    why: 'a Vue directive wires behaviour into the tag; attach the listener in a module',
  },
  {
    pattern: /^data-bs-/iu,
    why: 'a Bootstrap data-bs attribute is a retired framework hook; attach the listener in a module',
  },
]

/** One refusal, with its line. */
export interface MarkupOffence {
  readonly line: number
  readonly why: string
}

/**
 * An element's attributes, as the parser hands them over.
 *
 * Named once, and named here because every rule about one is stated in this
 * module: the shape was spelled out at each signature that took it, so a
 * reader had to compare four literal types character by character to see that
 * they were the same type.
 */
export type Attributes = readonly { readonly name: string; readonly value?: string }[]

/** One of them. */
type Attribute = Attributes[number]

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
 * The wiring one attribute name carries: an htmx hook, or a framework's own
 * directive spelling.
 * @param attribute - the attribute, as the parser read it.
 * @param line - the line the element starts on.
 * @returns the offences, or an empty list.
 */
function wiringOffences(attribute: Attribute, line: number): MarkupOffence[] {
  const found: MarkupOffence[] = []
  if (HTMX_ATTRIBUTE.test(attribute.name)) {
    found.push({ line, why: 'an hx attribute wires behaviour into the tag; attach the listener in a module' })
  }
  for (const { pattern, why } of DIRECTIVE_ATTRIBUTES) {
    if (pattern.test(attribute.name)) found.push({ line, why })
  }
  return found
}

/**
 * What a class list says that no stylesheet here selects.
 * @param value - the class attribute's value.
 * @param line - the line the element starts on.
 * @returns the offences, or an empty list.
 */
function classOffences(value: string, line: number): MarkupOffence[] {
  const found: MarkupOffence[] = []
  if (ARBITRARY_UTILITY.test(value)) {
    found.push({
      line,
      why: 'a bracketed utility class carries a raw value; read the size or colour from tokens.css',
    })
  }
  for (const token of retiredClassTokens(value)) {
    found.push({ line, why: `retired-class: "${token}" belongs to a UI framework this product retired` })
  }
  return found
}

/**
 * The layout and type one attribute decides in the tag rather than the sheet.
 * @param name - the attribute's name, lowercased.
 * @param tag - the element's name, lowercased when it has one.
 * @param line - the line the element starts on.
 * @returns the offences, or an empty list.
 */
function presentationOffences(name: string, tag: string | undefined, line: number): MarkupOffence[] {
  const found: MarkupOffence[] = []
  if (ALIGNMENT_ATTRIBUTES.has(name)) {
    found.push({
      line,
      why: 'an alignment attribute is layout in the tag; put the alignment in a stylesheet and add a class',
    })
  }
  // The one allowed pair: on an image these are the aspect-ratio hint that
  // stops a layout shift before the sheet applies.
  const ratioHint = tag === 'img' && (name === 'width' || name === 'height')
  if (PRESENTATIONAL_ATTRIBUTES.has(name) && !ratioHint) {
    found.push({
      line,
      why: 'a presentational attribute decides size or type in the tag; put it in a stylesheet and add a class',
    })
  }
  return found
}

/**
 * Whether one attribute loads an asset from outside the shipped bundle.
 * @param attribute - the attribute, as the parser read it.
 * @param name - its name, lowercased.
 * @param tag - the element's name, lowercased when it has one.
 * @param line - the line the element starts on.
 * @returns the offence, or an empty list.
 */
function remoteResourceOffences(
  attribute: Attribute,
  name: string,
  tag: string | undefined,
  line: number,
): MarkupOffence[] {
  const resource = RESOURCE_URLS.get(tag ?? '')
  if (resource?.includes(name) !== true) return []
  if (!isRemoteLoad(attribute.value ?? '', name === 'srcset')) return []
  return [{ line, why: 'a remote resource URL loads an asset no local install ships; ship the asset in the bundle' }]
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
  attrs: Attributes,
  tag: string | undefined,
  line: number,
  found: MarkupOffence[],
): void {
  for (const attribute of attrs) {
    const name = attribute.name.toLowerCase()
    found.push(
      ...wiringOffences(attribute, line),
      ...(name === 'class' ? classOffences(attribute.value ?? '', line) : []),
      ...presentationOffences(name, tag, line),
      ...remoteResourceOffences(attribute, name, tag, line),
    )
  }
}
