/**
 * What scrolls, and what must not: the scroll containers of a page.
 *
 * Two scrollbars on one axis leave the reader guessing which one moves, and a
 * document that scrolls sideways is content the reader cannot reach at all on a
 * phone. Both are defects no rule engine reports — every element is reachable
 * and correctly labelled — and both are read here, from the live tree, because
 * whether a box scrolls is a computation rather than markup.
 *
 * Split from `structure-layout.ts` when that file outgrew the size the linter
 * allows one file: the checks that judge markup's boxes stay there, and the
 * ones that judge how a box scrolls live here.
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
 * `overflow-y` is anything else, so no measurement separates the two axes here;
 * sideways scroll has its own check, which forbids it on the document.
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
 * Whether an element's vertical scrolling is a pane of layout.
 *
 * A `textarea` long enough to need scrolling scrolls the text being edited,
 * and a `select` its own option list. Neither is a pane the layout put inside
 * another pane: they are leaves, and they cannot be made not to scroll without
 * losing the content they hold — and reading them as panes made the rule forbid
 * a shape every dialog needs, a dialog that scrolls and holds a text field.
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

export { checkHorizontalOverflow, checkNestedScroll, scrolls }
