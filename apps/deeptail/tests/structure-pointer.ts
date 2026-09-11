/**
 * What a pointer can actually reach.
 *
 * Split from `structure-layout.ts` when it outgrew the size the linter allows
 * one file. These two rules share the one question the others do not ask:
 * where a box is *painted*, as against where it is laid out. An element inside
 * a pane that scrolls keeps reporting a rectangle the pane shows none of, and
 * both rules read that rectangle as somewhere a finger could land.
 *
 * These run inside the page like the rest, so they may only use DOM APIs and
 * what they are handed.
 *
 * @module
 */

import { describe, type Report } from './structure-report.ts'

/**
 * The part of an element that is actually painted, in viewport coordinates.
 *
 * `getBoundingClientRect` reports where a box would be laid out, not where it
 * is drawn: an element inside a pane that scrolls or clips keeps reporting the
 * full rectangle even when the pane shows none of it. Every ancestor that
 * clips is therefore intersected in, per axis, because `overflow-x` and
 * `overflow-y` clip independently.
 *
 * The walk stops at a `position: fixed` element, itself included: fixed boxes
 * are laid out against the viewport, so an ancestor's overflow does not reach
 * them. That is not a corner case here — the dialog root is fixed.
 * @param node - the element to measure.
 * @returns its drawn edges, which may be empty when nothing is painted.
 */
export function drawnBox(node: Element): {
  readonly top: number
  readonly left: number
  readonly right: number
  readonly bottom: number
} {
  const clipping = new Set(['auto', 'scroll', 'hidden', 'clip'])
  const box = node.getBoundingClientRect()
  let top = box.top
  let left = box.left
  let right = box.right
  let bottom = box.bottom
  let current: Element | null = node
  while (current !== null) {
    const style = getComputedStyle(current)
    if (style.position === 'fixed') break
    const ancestor: Element | null = current.parentElement
    if (ancestor === null) break
    const above = getComputedStyle(ancestor)
    const edges = ancestor.getBoundingClientRect()
    if (clipping.has(above.overflowX)) {
      left = Math.max(left, edges.left)
      right = Math.min(right, edges.right)
    }
    if (clipping.has(above.overflowY)) {
      top = Math.max(top, edges.top)
      bottom = Math.min(bottom, edges.bottom)
    }
    current = ancestor
  }
  return { top, left, right, bottom }
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
export function checkOverlappingTargets(add: Report, limits: { readonly interactive: string }): void {
  const drawn = [...document.querySelectorAll(limits.interactive)]
    .filter((node) => node.closest('[inert]') === null && node instanceof HTMLElement && node.checkVisibility())
    .map((node) => ({ node, box: drawnBox(node) }))
    // Nothing painted, nothing to overlap. A control scrolled out of its own
    // pane still reports a layout box where it would sit if the pane were
    // scrolled to it, and comparing that box against a control outside the
    // pane reported a collision the reader can never meet: at the reflow
    // floor the new-session field read as covering the dialog's own buttons,
    // while a hit test at those pixels returned the button. A control that
    // paints no pixels at all is `target-collapsed`, which is a different
    // rule's finding.
    .filter((entry) => entry.box.right - entry.box.left > 0 && entry.box.bottom - entry.box.top > 0)
  for (const [index, entry] of drawn.entries()) {
    for (const other of drawn.slice(index + 1)) {
      if (other.node.contains(entry.node) || entry.node.contains(other.node)) continue
      const width = Math.min(entry.box.right, other.box.right) - Math.max(entry.box.left, other.box.left)
      const height = Math.min(entry.box.bottom, other.box.bottom) - Math.max(entry.box.top, other.box.top)
      if (width > 1 && height > 1) {
        add('overlapping-targets', `${describe(entry.node)} overlaps ${describe(other.node)}`)
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
export function checkTouchTargets(add: Report, limits: PointerLimits): void {
  const floor = limits.target
  for (const node of document.querySelectorAll(limits.interactive)) {
    // An inert subtree is not reachable, so its geometry is not a target.
    if (node.closest('[inert]') !== null) continue
    if (!(node instanceof HTMLElement) || !node.checkVisibility()) continue
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
