/**
 * Structural conformance checks that run inside the page.
 *
 * These are the defects a rule engine does not report: markup that nests an
 * interactive element inside another, a heading level skipped, an ARIA
 * reference pointing at nothing, a layout that overflows its viewport, a label
 * clipped by the box it sits in, a group of controls under no name, a pane that
 * scrolls inside a pane that also scrolls, a control drawn over another control,
 * a class outside the shipped vocabulary, or a touch target below the platform
 * minimum.
 *
 * The same pass answers the questions that only exist while the page is live:
 * whether a control that takes focus shows it and is not buried under something
 * else, whether a reader who asked for less motion got it, whether a row of
 * siblings agrees on where its line is, whether a repeated list keeps its own
 * rhythm, whether every rendered type size lands on a rung of the shipped
 * scale, whether every control the page draws is wired to one action the
 * shipped registry declares, and whether each dialog and mask came from the
 * frame that owns them. Each returns a list of offending selectors, so a failure
 * names the element rather than a count.
 *
 * This module is the dispatcher: the markup checks the page runs are declared
 * here, and every check that measures a box lives in the module named for what
 * it measures — `structure-layout.ts` for what a box does with its content,
 * `structure-scroll.ts` for what scrolls, `structure-rows.ts` for where a row's
 * boxes sit, `structure-pointer.ts` for what a pointer reaches and what a
 * keyboard is shown, `structure-shell.ts` for what the document seats and what
 * its controls are wired to, and `structure-elements.ts` for the reads more than
 * one of them makes.
 *
 * @module
 */

import { checkClipping, checkGrid } from './structure-layout.ts'
import { checkFocusVisible, checkOverlappingTargets, checkTouchTargets } from './structure-pointer.ts'
import type { TypographyRamp } from './structure-ramp.ts'
import { describe, type Report, type StructureFinding } from './structure-report.ts'
import { checkAlignment, checkListGutters, checkSiblingAlignment } from './structure-rows.ts'
import { checkHorizontalOverflow, checkNestedScroll } from './structure-scroll.ts'
import { checkDialogContract, checkInlineScripts, checkOneOffScripts, checkShell } from './structure-shell.ts'
import { checkTypography } from './structure-typography.ts'
import { checkClassVocabulary, checkReducedMotion } from './structure-vocabulary.ts'

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
 *
 * Two of these are optional because the suites that build markup by hand call
 * the checks without them: an action registry and a mount are facts about a
 * page that was seated, and only the pass that measures a real one has them.
 * Every one of the checks that reads them says what it does with none — the
 * control wiring reads an empty registry, which reports every control naming an
 * action, and the mount rule has no mount to measure against and stays quiet.
 */
interface StructureLimits {
  /** The smallest target this pointer admits, in CSS pixels. */
  readonly target: number
  /** Elements that take focus or activation without a `tabindex`. */
  readonly interactive: string
  /**
   * The product surfaces the vocabulary check reads, as one selector list.
   *
   * The harness client shares the document and styles its own UI with classes
   * no sheet here names, so the check reads only what this product drew.
   */
  readonly scope: string
  /** Every class name the shipped stylesheets define. */
  readonly vocabulary: readonly string[]
  /** The type ladder the shipped token sheet declares, resolved to pixels. */
  readonly typography: TypographyRamp
  /** Every action marker the shipped action registry declares. */
  readonly actions?: readonly string[]
  /** The element the shipped document mounts its product surfaces in. */
  readonly mount?: string
}

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
  const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter(
    (node) => node instanceof HTMLElement && node.checkVisibility(),
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
 *
 * The focus rule is last because it is the one check that drives the page: it
 * focuses every control in turn and puts focus back where it found it, so
 * everything measured before it is measured on the page as the reader left it.
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
  checkClassVocabulary(add, limits)
  checkTypography(add, limits)
  checkHorizontalOverflow(add)
  checkClipping(add)
  checkNestedScroll(add)
  checkOverlappingTargets(add, limits)
  checkTouchTargets(add, limits)
  checkAlignment(add, limits)
  checkSiblingAlignment(add, limits)
  checkListGutters(add, limits)
  checkGrid(add, limits)
  checkShell(add, limits)
  checkDialogContract(add, limits)
  checkInlineScripts(add, limits)
  checkOneOffScripts(add, limits)
  checkReducedMotion(add, limits)
  checkFocusVisible(add, limits)
  return findings
}

/**
 * The markup checks and the page-contract entry point, exported for the unit
 * chain.
 *
 * The page receives these as their own source text, so nothing here may close
 * over anything; the unit suite drives them directly under happy-dom for the
 * reason `tests/dom.ts` records — the markup a case builds is the part a
 * mutation run can judge, and the browser suites remain the account of what a
 * real page does with the same markup. The geometry, shell, and vocabulary
 * halves are exported from their own modules for the same reason.
 */
export {
  checkAriaReferences,
  checkDuplicateIds,
  checkGroupNames,
  checkHeadingOrder,
  checkListOwnership,
  checkNestedInteractive,
  findStructureDefects,
}
