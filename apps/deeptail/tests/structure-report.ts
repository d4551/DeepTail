/**
 * What every structural check produces, how it names an element, and the one
 * computed value more than one of them has to read.
 *
 * Shared by the markup checks and the geometry checks so both report in one
 * vocabulary; each is shipped to the page as its own source text, so nothing
 * here may close over anything.
 *
 * @module
 */

/** One structural defect, as the page reports it. */
export interface StructureFinding {
  readonly rule: string
  readonly detail: string
}

/** Collects one finding. */
export type Report = (rule: string, detail: string) => void

/**
 * An element, named the way a reader finds it in the markup.
 * @param node - the element to describe.
 * @returns tag, id and classes.
 */
export function describe(node: Element): string {
  const id = node.id === '' ? '' : `#${node.id}`
  const classes = node.classList.length > 0 ? `.${[...node.classList].join('.')}` : ''
  return `${node.tagName.toLowerCase()}${id}${classes}`
}

/**
 * The pixels a computed length holds.
 *
 * The engine reports every length it resolved as a number of CSS pixels, and
 * every other spelling of that property — `normal`, a keyword a font choice
 * left in place — is a value with no length in it at all. Answering zero for
 * those is what lets the callers tell the two apart, and keeps a value this
 * reader cannot measure out of their findings rather than invented into one.
 * @param value - a computed length.
 * @returns the pixels it holds, 0 when it holds none.
 */
export function pixelLength(value: string): number {
  const text = value.trim()
  return text.endsWith('px') ? Number(text.slice(0, -2)) : 0
}
