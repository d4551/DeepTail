/**
 * The two pages the entry-point suite reads: one that conforms, and one
 * carrying one defect for every check the page ships.
 *
 * Held beside the spec rather than inside it, so the case reads as the list of
 * findings it asserts and the page stays under the file-size limit — the same
 * read `scale-fixtures.ts` makes of its tables. Every element is painted the
 * way the structure suites paint: a box through `paintBox`, a rung of the
 * shipped ladder through `paintType`, a declaration through a stylesheet rule
 * and a marker, and a focus ring through the two events a real engine fires.
 * One element carries one set of declarations, so a case that paints a box
 * role and a rung writes them as one paint.
 *
 * @module
 */

import { typographyRamp } from '../apps/deeptail/tests/structure-emit.ts'
import {
  FOCUS_RING_NONE,
  FOCUS_RING_SHOWN,
  PHYSICAL_LEFT,
  paintBox,
  paintDeclarations,
  paintFocusRing,
  paintHeights,
  paintType,
  typeDeclarations,
} from './structure-double.ts'

/**
 * The ladder the shipped token sheet declares, read once for the pages below.
 */
const TYPOGRAPHY = await typographyRamp()

/** The rung every conforming text carrier is painted at: the ladder's first. */
const RUNG = 0

/** The box every painted control of a page is laid out inside. */
const BOX = { top: 0, left: 0, right: 100, bottom: 100 }

/**
 * What the entry point measures against, as the page receives it.
 *
 * The vocabulary is one name nothing on these pages carries, so the only class
 * reported is the one the planted page adds.
 */
export const LIMITS = {
  target: 44,
  interactive: 'a[href], button',
  scope: '[data-deeptail-shell]',
  vocabulary: ['session-row'],
  typography: TYPOGRAPHY,
}

/**
 * One element with an id, painted as a box.
 * @param tag - the tag to create.
 * @param id - the id a finding names it by.
 * @param box - the edges of the box, in CSS pixels.
 * @returns the element.
 */
function boxed(
  tag: string,
  id: string,
  box: { readonly top: number; readonly left: number; readonly right: number; readonly bottom: number } = BOX,
): HTMLElement {
  const node = document.createElement(tag)
  node.id = id
  paintBox(node, box)
  return node
}

/**
 * One shell that conforms: a heading inside its main, an ARIA reference that
 * resolves, a list of list items and a group named by its legend.
 * @returns the shell.
 */
export function conformingShell(): HTMLElement {
  const shell = document.createElement('div')
  shell.dataset.deeptailShell = ''
  shell.id = 'shell'
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
  list.setAttribute('role', 'list')
  const row = document.createElement('div')
  row.setAttribute('role', 'listitem')
  row.textContent = 'alpha'
  const group = document.createElement('fieldset')
  group.id = 'auth'
  const legend = document.createElement('legend')
  legend.textContent = 'Host'
  group.append(legend)
  list.append(row)
  main.append(heading, trigger, pane, list, group)
  shell.append(main)
  document.body.append(shell)
  for (const painted of [heading, row, legend]) paintType(painted, TYPOGRAPHY, RUNG)
  return shell
}

/**
 * The defects each markup check reports, planted around a shell that conforms.
 * @param shell - the shell the case read as conforming first.
 */
export function plantMarkupDefects(shell: HTMLElement): void {
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
  shell.append(repeated, twin, dangling, orphan, bare)
}

/**
 * The markup defects of the planted page: a repeated id, a control nested in
 * another, an ARIA reference pointing at nothing, a list item outside a list, a
 * group under no name, a class no sheet defines, and a size off the ladder.
 * @param shell - the shell to plant them in.
 */
function plantMarkup(shell: HTMLElement): void {
  const repeated = document.createElement('div')
  repeated.id = 'dup'
  const twin = document.createElement('div')
  twin.id = 'dup'
  const walled = document.createElement('div')
  walled.setAttribute('inert', '')
  const invite = document.createElement('a')
  invite.id = 'invite'
  invite.setAttribute('href', '/sessions')
  const join = document.createElement('button')
  join.id = 'join'
  invite.append(join)
  walled.append(invite)
  const trigger = document.createElement('div')
  trigger.id = 'trigger'
  trigger.setAttribute('aria-controls', 'missing-pane')
  const orphan = document.createElement('div')
  orphan.id = 'orphan'
  orphan.setAttribute('role', 'listitem')
  const bare = document.createElement('fieldset')
  bare.id = 'bare'
  const stranger = document.createElement('div')
  stranger.id = 'stranger'
  stranger.className = 'one-off'
  const offScale = document.createElement('p')
  offScale.id = 'off-scale'
  offScale.textContent = 'Roster'
  paintType(offScale, TYPOGRAPHY, RUNG, { size: 15 })
  shell.append(repeated, twin, walled, trigger, orphan, bare, stranger, offScale)
}

/**
 * The box defects of the planted page: text the box it sits in cuts off, and a
 * pane that scrolls inside a pane that also scrolls.
 * @param shell - the shell to plant them in.
 */
