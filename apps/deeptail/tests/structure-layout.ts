/**
 * The structural checks that measure boxes and read computed declarations
 * rather than judge markup.
 *
 * Geometry is the half of conformance no rule engine reports: an element can be
 * correctly labelled, correctly nested and still be scrolled out of reach, cut
 * off by the box it sits in, or laid a few pixels off the row it belongs to.
 * The same read answers the questions a stylesheet settles rather than a
 * document does: whether a reader who asked for less motion gets it, and how
 * far text a reader enlarges has to travel before it is lost. These run inside
 * the page like the rest, so they may only use DOM APIs and what they are
 * handed.
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
 *
 * Both axes are read, because the same defect has two. A reader who raises
 * their text spacing to the sizes WCAG 1.4.12 names, or their text size to the
 * 200% of 1.4.4, does not make a box wider — they make the text inside it
 * taller, so the line that leaves a fixed-height box is cut off by exactly the
 * declaration that used to be a harmless `overflow: hidden`. Sideways was the
 * only axis this rule read while every sheet here laid its text on one line;
 * the block axis is the half those two criteria actually break.
 *
 * A single nowrap line carrying an ellipsis is the one deliberate truncation:
 * the reader is told the text continues. The same declaration on a box that
 * wraps tells them nothing, so it is still a loss.
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
 * The sheet gate refuses a physical or justified text alignment in source. A
 * page can still compute that alignment from an injected sheet or a framework
 * class, and no rule engine reports it: the text is readable and the contrast
 * holds. The logical `start`/`end` spellings follow the writing mode; the
 * physical and justified ones do not.
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
 * Sibling boxes laid out on one line have to agree on where that line is.
 *
 * A row is placed by its container, so a box a few pixels off its neighbours is
 * a decision no sheet states: a control nudged by a margin, a label dropped by
 * its own line box, an icon centred beside something taller. Each box is still
 * labelled, still inside its viewport, still reachable, so no rule engine and
 * no other check here reports it — the row simply reads as sloppy, which is the
 * kind of defect a reviewer notices by eye and nothing else does.
 *
 * Only a flex or grid container is read, because those are the containers that
 * place children side by side, so a box off the line is the container's doing.
 * A block container stacks its children, and two of its boxes that happen to
 * overlap vertically are a float or a positioned child — layout this rule has
 * no business in. `align-items: baseline` is skipped for the same reason: the
 * engine aligns those baselines itself, whatever heights the boxes have, so a
 * row under it cannot be off the line.
 *
 * Edges are compared with one CSS pixel of tolerance, the rounding a fractional
 * layout leaves behind at other densities and other text scales.
 * @param add - collects a finding.
 * @param limits - the product surfaces to read.
 */
function checkSiblingAlignment(add: Report, limits: { readonly scope: string }): void {
  const tolerance = 1
  const edgesOf = (node: Element): number[] => {
    const box = node.getBoundingClientRect()
    return [box.top, box.bottom, box.top + box.height / 2]
  }
  const near = (one: number, other: number): boolean => Math.abs(one - other) <= tolerance
  const sharesEdge = (one: readonly number[], other: readonly number[]): boolean =>
    one.some((edge, index) => near(edge, other[index] ?? edge))
  const sharesLine = (one: Element, other: Element): boolean => {
    const held = one.getBoundingClientRect()
    const box = other.getBoundingClientRect()
    const overlap = Math.min(held.bottom, box.bottom) - Math.max(held.top, box.top)
    return overlap > 0 && overlap > Math.min(held.height, box.height) / 2
  }
  for (const root of document.querySelectorAll(limits.scope)) {
    for (const parent of [root, ...root.querySelectorAll('*')]) {
      const style = getComputedStyle(parent)
      if (!['flex', 'inline-flex', 'grid', 'inline-grid'].includes(style.display)) continue
      if (style.alignItems === 'baseline') continue
      const rows: HTMLElement[][] = []
      for (const child of parent.children) {
        if (!(child instanceof HTMLElement) || !child.checkVisibility()) continue
        if (child.getBoundingClientRect().height <= 0) continue
        const seated = rows.find((row) => {
          const lead = row[0]
          return lead !== undefined && sharesLine(lead, child)
        })
        if (seated === undefined) rows.push([child])
        else seated.push(child)
      }
      for (const row of rows) {
        const lead = row[0]
        if (lead === undefined || row.length < 2) continue
        const reference = edgesOf(lead)
        const adrift = row.find((one) => !sharesEdge(reference, edgesOf(one)))
        if (adrift !== undefined) {
          add(
            'sibling-misalignment',
            `${describe(adrift)} shares ${describe(lead)}'s line without sharing its top, bottom or centre`,
          )
        }
      }
    }
  }
}

