/**
 * What every structural check produces, how it names an element, and the two
 * computed values more than one of them has to read.
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

/**
 * Whether an element's own clip leaves it nothing to paint.
 *
 * The visually-hidden contract is a zero rectangle: the element stays in the
 * accessibility tree for a reader's assistive technology while painting no
 * pixels for a sighted one. Every rule that measures what a sighted reader
 * sees — the type it reads, the box it is cut by — measures nothing here, and
 * reporting the utility for doing exactly what it exists to do would name the
 * contract a defect.
 *
 * The rectangle is read by its four lengths rather than by its spelling. A
 * computed `clip` is not the author's: the engine writes each side out in CSS
 * pixels and separates them the way that engine does, so `rect(0 0 0 0)` in a
 * sheet arrives as `rect(0px, 0px, 0px, 0px)`. Comparing the text against the
 * authored spelling read every one of those as a box with something to paint,
 * which is the shape a rule reports a hidden label for. What is compared is
 * what the four sides measure, and nothing else.
 * @param style - the element's computed style.
 * @returns true when the element's clip leaves it nothing to paint.
 */
export function clippedAway(style: CSSStyleDeclaration): boolean {
  const sides = /^rect\(([^)]*)\)$/u.exec(style.clip.replaceAll(' ', ''))?.[1]
  if (sides === undefined) return false
  // A side carries the unit the engine resolved it to, so it is read as a zero
  // length with or without its `px` — coercing the text instead would read
  // every `0px` as not a number, and the element as one with a box to paint.
  return sides.split(',').every((side) => /^0(?:\.0+)?(?:px)?$/u.test(side))
}
