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
 * Two scrollbars on one axis leave the reader guessing which one moves.
 *
 * A pane that scrolls inside a pane that also scrolls traps the wheel at
 * whichever boundary the pointer happens to be over, and on a phone it hides
 * half the content behind a gesture nobody discovers. axe has no rule for it:
 * every element is reachable and correctly labelled, and the page is still
 * unusable. A shell scrolls in exactly one place per axis; the pane that owns
 * the overflow keeps `auto`, and everything above it clips.
 * @param add - collects a finding.
 */
function checkNestedScroll(add: Report): void {
  for (const node of document.querySelectorAll('body *')) {
    if (!scrolls(node)) continue
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
 * Two targets that share pixels leave the click on whichever is on top.
 *
 * A control drawn over another control is unreachable where they overlap, and
 * no rule engine reports it: both are labelled, both are in the tab order, and
 * half of one of them cannot be activated at all. Ancestor and descendant are
 * excluded — a link inside a card that is itself a target is the layout, not a
 * defect — and one device pixel of overlap is allowed as rounding.
 * @param add - collects a finding.
 * @param limits - which elements take focus or activation, handed in by the caller.
 */
function checkOverlappingTargets(add: Report, limits: { readonly interactive: string }): void {
  const nodes = [...document.querySelectorAll(limits.interactive)].filter(
    (node) => node.closest('[inert]') === null && (node as HTMLElement).checkVisibility(),
  )
  for (const [index, node] of nodes.entries()) {
    const box = node.getBoundingClientRect()
    for (const other of nodes.slice(index + 1)) {
      if (other.contains(node) || node.contains(other)) continue
      const over = other.getBoundingClientRect()
      const width = Math.min(box.right, over.right) - Math.max(box.left, over.left)
      const height = Math.min(box.bottom, over.bottom) - Math.max(box.top, over.top)
      if (width > 1 && height > 1) {
        add('overlapping-targets', `${describe(node)} overlaps ${describe(other)}`)
      }
    }
  }
}

/** What the pointer checks measure against, as the caller hands it to the page. */
interface PointerLimits {
  /** The smallest target this pointer admits, in CSS pixels. */
  readonly target: number
  /** Elements that take focus or activation without a `tabindex`. */
  readonly interactive: string
}

/**
 * Every control a finger reaches clears the platform minimum.
 * @param add - collects a finding.
 * @param limits - what the checks measure against.
 */
function checkTouchTargets(add: Report, limits: PointerLimits): void {
  const floor = limits.target
  for (const node of document.querySelectorAll(limits.interactive)) {
    // An inert subtree is not reachable, so its geometry is not a target.
    if (node.closest('[inert]') !== null) continue
    if (!(node as HTMLElement).checkVisibility()) continue
    const box = node.getBoundingClientRect()
    // A control that is shown and takes focus but paints nothing is unreachable
    // in fact: the operator cannot aim at what occupies no pixels.
    if (box.width === 0 && box.height === 0) {
      add('target-collapsed', `${describe(node)} takes focus but paints no box`)
      continue
    }
    if (box.height < floor || box.width < floor) {
      add(
        'target-size',
        `${describe(node)} is ${String(Math.round(box.width))}x${String(Math.round(box.height))}, under ${String(floor)}`,
      )
    }
  }
}

export {
  checkClipping,
  checkHorizontalOverflow,
  checkNestedScroll,
  checkOverlappingTargets,
  checkTouchTargets,
  scrolls,
}
