/**
 * What a pointer can reach, and what a keyboard is shown.
 *
 * Split from `structure-layout.ts` when it outgrew the size the linter allows
 * one file. These rules share the one question the others do not ask: where a
 * box is *painted*, as against where it is laid out. An element inside a pane
 * that scrolls keeps reporting a rectangle the pane shows none of, and a
 * pointer lands on whatever is drawn there, not on what the layout planned.
 *
 * These run inside the page like the rest, so they may only use DOM APIs and
 * what they are handed.
 *
 * @module
 */

import { reachableTargets } from './structure-elements.ts'
import { describe, pixelLength, type Report } from './structure-report.ts'

/**
 * The part of an element that is actually painted, in viewport coordinates.
 *
 * `getBoundingClientRect` reports where a box would be laid out, not where it
 * is drawn: an element inside a pane that scrolls or clips keeps reporting the
 * full rectangle even when the pane shows none of it. Every ancestor that
 * clips is therefore intersected in, per axis, because `overflow-x` and
 * `overflow-y` clip independently — and the walk stops at a `position: fixed`
 * element, itself included, because fixed boxes are laid out against the
 * viewport and no ancestor's overflow reaches them.
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
  const drawn = reachableTargets(limits)
    .map((node) => ({ node, box: drawnBox(node) }))
    // Nothing painted, nothing to overlap. A control scrolled out of its own
    // pane still reports a layout box where it would sit if the pane were
    // scrolled to it, and comparing that box against a control outside the
    // pane reported a collision the reader can never meet. A control that
    // paints no pixels at all is `target-collapsed`, another rule's finding.
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
 *
 * An inert subtree is not reachable, so its geometry is not a target, and
 * neither is a control that paints nothing — the shared read of what the
 * caller's selector reaches excludes both before either measurement is taken.
 * @param add - collects a finding.
 * @param limits - what the checks measure against.
 */
