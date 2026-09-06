/**
 * The structural checks that measure boxes rather than read markup.
 *
 * Geometry is the half of conformance no rule engine reports: an element can be
 * correctly labelled, correctly nested and still be scrolled out of reach or
 * cut off by the box it sits in. These run inside the page like the rest, so
 * they may only use DOM APIs and what they are handed.
 *
 * @module
 */

import { describe, type Report } from './structure-report.ts'

/**
 * Whether an element is a vertical scroll container.
 *
 * Read from the declaration, not from whether the box overflows right now:
 * overflow depends on how much content the case happens to load, so a check
 * conditioned on it passes on a short fixture and reports the defect for the
 * first time in front of a user. Two scroll containers on one axis are the
 * defect whether or not both are scrolling yet.
 *
 * Vertical only. CSS computes `overflow-x: visible` to `auto` as soon as
 * `overflow-y` is anything else, so every vertical pane reads as a horizontal
 * one too and no measurement separates the two. Sideways scroll has its own
 * check, which forbids it on the document outright.
 * @param node - the element to measure.
 * @returns true when the box scrolls its own vertical overflow.
 */
function scrolls(node: Element): boolean {
  const overflow = getComputedStyle(node).overflowY
  return overflow === 'auto' || overflow === 'scroll'
}

/**
 * The page must never scroll sideways at any width it ships to.
 * @param add - collects a finding.
 */
function checkHorizontalOverflow(add: Report): void {
  const doc = document.documentElement
  if (doc.scrollWidth > doc.clientWidth) {
    add('horizontal-overflow', `document scrolls to ${String(doc.scrollWidth)} in ${String(doc.clientWidth)}`)
  }
}

/**
 * Text that overruns its box without a scroll or an ellipsis is simply lost.
 * @param add - collects a finding.
 */
function checkClipping(add: Report): void {
  // Every element that carries its own text, rather than a hand-written list of
  // classes that goes quiet the moment a new one is added.
  const carries = [...document.querySelectorAll('body *')].filter((node) =>
    [...node.childNodes].some((child) => child.nodeType === Node.TEXT_NODE && (child.textContent ?? '').trim() !== ''),
  )
  for (const node of carries) {
    const computed = getComputedStyle(node)
    if (
      node.scrollWidth > node.clientWidth + 1 &&
      computed.overflow === 'visible' &&
      computed.textOverflow !== 'ellipsis'
    ) {
      add('clipped-content', `${describe(node)} overflows its box without a scroll or ellipsis`)
    }
  }
}

/**
 * Whether an element's vertical scrolling is a pane of layout.
 *
 * A `textarea` long enough to need scrolling scrolls the text being edited,
 * and a `select` its own option list. Neither is a pane the layout put inside
 * another pane: they are leaves, and they cannot be made not to scroll without
 * losing the content they hold. Reading them as nested panes made the rule
 * forbid a shape every dialog needs — a dialog that scrolls and holds a text
 * field — so the rule stayed silent until the dialog's scroll containment was
 * deleted, and then stayed silent about that too.
 *
 * `contenteditable` joins the form controls: it is an editor whatever tag
 * carries it. The tag list is written inside the function because this source
 * is shipped to the page on its own, so a constant beside it would arrive as a
 * `ReferenceError`.
 * @param node - the element to judge.
 * @returns true when the box is a layout pane rather than an editable control.
 */
export function isLayoutPane(node: Element): boolean {
  const valueScrollers = new Set(['TEXTAREA', 'SELECT'])
  return !valueScrollers.has(node.tagName) && !(node instanceof HTMLElement && node.isContentEditable)
}

/**
 * Two scrollbars on one axis leave the reader guessing which one moves.
 *
 * A pane that scrolls inside a pane that also scrolls traps the wheel at
 * whichever boundary the pointer happens to be over, and on a phone it hides
 * half the content behind a gesture nobody discovers. axe has no rule for it:
 * every element is reachable and correctly labelled, and the page is still
 * unusable. A shell scrolls in exactly one place per axis; the pane that owns
 * the overflow keeps `auto`, and everything above it clips.
 *
 * Only panes are counted, on both sides of the nesting: an editable control
 * scrolling its own value is not a second pane, and nothing may nest inside
 * one either.
 * @param add - collects a finding.
 */
function checkNestedScroll(add: Report): void {
  for (const node of document.querySelectorAll('body *')) {
    if (!scrolls(node) || !isLayoutPane(node)) continue
    let ancestor = node.parentElement
    while (ancestor !== null) {
      if (scrolls(ancestor)) {
        add('nested-scroll', `${describe(node)} scrolls inside ${describe(ancestor)}, which also scrolls`)
        break
      }
      ancestor = ancestor.parentElement
    }
  }
}

/**
 * Physical or justified text alignment is an alignment defect at runtime too.
 *
 * The sheet gate refuses `text-align: left|right|justify` in source. A page
 * can still compute that alignment from an injected sheet or a framework
 * class, and no rule engine reports it: the text is readable and the contrast
 * holds. `start`/`end` follow the writing mode; `left`/`right`/`justify` do
 * not.
 * @param add - collects a finding.
 * @param limits - the product surfaces to read.
 */
function checkAlignment(add: Report, limits: { readonly scope: string }): void {
  for (const node of document.querySelectorAll(limits.scope)) {
    for (const element of [node, ...node.querySelectorAll('*')]) {
      const align = getComputedStyle(element).textAlign
      if (align === 'left' || align === 'right' || align === 'justify') {
        add('alignment', `${describe(element)} uses physical or justified text-align ${align}`)
      }
    }
  }
}

/**
 * A grid nested in a grid, or a table used as a grid, is layout the sheets
 * do not own.
 *
 * Token-based `grid-template-*` computes to pixels, so this does not judge
 * track sizes — the sheet gate does that in source. What the live tree can
 * still show is a second grid inside the shell's grid, or a `<table>` with no
 * header standing in for a layout grid.
 * @param add - collects a finding.
 * @param limits - the product surfaces to read.
 */
function gridAncestor(element: Element): Element | undefined {
  let ancestor = element.parentElement
  while (ancestor !== null) {
    const display = getComputedStyle(ancestor).display
    if (display === 'grid' || display === 'inline-grid') return ancestor
    ancestor = ancestor.parentElement
  }
  return undefined
}

function checkGrid(add: Report, limits: { readonly scope: string }): void {
  for (const node of document.querySelectorAll(limits.scope)) {
    for (const element of [node, ...node.querySelectorAll('*')]) {
      const display = getComputedStyle(element).display
      if (display === 'grid' || display === 'inline-grid') {
        const parent = gridAncestor(element)
        if (parent !== undefined) {
          add('nested-grid', `${describe(element)} is a grid inside ${describe(parent)}, which is also a grid`)
        }
      }
      if (display === 'table' && element.tagName !== 'TABLE') {
        add('hardcoded-grid', `${describe(element)} uses display:table as a layout grid`)
      }
    }
    for (const table of node.querySelectorAll('table')) {
      if (table.querySelector('th, [scope]') === null) {
        add('layout-table', `${describe(table)} is a table with no header, used as a layout grid`)
      }
    }
  }
}

export { checkAlignment, checkClipping, checkGrid, checkHorizontalOverflow, checkNestedScroll, gridAncestor, scrolls }