function plantBoxes(shell: HTMLElement): void {
  const cut = document.createElement('div')
  cut.id = 'cut'
  cut.textContent = 'Roster'
  paintDeclarations(cut, `${typeDeclarations(TYPOGRAPHY, RUNG)} overflow-y: hidden;`)
  paintHeights(cut, { scroll: 120, client: 80 })
  const outer = document.createElement('div')
  outer.id = 'outer-pane'
  const inner = document.createElement('div')
  inner.id = 'inner-pane'
  paintDeclarations(outer, 'overflow-y: auto;')
  paintDeclarations(inner, 'overflow-y: auto;')
  outer.append(inner)
  shell.append(cut, outer)
}

/**
 * The target defects of the planted page: two controls drawn over each other, a
 * control under the platform minimum, one that shows no ring, and a text
 * alignment a writing mode cannot follow.
 * @param shell - the shell to plant them in.
 */
function plantTargets(shell: HTMLElement): void {
  const first = boxed('button', 'first', { top: 0, left: 0, right: 100, bottom: 100 })
  const second = boxed('button', 'second', { top: 50, left: 50, right: 150, bottom: 150 })
  const small = boxed('button', 'small', { top: 300, left: 300, right: 320, bottom: 320 })
  const unringed = boxed('button', 'unringed', { top: 400, left: 400, right: 500, bottom: 500 })
  for (const ringed of [first, second, small]) paintFocusRing(ringed, FOCUS_RING_NONE, FOCUS_RING_SHOWN)
  const physical = document.createElement('div')
  physical.id = 'physical'
  paintDeclarations(physical, `text-align: ${PHYSICAL_LEFT};`)
  shell.append(first, second, small, unringed, physical)
}

/**
 * The rhythm defects of the planted page: two boxes off the line they share, a
 * list row off its list's own rhythm, and a grid inside a grid.
 * @param shell - the shell to plant them in.
 */
function plantRows(shell: HTMLElement): void {
  const row = document.createElement('div')
  row.id = 'row'
  paintDeclarations(row, 'display: flex;')
  const lead = boxed('div', 'lead', { top: 0, left: 0, right: 100, bottom: 40 })
  const adrift = boxed('div', 'adrift', { top: 10, left: 100, right: 200, bottom: 50 })
  row.append(lead, adrift)
  const list = document.createElement('div')
  list.setAttribute('role', 'list')
  const rows = [
    { id: 'row-one', top: 0, bottom: 20 },
    { id: 'row-two', top: 30, bottom: 50 },
    { id: 'row-three', top: 60, bottom: 80 },
    { id: 'adrift-row', top: 104, bottom: 124 },
  ]
  list.append(
    ...rows.map((one) => {
      const item = boxed('div', one.id, { top: one.top, left: 0, right: 100, bottom: one.bottom })
      item.setAttribute('role', 'listitem')
      return item
    }),
  )
  const grid = document.createElement('div')
  grid.id = 'grid'
  paintDeclarations(grid, 'display: grid;')
  const inner = document.createElement('div')
  inner.id = 'inner-grid'
  paintDeclarations(inner, 'display: grid;')
  grid.append(inner)
  shell.append(row, list, grid)
}

/**
 * The contract defects of the planted page: a dialog the shared frame did not
 * build, a script hanging off the shell, a second entry outside it, and a
 * surface that keeps moving for a reader who asked for less motion.
 * @param shell - the shell to plant them in.
 */
function plantContracts(shell: HTMLElement): void {
  const rogue = document.createElement('div')
  rogue.id = 'rogue'
  rogue.setAttribute('role', 'dialog')
  rogue.setAttribute('aria-modal', 'true')
  const inline = document.createElement('script')
  const mover = document.createElement('div')
  mover.id = 'mover'
  paintDeclarations(mover, 'transition-duration: 0.3s;')
  shell.append(rogue, inline, mover)
  const injected = document.createElement('script')
  injected.setAttribute('src', '/src/injected.ts')
  document.body.append(injected)
}

/**
 * The page the wiring case reads: one defect for every check the entry point
 * calls, in the order it calls them.
 * @returns the shell the defects are planted around.
 */
export function plantedPage(): HTMLElement {
  const shell = document.createElement('div')
  shell.dataset.deeptailShell = ''
  shell.id = 'shell'
  const firstMain = document.createElement('main')
  const secondMain = document.createElement('main')
  const heading = document.createElement('h1')
  heading.id = 'session-heading'
  heading.textContent = 'Sessions'
  const skipped = document.createElement('h3')
  skipped.textContent = 'Topics'
  firstMain.append(heading)
  secondMain.append(skipped)
  shell.append(firstMain, secondMain)
  document.body.append(shell)
  paintType(heading, TYPOGRAPHY, RUNG)
  paintType(skipped, TYPOGRAPHY, RUNG)
  plantMarkup(shell)
  plantBoxes(shell)
  plantTargets(shell)
  plantRows(shell)
  plantContracts(shell)
  return shell
}