/**
 * A repeated list spaces its rows the same way down its whole length.
 *
 * A list is a promise about a set, so its spacing is part of what it says: the
 * gap between two rows is the rhythm the reader counts them by. One row set
 * further from its neighbour than the rest reads as a grouping that is not
 * there — the row below looks like it belongs to something else — and no rule
 * engine reports it, because every row is correctly labelled, correctly ordered
 * and correctly spaced in the sheet. The defect appears only where the cascade
 * lands differently on one row, which is exactly what a live measurement sees
 * and a sheet gate cannot.
 *
 * Gaps are measured between the boxes consecutive rows paint, and compared with
 * the list's own first gap: a list is free to choose its rhythm, and this rule
 * asks only that it keep to it.
 * @param add - collects a finding.
 * @param limits - the product surfaces to read.
 */
function checkListGutters(add: Report, limits: { readonly scope: string }): void {
  const tolerance = 1
  for (const root of document.querySelectorAll(limits.scope)) {
    for (const list of root.querySelectorAll('[role="list"]')) {
      const held = [...list.children]
        .filter((child): child is HTMLElement => child instanceof HTMLElement && child.checkVisibility())
        .map((child) => ({ child, box: child.getBoundingClientRect() }))
        .filter((entry) => entry.box.height > 0)
      const gaps: { readonly item: HTMLElement; readonly gap: number }[] = []
      for (const [index, entry] of held.entries()) {
        const above = held[index - 1]
        if (above !== undefined) gaps.push({ item: entry.child, gap: entry.box.top - above.box.bottom })
      }
      const rhythm = gaps[0]?.gap
      if (rhythm === undefined) continue
      for (const { item, gap } of gaps) {
        if (Math.abs(gap - rhythm) <= tolerance) continue
        add(
          'inconsistent-gutter',
          `${describe(item)} sits ${String(Math.round(gap))}px below the row above, where the list's own rhythm is ${String(Math.round(rhythm))}px`,
        )
      }
    }
  }
}

/**
 * A reader who asked for less motion gets less motion.
 *
 * `prefers-reduced-motion` is the one setting a stylesheet cannot honour by
 * itself: the sheet declares what motion costs, and every surface that moves
 * has to pay for it out of the same budget. A transition written with a literal
 * duration is a surface that never reads the budget, so it keeps moving at full
 * speed for exactly the readers the setting exists for, and nothing reports it:
 * the page is correct, accessible and still animating.
 *
 * The budget is the page's own `--ds-transition-duration`, read from the live
 * document rather than assumed, so the rule measures against whatever the sheet
 * declares for this reader: under `reduce` that token holds the near-zero value
 * the sheet substitutes, and a surface that reads it cannot exceed it. A page
 * that names no budget leaves this check nothing to measure against, and every
 * duration above zero is then over it — stated in the finding, because that is
 * the fact the reader is living with.
 * @param add - collects a finding.
 * @param limits - the product surfaces to read.
 */
function checkReducedMotion(add: Report, limits: { readonly scope: string }): void {
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const declared = getComputedStyle(document.documentElement).getPropertyValue('--ds-transition-duration').trim()
  const seconds = (value: string): number[] =>
    value
      .split(',')
      .map((one) => {
        const text = one.trim()
        if (text.endsWith('ms')) return Number.parseFloat(text) / 1000
        return text.endsWith('s') ? Number.parseFloat(text) : Number.NaN
      })
      .filter((one) => Number.isFinite(one))
  const budget = seconds(declared)[0] ?? 0
  const report = (node: Element, what: string, durations: readonly number[]): void => {
    for (const duration of durations) {
      if (duration <= budget) continue
      add(
        'motion-not-reduced',
        `${describe(node)} runs a ${what} of ${String(duration)}s while the reader asked for less motion, where the page's own budget is ${String(budget)}s`,
      )
    }
  }
  for (const root of document.querySelectorAll(limits.scope)) {
    for (const element of [root, ...root.querySelectorAll('*')]) {
      const style = getComputedStyle(element)
      report(element, 'transition', seconds(style.transitionDuration))
      report(element, 'transition delay', seconds(style.transitionDelay))
      if (style.animationName !== 'none') report(element, 'animation', seconds(style.animationDuration))
    }
  }
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

export {
  checkAlignment,
  checkClipping,
  checkGrid,
  checkHorizontalOverflow,
  checkListGutters,
  checkNestedScroll,
  checkReducedMotion,
  checkSiblingAlignment,
  gridAncestor,
  scrolls,
}
