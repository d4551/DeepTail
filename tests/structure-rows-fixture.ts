/**
 * The fixtures the row-seating suites drive: the declarations the checks read,
 * and the boxes, rows and lists they are read over.
 *
 * happy-dom paints no box, so every rectangle is painted onto the element
 * instance the check reads; the browser suites remain the account of what a real
 * engine lays out. Held apart from the spec so the spec is the table of cases
 * and this is the machinery for building one.
 */

import { collector, PHYSICAL_JUSTIFY, PHYSICAL_LEFT, PHYSICAL_RIGHT, paintBox, surface } from './structure-double.ts'

export { collector, PHYSICAL_JUSTIFY, PHYSICAL_LEFT, PHYSICAL_RIGHT, paintBox, surface }

/** The surface every case reads. */
export const SCOPE = '[data-structure-scope]'

/**
 * The row-seating properties that carry a physical value, assembled so this
 * file's own source writes none of them whole.
 */
export const JUSTIFY_ITEMS = ['justify', 'items'].join('-')
export const PLACE_ITEMS = ['place', 'items'].join('-')

/**
 * The declarations the row checks read, as one stylesheet the document carries.
 */
export const DECLARATIONS = [
  `.align-${PHYSICAL_LEFT} { text-align: ${PHYSICAL_LEFT}; }`,
  `.align-${PHYSICAL_RIGHT} { text-align: ${PHYSICAL_RIGHT}; }`,
  `.align-${PHYSICAL_JUSTIFY} { text-align: ${PHYSICAL_JUSTIFY}; }`,
  `.items-${PHYSICAL_LEFT} { ${JUSTIFY_ITEMS}: ${PHYSICAL_LEFT}; }`,
  `.items-${PHYSICAL_RIGHT} { ${PLACE_ITEMS}: ${PHYSICAL_RIGHT}; }`,
  '.items-logical { justify-items: start; }',
  '.flex-row { display: flex; }',
  '.grid-row { display: grid; }',
  '.baseline-row { display: flex; align-items: baseline; }',
  '.stacked { display: block; }',
  '.pinned { position: absolute; }',
  '.off-page { display: none; }',
].join('\n')

/**
 * One box with an id, painted at the given edges.
 * @param id - the id the finding names it by.
 * @param box - the edges of the box, in CSS pixels.
 * @returns the element.
 */
export function boxed(
  id: string,
  box: { readonly top: number; readonly left: number; readonly right: number; readonly bottom: number },
): HTMLElement {
  const node = document.createElement('button')
  node.id = id
  paintBox(node, box)
  return node
}

/**
 * One list row, painted at the given block edges.
 * @param top - the row's top edge, in CSS pixels.
 * @param bottom - the row's bottom edge, in CSS pixels.
 * @returns the row.
 */
export function listRow(top: number, bottom: number): HTMLElement {
  const row = document.createElement('div')
  paintBox(row, { top, left: 0, right: 100, bottom })
  return row
}

/**
 * One surface holding one list with the given rows in it.
 * @param rows - the rows, already painted.
 * @returns the list.
 */
export function listOf(...rows: readonly HTMLElement[]): HTMLElement {
  const root = surface('div')
  const list = document.createElement('div')
  list.setAttribute('role', 'list')
  list.append(...rows)
  root.append(list)
  document.body.append(root)
  return list
}

/**
 * One surface holding one container of the named class, with the children in it.
 *
 * The children are read as plain elements rather than as `HTMLElement`s,
 * because one of the shapes the rule must pass over is an SVG child: the rule
 * skips anything that is not an `HTMLElement`, and a signature narrower than
 * that could not seat the case which proves it.
 * @param className - the container's class, which carries the display rule.
 * @param children - the children, already painted.
 * @returns the container.
 */
export function rowOf(className: string, ...children: readonly Element[]): HTMLElement {
  const root = surface('div')
  const row = document.createElement('div')
  row.className = className
  row.append(...children)
  root.append(row)
  document.body.append(root)
  return row
}
