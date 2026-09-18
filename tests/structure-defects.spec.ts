/**
 * The markup-defect halves of the page-contract structure checks: what the
 * duplicate-id, nested-interactive, heading, ARIA-reference, list-ownership and
 * group-name checks report for markup built right here.
 *
 * These checks are module-private in the page source the browser evaluates, so
 * they are exported for this suite — the face widening `structure.ts`
 * documents — and driven under happy-dom for the reason `tests/dom.ts`
 * records: the markup a case builds is the part a mutation run can judge, and
 * the browser suites remain the account of what a real page does with it. The
 * geometry halves are held in `structure-helpers.spec.ts` and its siblings, the
 * shell and vocabulary halves in `structure-page-shell.spec.ts` and
 * `structure-vocabulary.spec.ts`, and the entry point in
 * `structure-dispatch.spec.ts`.
 */

import { beforeEach, expect, it } from 'bun:test'
import {
  checkAriaReferences,
  checkDuplicateIds,
  checkGroupNames,
  checkHeadingOrder,
  checkListOwnership,
  checkNestedInteractive,
} from '../apps/deeptail/tests/structure.ts'
import { typographyRamp } from '../apps/deeptail/tests/structure-emit.ts'
import { resetDocument } from './dom.ts'
import { findingsOn } from './structure-double.ts'

/**
 * The ladder the shipped token sheet declares, read once for the limits below.
 *
 * The entry point hands every check the same limits, so the typography ramp
 * travels with the floors and the vocabulary; reading it here rather than
 * restating rungs keeps the one ladder the one ladder.
 */
const TYPOGRAPHY = await typographyRamp()

/** What the markup checks measure against, where they measure anything. */
const LIMITS = {
  target: 24,
  interactive: 'a[href], button',
  scope: '',
  vocabulary: [],
  typography: TYPOGRAPHY,
}

beforeEach(() => {
  resetDocument()
})

it('reports a repeated id, and stays silent once every id is unique', () => {
  const first = document.createElement('div')
  first.id = 'session-pane'
  const second = document.createElement('div')
  second.id = 'picker-pane'
  expect(findingsOn(checkDuplicateIds, () => document.body.append(first, second))).toEqual([])
  second.id = 'session-pane'
  expect(findingsOn(checkDuplicateIds, () => document.body.append(second, first))).toEqual([
    { rule: 'duplicate-id', detail: 'div#session-pane repeats id "session-pane"' },
  ])
})

it('reports a control nested in another, and stays silent for siblings', () => {
  const link = document.createElement('a')
  link.setAttribute('href', '/sessions')
  const button = document.createElement('button')
  expect(
    findingsOn(
      (add) => checkNestedInteractive(add, LIMITS),
      () => document.body.append(link, button),
    ),
  ).toEqual([])
  const card = document.createElement('a')
  card.setAttribute('href', '/sessions')
  card.append(button)
  expect(
    findingsOn(
      (add) => checkNestedInteractive(add, LIMITS),
      () => document.body.append(card),
    ),
  ).toEqual([{ rule: 'nested-interactive', detail: 'button sits inside a' }])
})

it('reports a page with no heading at all, and stays silent once one exists', () => {
  const heading = document.createElement('h1')
  heading.textContent = 'Sessions'
  expect(findingsOn(checkHeadingOrder, () => document.body.append(heading))).toEqual([])
  expect(findingsOn(checkHeadingOrder, () => document.body.replaceChildren())).toEqual([
    { rule: 'no-heading', detail: 'the page has no heading at all' },
  ])
})

it('reports a page with several h1 elements, and stays silent for one', () => {
  const sessionsHeading = document.createElement('h1')
  sessionsHeading.textContent = 'Sessions'
  const pickerHeading = document.createElement('h1')
  pickerHeading.textContent = 'Picker'
  expect(findingsOn(checkHeadingOrder, () => document.body.append(sessionsHeading))).toEqual([])
  expect(findingsOn(checkHeadingOrder, () => document.body.append(sessionsHeading, pickerHeading))).toEqual([
    { rule: 'many-h1', detail: 'the page has 2 h1 elements' },
  ])
})

