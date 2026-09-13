/**
 * The markup-defect halves of the page-contract structure checks: what the
 * duplicate-id, nested-interactive, heading, ARIA-reference, list-ownership,
 * and group-name checks report for markup built right here, and that the
 * page-contract entry point reads a conforming page as conforming while wiring
 * every check into one report.
 *
 * These checks are module-private in the page source the browser evaluates, so
 * they are exported for this suite — the face widening `structure.ts`
 * documents — and driven under happy-dom for the reason `tests/dom.ts`
 * records: the markup a case builds is the part a mutation run can judge, and
 * the browser suites remain the account of what a real page does with it. The
 * geometry halves are held in `structure-helpers.spec.ts`, the shell and
 * vocabulary halves in `structure-page.spec.ts`.
 */

import { beforeEach, expect, it } from 'bun:test'
import {
  checkAriaReferences,
  checkDuplicateIds,
  checkGroupNames,
  checkHeadingOrder,
  checkListOwnership,
  checkNestedInteractive,
  findStructureDefects,
} from '../apps/deeptail/tests/structure.ts'
import { resetDocument } from './dom.ts'
import { collector } from './structure-double.ts'

beforeEach(() => {
  resetDocument()
})

it('reports a repeated id, and stays silent once every id is unique', () => {
  const first = document.createElement('div')
  first.id = 'session-pane'
  const second = document.createElement('div')
  second.id = 'picker-pane'
  document.body.append(first, second)
  const silent = collector()
  checkDuplicateIds(silent.add)
  expect(silent.findings).toEqual([])
  second.id = 'session-pane'
  const { findings, add } = collector()
  checkDuplicateIds(add)
  expect(findings).toEqual([{ rule: 'duplicate-id', detail: 'div#session-pane repeats id "session-pane"' }])
})

it('reports a control nested in another, and stays silent for siblings', () => {
  const link = document.createElement('a')
  link.setAttribute('href', '/sessions')
  const button = document.createElement('button')
  document.body.append(link, button)
  const silent = collector()
  checkNestedInteractive(silent.add, { target: 24, interactive: 'a[href], button', scope: '', vocabulary: [] })
  expect(silent.findings).toEqual([])
  const card = document.createElement('a')
  card.setAttribute('href', '/sessions')
  card.append(button)
  document.body.append(card)
  const { findings, add } = collector()
  checkNestedInteractive(add, { target: 24, interactive: 'a[href], button', scope: '', vocabulary: [] })
  expect(findings).toEqual([{ rule: 'nested-interactive', detail: 'button sits inside a' }])
})

it('reports a page with no heading at all, and stays silent once one exists', () => {
  const heading = document.createElement('h1')
  heading.textContent = 'Sessions'
  document.body.append(heading)
  const silent = collector()
  checkHeadingOrder(silent.add)
  expect(silent.findings).toEqual([])
  heading.remove()
  const { findings, add } = collector()
  checkHeadingOrder(add)
  expect(findings).toEqual([{ rule: 'no-heading', detail: 'the page has no heading at all' }])
})

it('reports a page with several h1 elements, and stays silent for one', () => {
  const first = document.createElement('h1')
  first.textContent = 'Sessions'
  document.body.append(first)
  const silent = collector()
  checkHeadingOrder(silent.add)
  expect(silent.findings).toEqual([])
  const second = document.createElement('h1')
  second.textContent = 'Picker'
  document.body.append(second)
  const { findings, add } = collector()
  checkHeadingOrder(add)
  expect(findings).toEqual([{ rule: 'many-h1', detail: 'the page has 2 h1 elements' }])
})

it('reports a main that opens below h1, and stays silent when it opens at h1', () => {
  const main = document.createElement('main')
  const heading = document.createElement('h1')
  heading.textContent = 'Sessions'
  main.append(heading)
  document.body.append(main)
  const silent = collector()
  checkHeadingOrder(silent.add)
  expect(silent.findings).toEqual([])
  const skipped = document.createElement('h2')
  skipped.textContent = 'Roster'
  main.replaceChildren(skipped)
  const { findings, add } = collector()
  checkHeadingOrder(add)
  expect(findings).toEqual([{ rule: 'heading-start', detail: 'main opens at h2 rather than h1' }])
})

