/**
 * Structural conformance checks that run inside the page.
 *
 * These are the defects a rule engine does not report: markup that nests an
 * interactive element inside another, a heading level skipped, an ARIA
 * reference pointing at nothing, a layout that overflows its viewport, a label
 * clipped by the box it sits in, or a touch target below the platform minimum.
 * Each returns a list of offending selectors, so a failure names the element
 * rather than a count.
 *
 * @module
 */

/** One structural defect, as the page reports it. */
export interface StructureFinding {
  readonly rule: string
  readonly detail: string
}

/** The smallest touch target Apple's Human Interface Guidelines admit, in CSS pixels. */
const MINIMUM_TOUCH_TARGET = 44

/** The smallest target WCAG 2.2 admits for any pointer, in CSS pixels. */
const MINIMUM_POINTER_TARGET = 24

/** Elements that take focus or activation without a `tabindex`. */
const INTERACTIVE = 'a[href], button, input, select, textarea, summary, [contenteditable="true"]'

/**
 * A short, readable path to an element, for a failure message.
 * @param node - the element to describe.
 * @returns tag, id and classes.
 */
function describe(node: Element): string {
  const id = node.id === '' ? '' : `#${node.id}`
  const classes = node.classList.length > 0 ? `.${[...node.classList].join('.')}` : ''
  return `${node.tagName.toLowerCase()}${id}${classes}`
}

/** Collects one finding. */
type Report = (rule: string, detail: string) => void

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
 */
function checkNestedInteractive(add: Report): void {
  for (const node of document.querySelectorAll(INTERACTIVE)) {
    const outer = node.parentElement?.closest(INTERACTIVE)
    if (outer !== null && outer !== undefined)
      add('nested-interactive', `${describe(node)} sits inside ${describe(outer)}`)
  }
}

/**
 * A skipped heading level leaves a hole in the document outline.
 * @param add - collects a finding.
 */
function checkHeadingOrder(add: Report): void {
  const levels = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
    .filter((node) => (node as HTMLElement).offsetParent !== null)
    .map((node) => Number(node.tagName.slice(1)))
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
  for (const node of document.querySelectorAll('button, .session-title, .row-label, .group-name, .main-title')) {
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
 * Every control a finger reaches clears the platform minimum.
 * @param add - collects a finding.
 */
function checkTouchTargets(add: Report, coarsePointer: boolean): void {
  const floor = coarsePointer ? MINIMUM_TOUCH_TARGET : MINIMUM_POINTER_TARGET
  for (const node of document.querySelectorAll(INTERACTIVE)) {
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
 * Every structural defect on the current page.
 *
 * Runs in the browser, so it may only use DOM APIs.
 * @param coarsePointer - whether the platform minimum touch target applies.
 * @returns every finding, empty when the page conforms.
 */
function findStructureDefects(coarsePointer: boolean): StructureFinding[] {
  const findings: StructureFinding[] = []
  const add: Report = (rule, detail) => {
    findings.push({ rule, detail })
  }
  checkDuplicateIds(add)
  checkNestedInteractive(add)
  checkHeadingOrder(add)
  checkAriaReferences(add)
  checkListOwnership(add)
  checkHorizontalOverflow(add)
  checkClipping(add)
  checkTouchTargets(add, coarsePointer)
  return findings
}

/**
 * The source a page evaluates to run these checks.
 *
 * The checks run in the browser, where nothing from this module exists, so the
 * source of every constant and helper they need is emitted alongside the call.
 * That is what lets them be written as ordinary typed functions rather than one
 * closure that may reference nothing outside itself.
 * @param coarsePointer - whether the platform minimum touch target applies.
 * @returns the source to evaluate.
 */
export function structureCheckSource(coarsePointer: boolean): string {
  const constants = [
    `const MINIMUM_TOUCH_TARGET = ${String(MINIMUM_TOUCH_TARGET)}`,
    `const INTERACTIVE = ${JSON.stringify(INTERACTIVE)}`,
  ]
  const functions = [
    describe,
    checkDuplicateIds,
    checkNestedInteractive,
    checkHeadingOrder,
    checkAriaReferences,
    checkListOwnership,
    checkHorizontalOverflow,
    checkClipping,
    checkTouchTargets,
    findStructureDefects,
  ].map(String)
  return `${[...constants, ...functions].join('\n\n')}\nreturn findStructureDefects(${String(coarsePointer)})`
}
