/**
 * The structural checks that judge what a box does with the markup inside it:
 * text its own clip loses, and layout drawn by a grid or a table the sheets do
 * not own.
 *
 * Geometry is the half of conformance no rule engine reports: an element can be
 * correctly labelled, correctly nested and still be cut off by the box it sits
 * in, or stand in for a layout grid. These run inside the page like the rest,
 * so they may only use DOM APIs and what they are handed.
 *
 * The checks that read how a box scrolls live in `structure-scroll.ts` and the
 * ones that read where a row's boxes sit in `structure-rows.ts`: this file
 * holds what the box around the content does to it.
 *
 * @module
 */

import { carriesText, surfaceElements } from './structure-elements.ts'
import { clippedAway, describe, type Report } from './structure-report.ts'

/**
 * Text that overruns its box without a scroll or an ellipsis is simply lost.
 *
 * Both axes are read, because the same defect has two. A reader who raises
 * their text spacing to the sizes WCAG 1.4.12 names, or their text size to the
 * 200% of 1.4.4, does not make a box wider — they make the text inside it
 * taller, so the line that leaves a fixed-height box is cut off by exactly the
 * declaration that used to be a harmless `overflow: hidden`.
 *
 * A single nowrap line carrying an ellipsis is the one deliberate truncation:
 * the reader is told the text continues. The same declaration on a box that
 * wraps tells them nothing, so it is still a loss.
 *
 * A box whose own clip leaves it nothing to paint is the other deliberate
 * hiding, and it is not this rule's subject: it shows no text to anybody on
 * screen, which is what makes it a screen-reader-only name, and the overflow it
 * clips on both axes is the mechanism rather than content lost to a reader. The
 * clip is what says so — a box is hidden by its own clip whatever rectangle it
 * occupies, and reading a measurement instead reported a hidden box for the
 * rectangle it happened to have.
 * @param add - collects a finding.
 */
function checkClipping(add: Report): void {
  // Every element that carries its own text, rather than a hand-written list of
  // classes that goes quiet the moment a new one is added.
  const carries = [...document.querySelectorAll('body *')].filter((node) => carriesText(node))
  for (const node of carries) {
    const computed = getComputedStyle(node)
    if (clippedAway(computed)) continue
    if (
      node.scrollWidth > node.clientWidth + 1 &&
      computed.overflow === 'visible' &&
      computed.textOverflow !== 'ellipsis'
    ) {
      add('clipped-content', `${describe(node)} overflows its box without a scroll or ellipsis`)
    }
    const oneLine = computed.whiteSpace === 'nowrap' && computed.textOverflow === 'ellipsis'
    if (
      (computed.overflowY === 'hidden' || computed.overflowY === 'clip') &&
      !oneLine &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      add('clipped-content', `${describe(node)} is cut off by the box it sits in, on the block axis`)
    }
  }
}

/**
 * The nearest ancestor that is a grid, when there is one.
 * @param element - the element to walk up from.
 * @returns the ancestor, or undefined when none of them is a grid.
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

/**
 * A grid nested in a grid, or a table used as a grid, is layout the sheets do
 * not own.
 *
 * Token-based `grid-template-*` computes to pixels, so this does not judge
 * track sizes — the sheet gate does that in source. What the live tree can
 * still show is a second grid inside the shell's grid, or a `<table>` with no
 * header standing in for a layout grid.
 * @param add - collects a finding.
 * @param limits - the product surfaces to read.
 */
function checkGrid(add: Report, limits: { readonly scope: string }): void {
  for (const element of surfaceElements(limits.scope)) {
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
  for (const root of document.querySelectorAll(limits.scope)) {
    for (const table of root.querySelectorAll('table')) {
      if (table.querySelector('th, [scope]') === null) {
        add('layout-table', `${describe(table)} is a table with no header, used as a layout grid`)
      }
    }
  }
}

export { checkClipping, checkGrid, gridAncestor }