it('reports a heading level skipped, and stays silent for a stepped outline', () => {
  const first = document.createElement('h1')
  first.textContent = 'Topics'
  const second = document.createElement('h2')
  second.textContent = 'DeepTail'
  const third = document.createElement('h3')
  third.textContent = 'Machines'
  document.body.append(first, second, third)
  const silent = collector()
  checkHeadingOrder(silent.add)
  expect(silent.findings).toEqual([])
  second.remove()
  const { findings, add } = collector()
  checkHeadingOrder(add)
  expect(findings).toEqual([{ rule: 'heading-skip', detail: 'h1 is followed by h3' }])
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
  document.body.append(named, labelled, described, owned, combined)
  const silent = collector()
  checkAriaReferences(silent.add)
  expect(silent.findings).toEqual([])
  const controls = document.createElement('div')
  controls.setAttribute('aria-controls', 'missing-pane')
  document.body.append(controls)
  named.remove()
  const { findings, add } = collector()
  checkAriaReferences(add)
  expect(findings).toEqual([
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
  document.body.append(list)
  const silent = collector()
  checkListOwnership(silent.add)
  expect(silent.findings).toEqual([])
  item.removeAttribute('role')
  const { findings, add } = collector()
  checkListOwnership(add)
  expect(findings).toEqual([{ rule: 'list-owns-non-item', detail: 'div#machines owns div#machines-row' }])
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
  document.body.append(menu)
  const silent = collector()
  checkListOwnership(silent.add)
  expect(silent.findings).toEqual([])
  entry.removeAttribute('role')
  const { findings, add } = collector()
  checkListOwnership(add)
  expect(findings).toEqual([{ rule: 'menu-owns-non-item', detail: 'div#actions owns div#actions-entry' }])
})

it('reports a list item outside a list, and stays silent for one inside it', () => {
  const list = document.createElement('div')
  list.setAttribute('role', 'list')
  const item = document.createElement('div')
  item.id = 'machines-row'
  item.setAttribute('role', 'listitem')
  list.append(item)
  document.body.append(list)
  const silent = collector()
  checkListOwnership(silent.add)
  expect(silent.findings).toEqual([])
  document.body.append(item)
  const { findings, add } = collector()
  checkListOwnership(add)
  expect(findings).toEqual([{ rule: 'item-outside-list', detail: 'div#machines-row sits outside a list' }])
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
  document.body.append(fieldset, blank, radios, group)
  const { findings, add } = collector()
  checkGroupNames(add)
  expect(findings).toEqual([
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
  document.body.append(advancedName)
  const silent = collector()
  checkGroupNames(silent.add)
  expect(silent.findings).toEqual([])
})

it('reads a conforming page as conforming, and wires the markup checks into one report', () => {
  const shell = document.createElement('div')
  shell.dataset['deeptailShell'] = ''
  const main = document.createElement('main')
  const heading = document.createElement('h1')
  heading.id = 'session-heading'
  heading.textContent = 'Sessions'
  const trigger = document.createElement('div')
  trigger.setAttribute('aria-controls', 'session-pane')
  trigger.setAttribute('aria-labelledby', 'session-heading')
  const pane = document.createElement('div')
  pane.id = 'session-pane'
  const list = document.createElement('div')
  list.id = 'machines'
  list.setAttribute('role', 'list')
  const item = document.createElement('div')
  item.id = 'machines-row'
  item.setAttribute('role', 'listitem')
  item.textContent = 'alpha'
  const fieldset = document.createElement('fieldset')
  fieldset.id = 'auth'
  const legend = document.createElement('legend')
  legend.textContent = 'Host'
  fieldset.append(legend)
  list.append(item)
  main.append(heading, trigger, pane, list, fieldset)
  shell.append(main)
  document.body.append(shell)
  const limits = { target: 24, interactive: 'button', scope: '[data-deeptail-shell]', vocabulary: [] }
  const silent = findStructureDefects(limits)
  expect(silent).toEqual([])
  const repeated = document.createElement('div')
  repeated.id = 'dup'
  const twin = document.createElement('div')
  twin.id = 'dup'
  const dangling = document.createElement('div')
  dangling.setAttribute('aria-controls', 'missing-pane')
  const orphan = document.createElement('div')
  orphan.id = 'orphan'
  orphan.setAttribute('role', 'listitem')
  const bare = document.createElement('fieldset')
  bare.id = 'bare'
  document.body.append(repeated, twin, dangling, orphan, bare)
  expect(findStructureDefects(limits)).toEqual([
    { rule: 'duplicate-id', detail: 'div#dup repeats id "dup"' },
    { rule: 'dangling-aria-reference', detail: 'div aria-controls points at missing "missing-pane"' },
    { rule: 'item-outside-list', detail: 'div#orphan sits outside a list' },
    { rule: 'unnamed-group', detail: 'fieldset#bare groups controls under no name' },
  ])
})