it('reports a main that opens below h1, and stays silent when it opens at h1', () => {
  const main = document.createElement('main')
  const heading = document.createElement('h1')
  heading.textContent = 'Sessions'
  main.append(heading)
  const skipped = document.createElement('h2')
  skipped.textContent = 'Roster'
  expect(findingsOn(checkHeadingOrder, () => document.body.append(main))).toEqual([])
  expect(
    findingsOn(checkHeadingOrder, () => {
      main.replaceChildren(skipped)
      document.body.append(main)
    }),
  ).toEqual([{ rule: 'heading-start', detail: 'main opens at h2 rather than h1' }])
})

it('reports a heading level skipped, and stays silent for a stepped outline', () => {
  const first = document.createElement('h1')
  first.textContent = 'Topics'
  const second = document.createElement('h2')
  second.textContent = 'DeepTail'
  const third = document.createElement('h3')
  third.textContent = 'Machines'
  expect(findingsOn(checkHeadingOrder, () => document.body.append(first, second, third))).toEqual([])
  expect(findingsOn(checkHeadingOrder, () => document.body.append(first, third))).toEqual([
    { rule: 'heading-skip', detail: 'h1 is followed by h3' },
  ])
})

it('reads the outline the reader hears, so a heading the engine hides is not a step in it', () => {
  // The rule is painted through a sheet rather than an element style, which is
  // an inline style even in a fixture: the case measures what a class rule does.
  const rule = document.createElement('style')
  rule.textContent = '.off-page { display: none; }'
  document.head.append(rule)
  const first = document.createElement('h1')
  first.textContent = 'Topics'
  const hidden = document.createElement('h2')
  hidden.textContent = 'DeepTail'
  hidden.className = 'off-page'
  hidden.id = 'hidden-step'
  const third = document.createElement('h3')
  third.textContent = 'Machines'
  const shown = document.createElement('div')
  shown.dataset['deeptailDialog'] = ''
  const fixed = document.createElement('h2')
  fixed.textContent = 'Roster'
  shown.append(fixed)
  document.body.append(first, hidden, third, shown)
  // The h2 the engine hides is not a step the reader hears, so the heading
  // after the h1 is the h3 and the outline skips; the h2 inside a dialog is
  // read even though `offsetParent` is null for everything `position: fixed`.
  expect(findingsOn(checkHeadingOrder, () => document.body.append(first, hidden, third, shown))).toEqual([
    { rule: 'heading-skip', detail: 'h1 is followed by h3' },
  ])
  expect(hidden.checkVisibility()).toBe(false)
})

it('reports an ARIA reference pointing at nothing, and stays silent while every target exists', () => {
  const named = document.createElement('div')
  named.id = 'session-pane'
  const labelled = document.createElement('div')
  labelled.setAttribute('aria-labelledby', 'session-pane')
  const described = document.createElement('div')
  described.setAttribute('aria-describedby', 'session-pane')
  const owned = document.createElement('div')
  owned.setAttribute('aria-owns', 'session-pane')
  const combined = document.createElement('div')
  combined.setAttribute('aria-labelledby', ' session-pane ')
  expect(
    findingsOn(checkAriaReferences, () => document.body.append(named, labelled, described, owned, combined)),
  ).toEqual([])
  const controls = document.createElement('div')
  controls.setAttribute('aria-controls', 'missing-pane')
  expect(
    findingsOn(checkAriaReferences, () => document.body.append(controls, labelled, described, owned, combined)),
  ).toEqual([
    { rule: 'dangling-aria-reference', detail: 'div aria-controls points at missing "missing-pane"' },
    { rule: 'dangling-aria-reference', detail: 'div aria-labelledby points at missing "session-pane"' },
    { rule: 'dangling-aria-reference', detail: 'div aria-labelledby points at missing "session-pane"' },
    { rule: 'dangling-aria-reference', detail: 'div aria-describedby points at missing "session-pane"' },
    { rule: 'dangling-aria-reference', detail: 'div aria-owns points at missing "session-pane"' },
  ])
})

