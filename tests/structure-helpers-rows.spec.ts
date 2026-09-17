/**
 * Where a row's boxes sit: the text alignment a box computes, the physical
 * spelling a row is seated with, the line siblings share, and the rhythm a
 * repeated list keeps.
 *
 * happy-dom paints no box, so every rectangle is painted onto the element
 * instance the check reads; the browser suites remain the account of what a
 * real engine lays out. What the check decides from those rectangles — which
 * boxes share a line, when one of them is adrift, and when a list has changed
 * its rhythm — is driven here, where the mutation runs can judge it.
 */

import { beforeEach, expect, it } from 'bun:test'
import type { StructureFinding } from '../apps/deeptail/tests/structure-report.ts'
import { checkAlignment, checkListGutters, checkSiblingAlignment } from '../apps/deeptail/tests/structure-rows.ts'
import { resetDocument } from './dom.ts'
import {
  collector,
  paintBox,
  PHYSICAL_JUSTIFY,
  PHYSICAL_LEFT,
  PHYSICAL_RIGHT,
  surface,
} from './structure-double.ts'

/** The surface every case reads. */
const SCOPE = '[data-structure-scope]'

/**
 * The row-seating properties that carry a physical value, assembled so this
 * file's own source writes none of them whole.
 */
const JUSTIFY_ITEMS = ['justify', 'items'].join('-')
const PLACE_ITEMS = ['place', 'items'].join('-')

/**
 * The declarations the row checks read, as one stylesheet the document carries.
 */