export function checkTouchTargets(add: Report, limits: PointerLimits): void {
  const floor = limits.target
  for (const node of reachableTargets(limits)) {
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

/**
 * How opaque a computed colour is, 1 when the spelling is not one it can take
 * apart. A ring this cannot decode is a ring the reader can see, and reporting
 * it as invisible would be the check inventing a defect out of its own parser.
 * @param colour - a computed colour.
 * @returns its alpha, from 0 to 1.
 */
export function colourAlpha(colour: string): number {
  const text = colour.trim().toLowerCase()
  if (text === 'transparent') return 0
  const found = /^rgba?\(([^)]*)\)$/u.exec(text)
  if (found === null) return 1
  const last = (found[1] ?? '').split(',')[3]
  return last === undefined ? 1 : Number(last.trim())
}

/** What one control paints, through the properties a focus indicator is made of. */
export interface FocusRing {
  /** The outline's painted width, in CSS pixels. */
  readonly outlineWidth: number
  /** The outline's style, `none` when nothing is drawn. */
  readonly outlineStyle: string
  /** How opaque the outline is, 0 when fully transparent. */
  readonly outlineOpacity: number
  /** The whole `box-shadow` declaration, `none` when nothing is drawn. */
  readonly shadow: string
  /** The border's painted width, in CSS pixels. */
  readonly borderWidth: number
}

/**
 * Read what a control paints, from the computed style of one of its states.
 * @param style - the element's computed style in the state being read.
 * @returns the indicator-bearing properties, resolved for comparison.
 */
export function readFocusRing(style: CSSStyleDeclaration): FocusRing {
  return {
    outlineWidth: pixelLength(style.outlineWidth),
    outlineStyle: style.outlineStyle,
    outlineOpacity: colourAlpha(style.outlineColor),
    shadow: style.boxShadow,
    borderWidth: pixelLength(style.borderWidth),
  }
}

/**
 * Report a control that takes focus without showing it.
 *
 * WCAG 2.4.7 asks for an indicator a reader can see, and 2.4.11 that nothing
 * hides it. Neither is a property of the markup: a control with the user
 * agent's ring switched off and nothing painted back is *correct* in every rule
 * engine's account — labelled, reachable, in the tab order — and a keyboard
 * user cannot tell where they are. The two states are only comparable in the
 * live page, which is what this rule reads.
 *
 * The indicator is an outline or a shadow, painted and not fully transparent,
 * that the resting state does not already have. A border that thickens counts
 * as well: the same square of pixels changes, and the reader sees it. A colour
 * alone does not, because colour is the one channel WCAG 1.4.1 forbids as the
 * sole carrier of information.
 * @param add - collects a finding.
 * @param node - the control that is focused.
 * @param resting - what it painted before it was focused.
 * @param focused - what it paints now.
 */
export function checkFocusRing(add: Report, node: Element, resting: FocusRing, focused: FocusRing): void {
  const outline = focused.outlineStyle !== 'none' && focused.outlineWidth > 0 && focused.outlineOpacity > 0
  const shadow = focused.shadow.trim() !== 'none' && focused.shadow.trim() !== ''
  if (!outline && !shadow) {
    add('focus-invisible', `${describe(node)} takes focus and paints no outline or shadow for it`)
    return
  }
  const shown =
    focused.outlineWidth !== resting.outlineWidth ||
    focused.outlineStyle !== resting.outlineStyle ||
    focused.outlineOpacity !== resting.outlineOpacity ||
    focused.shadow !== resting.shadow ||
    focused.borderWidth > resting.borderWidth
  if (!shown) {
    add(
      'focus-invisible',
      `${describe(node)} paints the same outline focused as unfocused, so focus is nowhere the reader can see it`,
    )
  }
}

/**
 * What covers a control, when every point of it that is on screen is covered.
 *
 * The centre and the four corners of what the control paints are sampled, inset
 * a pixel so a sample cannot land on a neighbour's border, and a blocker is
 * named only when every sample a hit test answered with paints something else.
 * WCAG 2.4.11 asks that the focused component not be *entirely* hidden, so a
 * centre-only test would report a control whose middle is covered while both
 * ends are in plain sight.
 *
 * The control's own ancestors are not blockers. `elementFromPoint` answers with
 * the box under the point, and where a control paints nothing at that point the
 * answer is whatever contains it — a row, a panel, the sidebar — so reading an
 * ancestor as a cover reported every control inside a container as buried under
 * it. A hit test that answers with an ancestor is a sample the control was not
 * hit-testable at, which is a different question from this one.
 * @param node - the control that is focused.
 * @returns the element covering it, or undefined when it is not covered.
 */
export function coveringAt(node: HTMLElement): Element | undefined {
  const box = drawnBox(node)
  const width = box.right - box.left
  const height = box.bottom - box.top
  if (width <= 0 || height <= 0) return undefined
  const points: [number, number][] = [
    [box.left + width / 2, box.top + height / 2],
    [box.left + 1, box.top + 1],
    [box.right - 1, box.top + 1],
    [box.left + 1, box.bottom - 1],
    [box.right - 1, box.bottom - 1],
  ]
  const shown = points.filter(([x, y]) => x >= 0 && y >= 0 && x < window.innerWidth && y < window.innerHeight)
  if (shown.length === 0) return undefined
  const hits = shown.map(([x, y]) => document.elementFromPoint(x, y))
  if (hits.every((hit) => hit === node || node.contains(hit))) return undefined
  return hits.find((hit) => hit !== null && hit !== node && !node.contains(hit) && !hit.contains(node)) ?? undefined
}

/**
 * Every control that takes focus shows that it has it, and is not covered.
 *
 * The check drives the page rather than reading it: a control's focused state
 * exists only while something is focused, so each control is focused in turn,
 * read, and the page put back the way it was found. `preventScroll` keeps the
 * measurement from moving the page out from under the other rules in the same
 * pass, and the opener is restored at the end. A control that does not take
 * focus is not this rule's subject, and neither is a disabled one: focusing it
 * would report the ring it never had a chance to paint.
 * @param add - collects a finding.
 * @param limits - which elements take focus or activation, handed in by the caller.
 */
export function checkFocusVisible(add: Report, limits: { readonly interactive: string }): void {
  const opener = document.activeElement
  for (const node of reachableTargets(limits)) {
    if (node.hasAttribute('disabled')) continue
    // Resting is the state a control is in when it does *not* hold focus, so the
    // read has to happen with focus somewhere else. The control the reader is
    // already on is the one this matters for: read while it holds focus, its two
    // states are one state, and the ring its sheet paints correctly is reported
    // as a ring the reader cannot see — the reader's own tab stop, which is the
    // first control of every surface.
    if (node === document.activeElement) node.blur()
    const resting = readFocusRing(getComputedStyle(node))
    node.focus({ preventScroll: true })
    if (document.activeElement !== node) continue
    checkFocusRing(add, node, resting, readFocusRing(getComputedStyle(node)))
    const blocker = coveringAt(node)
    if (blocker !== undefined) {
      add(
        'focus-obscured',
        `${describe(node)} holds focus under ${describe(blocker)}, which covers every point it paints`,
      )
    }
  }
  if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
}