it('reports a list owning a non-item, and stays silent for a list item', () => {
  const list = document.createElement('div')
  list.id = 'machines'
  list.setAttribute('role', 'list')
  const item = document.createElement('div')
  item.id = 'machines-row'
  item.setAttribute('role', 'listitem')
  list.append(item)
  expect(findingsOn(checkListOwnership, () => document.body.append(list))).toEqual([])
  item.removeAttribute('role')
  expect(findingsOn(checkListOwnership, () => document.body.append(list))).toEqual([
    { rule: 'list-owns-non-item', detail: 'div#machines owns div#machines-row' },
  ])
})

it('reports a menu owning a non-item, and stays silent for the roles a menu admits', () => {
  const menu = document.createElement('div')
  menu.id = 'actions'
  menu.setAttribute('role', 'menu')
  const entry = document.createElement('div')
  entry.id = 'actions-entry'
  entry.setAttribute('role', 'menuitem')
  const separator = document.createElement('div')
  separator.id = 'actions-separator'
  separator.setAttribute('role', 'separator')
  menu.append(entry, separator)
  expect(findingsOn(checkListOwnership, () => document.body.append(menu))).toEqual([])
  entry.removeAttribute('role')
  expect(findingsOn(checkListOwnership, () => document.body.append(menu))).toEqual([
    { rule: 'menu-owns-non-item', detail: 'div#actions owns div#actions-entry' },
  ])
})

it('reports a list item outside a list, and stays silent for one inside it', () => {
  const list = document.createElement('div')
  list.setAttribute('role', 'list')
  const item = document.createElement('div')
  item.id = 'machines-row'
  item.setAttribute('role', 'listitem')
  list.append(item)
  expect(findingsOn(checkListOwnership, () => document.body.append(list))).toEqual([])
  expect(findingsOn(checkListOwnership, () => document.body.append(item))).toEqual([
    { rule: 'item-outside-list', detail: 'div#machines-row sits outside a list' },
  ])
})

it('reports a fieldset, a radiogroup, and a group named by nothing, and stays silent once named', () => {
  const fieldset = document.createElement('fieldset')
  fieldset.id = 'auth'
  const blank = document.createElement('fieldset')
  blank.id = 'blank'
  const blankLegend = document.createElement('legend')
  blankLegend.textContent = '   '
  blank.append(blankLegend)
  const radios = document.createElement('div')
  radios.id = 'transport'
  radios.setAttribute('role', 'radiogroup')
  const group = document.createElement('div')
  group.id = 'advanced'
  group.setAttribute('role', 'group')
  expect(findingsOn(checkGroupNames, () => document.body.append(fieldset, blank, radios, group))).toEqual([
    { rule: 'unnamed-group', detail: 'fieldset#auth groups controls under no name' },
    { rule: 'unnamed-group', detail: 'fieldset#blank groups controls under no name' },
    { rule: 'unnamed-group', detail: 'div#transport groups controls under no name' },
    { rule: 'unnamed-group', detail: 'div#advanced groups controls under no name' },
  ])
  const legend = document.createElement('legend')
  legend.textContent = 'Authentication'
  fieldset.append(legend)
  blankLegend.textContent = 'Credentials'
  radios.setAttribute('aria-label', 'Transport')
  const advancedName = document.createElement('div')
  advancedName.id = 'advanced-name'
  group.setAttribute('aria-labelledby', 'advanced-name')
  expect(findingsOn(checkGroupNames, () => document.body.append(fieldset, blank, radios, group, advancedName))).toEqual(
    [],
  )
})
