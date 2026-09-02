/**
 * What every structural check produces, and how it names an element.
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