const DECLARATIONS = [
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
function boxed(
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
function listRow(top: number, bottom: number): HTMLElement {
  const row = document.createElement('div')
  paintBox(row, { top, left: 0, right: 100, bottom })
  return row
}

/**
 * One surface holding one list with the given rows in it.
 * @param rows - the rows, already painted.
 * @returns the list.
 */
function listOf(...rows: readonly HTMLElement[]): HTMLElement {
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
 * @param className - the container's class, which carries the display rule.
 * @param children - the children, already painted.
 * @returns the container.
 */
function rowOf(className: string, ...children: readonly HTMLElement[]): HTMLElement {
  const root = surface('div')
  const row = document.createElement('div')
  row.className = className
  row.append(...children)
  root.append(row)
  document.body.append(root)
  return row
}

/**
 * The findings one alignment pass reports over the surfaces.
 * @returns the findings the check reported.
 */
function alignmentFindings(): StructureFinding[] {
  const { findings, add } = collector()
  checkAlignment(add, { scope: SCOPE })
  return findings
}

/**
 * The findings one sibling-alignment pass reports over the surfaces.
 * @returns the findings the check reported.
 */
function siblingFindings(): StructureFinding[] {
  const { findings, add } = collector()
  checkSiblingAlignment(add, { scope: SCOPE })
  return findings
}

/**
 * The findings one list-gutter pass reports over the surfaces.
 * @returns the findings the check reported.
 */
function gutterFindings(): StructureFinding[] {
  const { findings, add } = collector()
  checkListGutters(add, { scope: SCOPE })
  return findings
}

beforeEach(() => {
  resetDocument()
  const sheet = document.createElement('style')
  sheet.textContent = DECLARATIONS
  document.head.append(sheet)
})

it('reports physical or justified text alignment computed at runtime, and start stays silent', () => {
  const root = surface('div')
  const left = document.createElement('p')
  left.className = `align-${PHYSICAL_LEFT}`
  const right = document.createElement('p')
  right.className = `align-${PHYSICAL_RIGHT}`
  const justified = document.createElement('p')
  justified.className = `align-${PHYSICAL_JUSTIFY}`
  const start = document.createElement('p')
  root.append(left, right, justified, start)
  document.body.append(root)
  const loose = document.createElement('p')
  loose.className = `align-${PHYSICAL_LEFT}`
  document.body.append(loose)
  expect(alignmentFindings()).toEqual([
    { rule: 'alignment', detail: `p.align-${PHYSICAL_LEFT} uses physical or justified text-align ${PHYSICAL_LEFT}` },
    { rule: 'alignment', detail: `p.align-${PHYSICAL_RIGHT} uses physical or justified text-align ${PHYSICAL_RIGHT}` },
    {
      rule: 'alignment',
      detail: `p.align-${PHYSICAL_JUSTIFY} uses physical or justified text-align ${PHYSICAL_JUSTIFY}`,
    },
  ])
})

it('reports a row seated with a physical property, and reads the logical spelling as conforming', () => {
  const root = surface('div')
  const items = document.createElement('div')
  items.className = `items-${PHYSICAL_LEFT}`
  const placed = document.createElement('div')
  placed.className = `items-${PHYSICAL_RIGHT}`
  const logical = document.createElement('div')
  logical.className = 'items-logical'
  root.append(items, placed, logical)
  document.body.append(root)
  // A value with nothing physical in it follows the writing mode, and a
  // property the page never declared is not a seating decision at all.
  expect(alignmentFindings()).toEqual([
    {
      rule: 'alignment',
      detail: `div.items-${PHYSICAL_LEFT} seats its row with the physical ${JUSTIFY_ITEMS} ${PHYSICAL_LEFT} in a ltr document, where the logical start and end follow the writing mode and this spelling cannot`,
    },
    {
      rule: 'alignment',
      detail: `div.items-${PHYSICAL_RIGHT} seats its row with the physical ${PLACE_ITEMS} ${PHYSICAL_RIGHT} in a ltr document, where the logical start and end follow the writing mode and this spelling cannot`,
    },
  ])
})

it('reports a box adrift on the line its siblings share, and a move of one pixel as seated', () => {
  const lead = boxed('lead', { top: 0, left: 0, right: 100, bottom: 40 })
  const seated = boxed('seated', { top: 0, left: 100, right: 200, bottom: 40 })
  const adrift = boxed('adrift', { top: 10, left: 200, right: 300, bottom: 50 })
  const row = rowOf('flex-row', lead, seated, adrift)
  expect(siblingFindings()).toEqual([
    {
      rule: 'sibling-misalignment',
      detail: "button#adrift shares button#lead's line without sharing its top, bottom or centre",
    },
  ])
  // Fractional layout leaves a pixel behind; one is not a misalignment.
  paintBox(adrift, { top: 1, left: 200, right: 300, bottom: 41 })
  expect(siblingFindings()).toEqual([])
  paintBox(adrift, { top: 0, left: 200, right: 300, bottom: 40 })
  expect(siblingFindings()).toEqual([])
  expect(row.children.length).toBe(3)
})

it('reports every box adrift on one line, rather than the first one found', () => {
  const lead = boxed('lead', { top: 0, left: 0, right: 100, bottom: 40 })
  const first = boxed('first-drift', { top: 10, left: 100, right: 200, bottom: 50 })
  const second = boxed('second-drift', { top: -10, left: 200, right: 300, bottom: 30 })
  rowOf('flex-row', lead, first, second)
  expect(siblingFindings()).toEqual([
    {
      rule: 'sibling-misalignment',
      detail: "button#first-drift shares button#lead's line without sharing its top, bottom or centre",
    },
    {
      rule: 'sibling-misalignment',
      detail: "button#second-drift shares button#lead's line without sharing its top, bottom or centre",
    },
  ])
})

it('reads a box centred on the line as seated, whatever its own height', () => {
  const lead = boxed('lead', { top: 0, left: 0, right: 100, bottom: 40 })
  const shorter = boxed('shorter', { top: 2, left: 100, right: 200, bottom: 38 })
  const row = rowOf('grid-row', lead, shorter)
  expect(siblingFindings()).toEqual([])
  expect(row.className).toBe('grid-row')
})

it('reads a row of one box, and two boxes that share no line, as nothing to report', () => {
  const alone = boxed('alone', { top: 0, left: 0, right: 100, bottom: 40 })
  const above = boxed('above', { top: 200, left: 0, right: 100, bottom: 240 })
  const below = boxed('below', { top: 100, left: 0, right: 100, bottom: 140 })
  rowOf('flex-row', alone)
  rowOf('flex-row', above, below)
  expect(siblingFindings()).toEqual([])
})

it('reads only the containers that place children side by side, and only their laid-out children', () => {
  const lead = boxed('lead', { top: 0, left: 0, right: 100, bottom: 40 })
  const adrift = boxed('adrift', { top: 10, left: 100, right: 200, bottom: 50 })
  // A block container stacks its children, and a baseline row is aligned by the
  // engine, so neither is a line this rule has anything to say about.
  rowOf('stacked', lead, adrift)
  rowOf('baseline-row', lead, adrift)
  const pinned = boxed('pinned', { top: 10, left: 100, right: 200, bottom: 50 })
  pinned.className = 'pinned'
  const collapsed = boxed('collapsed', { top: 10, left: 100, right: 200, bottom: 10 })
  const hidden = boxed('hidden', { top: 10, left: 100, right: 200, bottom: 50 })
  hidden.className = 'off-page'
  const drawing = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  rowOf('flex-row', lead, pinned, collapsed, hidden, drawing)
  expect(siblingFindings()).toEqual([])
})

it('reads a list whose rows keep one rhythm as conforming, and a list with no rows to measure', () => {
  listOf(listRow(0, 20), listRow(30, 50), listRow(60, 80))
  listOf()
  listOf(listRow(0, 20))
  expect(gutterFindings()).toEqual([])
})

it("reports a row off the list's own rhythm, and stays silent within a pixel of it", () => {
  const adrift = listRow(104, 124)
  listOf(listRow(0, 20), listRow(30, 50), listRow(60, 80), adrift)
  expect(gutterFindings()).toEqual([
    {
      rule: 'inconsistent-gutter',
      detail: "div sits 24px below the row above, where the list's own rhythm is 10px",
    },
  ])
  paintBox(adrift, { top: 91, left: 0, right: 100, bottom: 111 })
  expect(gutterFindings()).toEqual([])
})

it('reads a list outside the surfaces as another rule subject, and a skipped row as not part of the rhythm', () => {
  const hidden = listRow(30, 50)
  hidden.className = 'off-page'
  listOf(listRow(0, 20), hidden, listRow(60, 80))
  const loose = document.createElement('div')
  loose.setAttribute('role', 'list')
  const looseFirst = listRow(0, 20)
  const looseSecond = listRow(100, 120)
  loose.append(looseFirst, looseSecond)
  document.body.append(loose)
  expect(gutterFindings()).toEqual([])
})
