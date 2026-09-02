/**
 * Structural conformance checks that run inside the page.
 *
 * These are the defects a rule engine does not report: markup that nests an
 * interactive element inside another, a heading level skipped, an ARIA
 * reference pointing at nothing, a layout that overflows its viewport, a label
 * clipped by the box it sits in, a group of controls under no name, a pane that
 * scrolls inside a pane that also scrolls, a control drawn over another control,
 * or a touch target below the platform minimum.
 * Each returns a list of offending selectors, so a failure names the element
 * rather than a count.
 *
 * @module
 */

import {
  checkClipping,
  checkHorizontalOverflow,
  checkNestedScroll,
  checkOverlappingTargets,
  scrolls,
} from './structure-layout.ts'
import { describe, type Report, type StructureFinding } from './structure-report.ts'

export type { StructureFinding }

/**
 * What the checks measure against, handed to them rather than closed over.
 *
 * The checks are shipped to the page as their own source text, so a value they
 * close over has to arrive with them. Passing it means the compiler is what
 * guarantees that: a value left behind is a type error here rather than a
 * `ReferenceError` in the browser — or worse, nothing at all, because a
 * transpiler that folds a literal into the text hides the omission until the
 * day the value stops being a literal.
 */
interface StructureLimits {
  /** The smallest target this pointer admits, in CSS pixels. */
  readonly target: number
  /** Elements that take focus or activation without a `tabindex`. */
  readonly interactive: string
}

/** The smallest touch target Apple's Human Interface Guidelines admit, in CSS pixels. */
const MINIMUM_TOUCH_TARGET = 44

/** The smallest target WCAG 2.2 admits for any pointer, in CSS pixels. */
const MINIMUM_POINTER_TARGET = 24

/**
 * Elements that take focus or activation.
 *
 * The role-named forms are here too. The list held only real elements, which
 * was enough while every control in the product was a `<button>` — and would
 * have gone quiet the moment one was not.
 */
const INTERACTIVE = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'summary',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="menuitemradio"]',
  '[role="menuitemcheckbox"]',
  '[role="option"]',
].join(', ')

/**
 * Every id must be unique for an ARIA reference or a label to mean anything.
 * @param add - collects a finding.
 */
function checkDuplicateIds(add: Report): void {
  const seen = new Set<string>()
  for (const node of document.querySelectorAll('[id]')) {
    if (seen.has(node.id)) add('duplicate-id', `${describe(node)} repeats id "${node.id}"`)
    seen.add(node.id)
  }
}

/**
 * An interactive element inside another is invalid, and breaks both the tab
 * order and what assistive technology reports.
 * @param add - collects a finding.
 * @param limits - what the checks measure against.
 */
function checkNestedInteractive(add: Report, limits: StructureLimits): void {
  for (const node of document.querySelectorAll(limits.interactive)) {
    const outer = node.parentElement?.closest(limits.interactive)
    if (outer !== null && outer !== undefined)
      add('nested-interactive', `${describe(node)} sits inside ${describe(outer)}`)
  }
}

/**
 * A skipped heading level leaves a hole in the document outline.
 * @param add - collects a finding.
 */
function checkHeadingOrder(add: Report): void {
  // `offsetParent` is null for anything `position: fixed`, which is the whole
  // of an open drawer and every dialog, so filtering on it excluded exactly the
  // surfaces whose outline is hardest to get right.
  const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter((node) =>
    (node as HTMLElement).checkVisibility(),
  )
  const levels = headings.map((node) => Number(node.tagName.slice(1)))
  if (levels.length === 0) add('no-heading', 'the page has no heading at all')
  const tops = levels.filter((level) => level === 1).length
  if (tops > 1) add('many-h1', `the page has ${String(tops)} h1 elements`)
  // A navigation column that precedes `main` in the document opens at h2, so
  // the page's own heading is the first one inside `main` rather than the first
  // one in the document.
  const lead = headings.find((node) => node.closest('main') !== null)
  if (lead !== undefined && lead.tagName !== 'H1') {
    add('heading-start', `main opens at ${lead.tagName.toLowerCase()} rather than h1`)
  }
  for (const [index, level] of levels.entries()) {
    const previous = levels[index - 1]
    if (previous !== undefined && level > previous + 1) {
      add('heading-skip', `h${String(previous)} is followed by h${String(level)}`)
    }
  }
}

/**
 * An ARIA attribute naming an element that is not there is a broken promise.
 * @param add - collects a finding.
 */
function checkAriaReferences(add: Report): void {
  for (const attribute of ['aria-controls', 'aria-labelledby', 'aria-describedby', 'aria-owns']) {
    for (const node of document.querySelectorAll(`[${attribute}]`)) {
      for (const id of (node.getAttribute(attribute) ?? '').split(/\s+/u).filter(Boolean)) {
        if (document.querySelector(`#${CSS.escape(id)}`) === null) {
          add('dangling-aria-reference', `${describe(node)} ${attribute} points at missing "${id}"`)
        }
      }
    }
  }
}

