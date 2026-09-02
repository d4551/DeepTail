/**
 * What the inline-style gate refuses, as tables rather than as code.
 *
 * Kept apart from the readers that apply them so a rule can be added by naming
 * it, and so the readers stay short enough to follow.
 *
 * @module
 */

/** Properties that reach an element's own style declaration, keyed in lower case. */
export const STYLE_PROPERTIES = new Map<string, string>([
  ['style', 'an element style declaration is an inline style; put the rule in a stylesheet and add a class'],
  ['csstext', 'writing cssText replaces an inline style block; put the rule in a stylesheet and add a class'],
  ['attributestylemap', 'the typed style map is the style attribute; put the rule in a stylesheet and add a class'],
])

/** Calls that set an attribute, and which argument names it. */
export const ATTRIBUTE_SETTERS = new Map<string, number>([
  ['setAttribute', 0],
  ['setAttributeNS', 1],
  ['createAttribute', 0],
  ['createAttributeNS', 1],
  ['toggleAttribute', 0],
])

/** Calls that write a property under a name, and which argument names it. */
export const KEYED_WRITES = new Map<string, number>([
  ['set', 1],
  ['defineProperty', 1],
])

/**
 * Calls that write every property an object literal carries.
 *
 * `Object.assign(el, { style })` reaches the same declaration as `el.style`,
 * and it is already this codebase's idiom for merging onto an object, so the
 * keys of what is being merged are read.
 */
export const MERGED_WRITES = new Set(['assign', 'defineProperties'])

/** Namespaces whose keyed writes reach an object's own properties. */
export const KEYED_WRITE_HOSTS = new Set(['Reflect', 'Object'])

/** Calls that set an attribute without ever naming it in the source. */
export const OPAQUE_ATTRIBUTE_CALLS = new Map<string, string>([
  ['setAttributeNode', 'an attribute node hides its name from every checker; use setAttribute with a literal name'],
  ['setAttributeNodeNS', 'an attribute node hides its name from every checker; use setAttributeNS with a literal name'],
  ['setNamedItem', 'the attribute map hides the name from every checker; use setAttribute with a literal name'],
])

/** The attribute this gate exists to keep out of the product. */
export const STYLE_ATTRIBUTE = 'style'
