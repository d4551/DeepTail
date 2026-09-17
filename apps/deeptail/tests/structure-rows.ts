/**
 * How the boxes of one row are placed: their text alignment, the line they
 * share, and the rhythm a repeated list keeps.
 *
 * A row is placed by its container, so a box a few pixels off its neighbours,
 * or one row set further apart than the rest, is a decision no sheet states.
 * Every box is still labelled, visible and reachable, so nothing else reports
 * it — the row reads as sloppy, and that is the defect a reviewer sees by eye
 * and no rule does.
 *
 * Split from `structure-layout.ts` when that file outgrew the size the linter
 * allows one file: the checks that read what a box hides or what a sheet drew
 * stay there, and the ones that read where a box sits live here.
 *
 * @module
 */

import { laidOutChildren, surfaceElements } from './structure-elements.ts'
import { describe, type Report } from './structure-report.ts'

/**
 * Physical or justified text alignment is an alignment defect at runtime too.
 *
 * The sheet gate refuses a physical or justified text alignment in source. A
 * page can still compute that alignment from an injected sheet or a framework
 * class, and no rule engine reports it: the text is readable and the contrast
 * holds. The logical `start`/`end` spellings follow the writing mode; the
 * physical and justified ones do not.
 *
 * The same question is asked of every property that seats one box against
 * another, not only of the text inside it: a row whose items are justified with
 * `justify-items: left`, a cluster pinned by `float: right` and a grid aligned
 * with `place-items: right` are all spelled against the physical page, so a
 * right-to-left document lays each of them out on the wrong side — while every
 * box in the row is still visible, labelled and reachable, which is why nothing
 * else reports it. The finding names the property and the document's own
 * direction, because the physical reading is the reason it is there.
 *
 * The property list is written inside the function because this source is
 * shipped to the page on its own, so a constant beside it would arrive as a
 * `ReferenceError`.
 * @param add - collects a finding.
 * @param limits - the product surfaces to read.
 */
function checkAlignment(add: Report, limits: { readonly scope: string }): void {
  const aligning = [
    'justify-content',
    'justify-items',
    'justify-self',
    'align-content',
    'align-items',
    'align-self',
    'place-content',
    'place-items',
    'float',
  ]
  const direction = getComputedStyle(document.documentElement).direction
  for (const element of surfaceElements(limits.scope)) {
    const style = getComputedStyle(element)
    const align = style.textAlign
    if (align === 'left' || align === 'right' || align === 'justify') {
      add('alignment', `${describe(element)} uses physical or justified text-align ${align}`)
    }
    for (const property of aligning) {
      const value = style.getPropertyValue(property).trim()
      if (value === '') continue
      if (!value.split(/\s+/u).some((part) => part === 'left' || part === 'right')) continue
      add(
        'alignment',
        `${describe(element)} seats its row with the physical ${property} ${value} in a ${direction} document, where the logical start and end follow the writing mode and this spelling cannot`,
      )
    }
  }
}

/**
 * Sibling boxes laid out on one line have to agree on where that line is.
 *
 * Only a flex or grid container is read, because those are the containers that
 * place children side by side, so a box off the line is the container's doing.
 * A block container stacks its children, and two of its boxes overlapping
 * vertically is a float or a positioned child — layout this rule has no
 * business in. `align-items: baseline` is skipped for the same reason: the
 * engine aligns those baselines itself, whatever heights the boxes have. An
 * out-of-flow child is skipped with them: a fixed or absolutely positioned box
 * is not laid out by the container at all, so it shares no line with its
 * siblings for the container to have misplaced.
 *
 * Every box adrift on the line is reported, not the first one found: the
 * container is what placed them, so a container with three boxes off the line
 * has three defects, and stopping at one names a third of the row.
 *
 * Edges are compared with one CSS pixel of tolerance, the rounding a fractional
 * layout leaves behind at other densities and other text scales.
 * @param add - collects a finding.
 * @param limits - the product surfaces to read.
 */
function checkSiblingAlignment(add: Report, limits: { readonly scope: string }): void {
  const tolerance = 1
  for (const parent of surfaceElements(limits.scope)) {
    const style = getComputedStyle(parent)
    if (!['flex', 'inline-flex', 'grid', 'inline-grid'].includes(style.display)) continue
    if (style.alignItems === 'baseline') continue
    const rows: HTMLElement[][] = []
    for (const child of laidOutChildren(parent)) {
      if (['absolute', 'fixed'].includes(getComputedStyle(child).position)) continue
      const box = child.getBoundingClientRect()
      const seated = rows.find((row) => {
        const lead = row[0]?.getBoundingClientRect()
        if (lead === undefined) return false
        const overlap = Math.min(lead.bottom, box.bottom) - Math.max(lead.top, box.top)
        return overlap > 0 && overlap > Math.min(lead.height, box.height) / 2
      })
      if (seated === undefined) rows.push([child])
      else seated.push(child)
    }
    for (const row of rows) {
      const lead = row[0]
      if (lead === undefined || row.length < 2) continue
      const reference = lead.getBoundingClientRect()
      const middle = reference.top + reference.height / 2
      for (const one of row) {
        if (one === lead) continue
        const box = one.getBoundingClientRect()
        const adrift =
          Math.abs(box.top - reference.top) > tolerance &&
          Math.abs(box.bottom - reference.bottom) > tolerance &&
          Math.abs(box.top + box.height / 2 - middle) > tolerance
        if (adrift) {
          add(
            'sibling-misalignment',
            `${describe(one)} shares ${describe(lead)}'s line without sharing its top, bottom or centre`,
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
      const held = laidOutChildren(list).map((child) => ({ child, box: child.getBoundingClientRect() }))
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

export { checkAlignment, checkListGutters, checkSiblingAlignment }