/**
 * A list role owns list items and nothing else.
 * @param add - collects a finding.
 */
function checkListOwnership(add: Report): void {
  for (const list of document.querySelectorAll('[role="list"]')) {
    for (const child of list.children) {
      if (child.getAttribute('role') !== 'listitem')
        add('list-owns-non-item', `${describe(list)} owns ${describe(child)}`)
    }
  }
  const menuItems = new Set([
    'menuitem',
    'menuitemradio',
    'menuitemcheckbox',
    'none',
    'presentation',
    'separator',
    'group',
  ])
  for (const menu of document.querySelectorAll('[role="menu"]')) {
    for (const child of menu.children) {
      if (!menuItems.has(child.getAttribute('role') ?? ''))
        add('menu-owns-non-item', `${describe(menu)} owns ${describe(child)}`)
    }
  }
  for (const item of document.querySelectorAll('[role="listitem"]')) {
    if (item.parentElement?.getAttribute('role') !== 'list')
      add('item-outside-list', `${describe(item)} sits outside a list`)
  }
}

/**
 * Every control a finger reaches clears the platform minimum.
 * @param add - collects a finding.
 * @param limits - what the checks measure against.
 */
function checkTouchTargets(add: Report, limits: StructureLimits): void {
  const floor = limits.target
  for (const node of document.querySelectorAll(limits.interactive)) {
    // An inert subtree is not reachable, so its geometry is not a target.
    if (node.closest('[inert]') !== null) continue
    const box = node.getBoundingClientRect()
    if (box.width === 0 && box.height === 0) continue
    if (box.height < floor || box.width < floor) {
      add(
        'target-size',
        `${describe(node)} is ${String(Math.round(box.width))}x${String(Math.round(box.height))}, under ${String(floor)}`,
      )
    }
  }
}

/**
 * A group of controls has to say what the group is.
 *
 * axe does not require it: each radio in a `fieldset` already has its own
 * accessible name from its label, so removing the `legend` leaves every rule
 * satisfied and leaves a reader hearing "API key" and "OAuth client" with
 * nothing saying what is being chosen. The same holds for a `radiogroup` or a
 * `group` named by nothing.
 * @param add - collects a finding.
 */
function checkGroupNames(add: Report): void {
  for (const group of document.querySelectorAll('fieldset')) {
    const legend = group.querySelector(':scope > legend')
    const named =
      (legend?.textContent ?? '').trim() !== '' ||
      (group.getAttribute('aria-label') ?? '').trim() !== '' ||
      group.hasAttribute('aria-labelledby')
    if (!named) add('unnamed-group', `${describe(group)} groups controls under no name`)
  }
  for (const group of document.querySelectorAll('[role="radiogroup"], [role="group"]')) {
    const named = (group.getAttribute('aria-label') ?? '').trim() !== '' || group.hasAttribute('aria-labelledby')
    if (!named) add('unnamed-group', `${describe(group)} groups controls under no name`)
  }
}

/**
 * Every structural defect on the current page.
 *
 * Runs in the browser, so it may only use DOM APIs and what it is handed.
 * @param limits - what the checks measure against.
 * @returns every finding, empty when the page conforms.
 */
function findStructureDefects(limits: StructureLimits): StructureFinding[] {
  const findings: StructureFinding[] = []
  const add: Report = (rule, detail) => {
    findings.push({ rule, detail })
  }
  checkDuplicateIds(add)
  checkNestedInteractive(add, limits)
  checkHeadingOrder(add)
  checkAriaReferences(add)
  checkListOwnership(add)
  checkGroupNames(add)
  checkHorizontalOverflow(add)
  checkClipping(add)
  checkNestedScroll(add)
  checkOverlappingTargets(add, limits)
  checkTouchTargets(add, limits)
  return findings
}

/**
 * The source a page evaluates to run these checks.
 *
 * The checks run in the browser, where nothing from this module exists, so
 * their source is emitted and everything they measure against is passed in the
 * call. Nothing is closed over, so nothing can be left behind: what the page
 * receives is exactly what the compiler checked.
 * @param coarsePointer - whether the platform minimum touch target applies.
 * @returns the source to evaluate.
 */
export function structureCheckSource(coarsePointer: boolean): string {
  const limits: StructureLimits = {
    target: coarsePointer ? MINIMUM_TOUCH_TARGET : MINIMUM_POINTER_TARGET,
    interactive: INTERACTIVE,
  }
  const functions = [
    describe,
    checkDuplicateIds,
    checkNestedInteractive,
    checkHeadingOrder,
    checkAriaReferences,
    checkListOwnership,
    checkGroupNames,
    checkHorizontalOverflow,
    scrolls,
    checkClipping,
    checkNestedScroll,
    checkOverlappingTargets,
    checkTouchTargets,
    findStructureDefects,
  ].map(String)
  return `(() => {\n${functions.join('\n\n')}\nreturn findStructureDefects(${JSON.stringify(limits)})\n})()`
}
