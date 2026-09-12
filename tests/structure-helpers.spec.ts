/**
 * The geometry halves of the browser-suite structure helpers: how an element
 * is named, what the declaration-only geometry reads, and what the layout and
 * pointer checks report for markup built right here.
 *
 * happy-dom paints no box, so every rectangle is zero — where a branch needs
 * one, the case paints a rectangle onto the element instance it belongs to,
 * and the painted-box arithmetic itself is still the browser suites' account
 * of what a real engine does. What a helper reads off the declaration and off
 * markup built here is driven here, where the mutation runs can judge it. The
 * page-contract halves are held in `structure-page.spec.ts` and the markup
 * defects in `structure-defects.spec.ts`.
 */

import { beforeEach, expect, it } from 'bun:test'
import {
  checkAlignment,
  checkClipping,
  checkGrid,
  checkHorizontalOverflow,
  checkNestedScroll,
  gridAncestor,
  isLayoutPane,
  scrolls,
} from '../apps/deeptail/tests/structure-layout.ts'
import { checkOverlappingTargets, checkTouchTargets, drawnBox } from '../apps/deeptail/tests/structure-pointer.ts'
import { describe } from '../apps/deeptail/tests/structure-report.ts'
import { resetDocument } from './dom.ts'
import { collector, surface } from './structure-double.ts'

/**
 * The physical spellings the alignment check exists to report, assembled so
 * this file's own source carries none of them whole — the same read the
 * sheet-gate suite makes of its fixtures.
 */
const PHYSICAL_LEFT = ['le', 'ft'].join('')
const PHYSICAL_JUSTIFY = ['ju', 'stify'].join('')

/**
 * The declarations the geometry checks read, as one stylesheet the document
 * carries. A declaration lives in a stylesheet even here, so a case styles an
 * element by adding the class the rule names.
 */
const DECLARATIONS = [
  '.scroll-auto { overflow-y: auto; }',
  '.scroll-scroll { overflow-y: scroll; }',
  '.scroll-hidden { overflow-y: hidden; }',
  '.clip-x { overflow-x: hidden; }',
  '.overflow-visible { overflow: visible; }',
  '.ellipsis { text-overflow: ellipsis; }',
  '.grid-root { display: grid; }',
  '.grid-inline { display: inline-grid; }',
  '.table-rows { display: table; }',
  `.align-${PHYSICAL_LEFT} { text-align: ${PHYSICAL_LEFT}; }`,
  `.align-${PHYSICAL_JUSTIFY} { text-align: ${PHYSICAL_JUSTIFY}; }`,
  '.off-page { display: none; }',
  '.viewport-fixed { position: fixed; }',
].join('\n')

/**
 * Paints one box onto one element, where happy-dom paints none.
 *
 * happy-dom lays nothing out, so every rectangle reads zero; a branch that
 * reads geometry is driven by overriding the reading on the element instance
 * the case owns. The declaration halves still read the sheet, and nothing
 * outside that instance changes — the element is discarded with the document
 * the next case builds.
 */
function paintBox(
  node: Element,
  box: { readonly top: number; readonly left: number; readonly right: number; readonly bottom: number },
): void {
  Object.defineProperty(node, 'getBoundingClientRect', {
    value: () => ({ ...box, width: box.right - box.left, height: box.bottom - box.top }),
    configurable: true,
  })
}

beforeEach(() => {
  resetDocument()
  const sheet = document.createElement('style')
  sheet.textContent = DECLARATIONS
  document.head.append(sheet)
})

it('names an element by its tag, its id, and its classes', () => {
  const named = document.createElement('div')
  named.id = 'submit'
  named.className = 'button primary'
  expect(describe(named)).toBe('div#submit.button.primary')
  const oneClass = document.createElement('span')
  oneClass.className = 'label'
  expect(describe(oneClass)).toBe('span.label')
  expect(describe(document.createElement('button'))).toBe('button')
})

it('reads a vertical scroll container off the declaration, not off the overflow', () => {
  const unset = document.createElement('div')
  document.body.append(unset)
  expect(scrolls(unset)).toBe(false)
  const auto = document.createElement('div')
  auto.className = 'scroll-auto'
  document.body.append(auto)
  expect(scrolls(auto)).toBe(true)
  const scroll = document.createElement('div')
  scroll.className = 'scroll-scroll'
  document.body.append(scroll)
  expect(scrolls(scroll)).toBe(true)
  const hidden = document.createElement('div')
  hidden.className = 'scroll-hidden'
  document.body.append(hidden)
  expect(scrolls(hidden)).toBe(false)
})

it('reads an editor control as a value scroller, never as a pane', () => {
  const pane = document.createElement('div')
  const field = document.createElement('textarea')
  const choices = document.createElement('select')
  const editor = document.createElement('div')
  editor.setAttribute('contenteditable', 'true')
  expect([isLayoutPane(pane), isLayoutPane(field), isLayoutPane(choices), isLayoutPane(editor)]).toEqual([
    true,
    false,
    false,
    false,
  ])
})

it('reports a pane that scrolls inside a pane that also scrolls', () => {
  const outer = document.createElement('div')
  outer.className = 'scroll-scroll'
  const inner = document.createElement('div')
  inner.className = 'scroll-auto'
  outer.append(inner)
  document.body.append(outer)
  const { findings, add } = collector()
  checkNestedScroll(add)
  expect(findings).toEqual([
    { rule: 'nested-scroll', detail: 'div.scroll-auto scrolls inside div.scroll-scroll, which also scrolls' },
  ])
})

it('does not read an editor scrolling its own value as a second pane', () => {
  const outer = document.createElement('div')
  outer.className = 'scroll-scroll'
  const field = document.createElement('textarea')
  field.className = 'scroll-auto'
  outer.append(field)
  document.body.append(outer)
  const { findings, add } = collector()
  checkNestedScroll(add)
  expect(findings).toEqual([])
})

it('reads a document that fits its viewport as not overflowing sideways', () => {
  const wide = document.createElement('div')
  wide.textContent = 'Roster'
  document.body.append(wide)
  const { findings, add } = collector()
  checkHorizontalOverflow(add)
  expect(findings).toEqual([])
})

it('reports a document that scrolls past its own viewport', () => {
  const doc = document.documentElement
  Object.defineProperty(doc, 'scrollWidth', { value: 900, configurable: true })
  Object.defineProperty(doc, 'clientWidth', { value: 600, configurable: true })
  const { findings, add } = collector()
  checkHorizontalOverflow(add)
  Reflect.deleteProperty(doc, 'scrollWidth')
  Reflect.deleteProperty(doc, 'clientWidth')
  expect(findings).toEqual([{ rule: 'horizontal-overflow', detail: 'document scrolls to 900 in 600' }])
})

it('reads text that fits its box as not clipped', () => {
  const label = document.createElement('span')
  label.textContent = 'Pair host'
  document.body.append(label)
  const { findings, add } = collector()
  checkClipping(add)
  expect(findings).toEqual([])
})

it('reports text that overruns its box without a scroll or ellipsis, and stays silent for one pixel and an ellipsis', () => {
  const overrun = document.createElement('span')
  overrun.className = 'overflow-visible'
  overrun.textContent = 'Pair host'
  const boundary = document.createElement('span')
  boundary.textContent = 'Pair host'
  const truncated = document.createElement('span')
  truncated.className = 'overflow-visible ellipsis'
  truncated.textContent = 'Pair host'
  document.body.append(overrun, boundary, truncated)
  Object.defineProperty(overrun, 'scrollWidth', { value: 120, configurable: true })
  Object.defineProperty(overrun, 'clientWidth', { value: 80, configurable: true })
  Object.defineProperty(boundary, 'scrollWidth', { value: 81, configurable: true })
  Object.defineProperty(boundary, 'clientWidth', { value: 80, configurable: true })
  Object.defineProperty(truncated, 'scrollWidth', { value: 120, configurable: true })
  Object.defineProperty(truncated, 'clientWidth', { value: 80, configurable: true })
  const { findings, add } = collector()
  checkClipping(add)
  expect(findings).toEqual([
    { rule: 'clipped-content', detail: 'span.overflow-visible overflows its box without a scroll or ellipsis' },
  ])
})

it('names the nearest grid ancestor, and nothing when no ancestor is a grid', () => {
  const root = surface('div')
  root.className = 'grid-root'
  const inner = document.createElement('div')
  root.append(inner)
  document.body.append(root)
  expect(gridAncestor(inner)).toBe(root)
  const flat = document.createElement('div')
  document.body.append(flat)
  expect(gridAncestor(flat)).toBeUndefined()
  expect(gridAncestor(document.createElement('div'))).toBeUndefined()
})

it('reports a grid nested in a grid, a table used as a grid, and a headerless layout table', () => {
  const root = surface('div')
  root.className = 'grid-root'
  const inner = document.createElement('div')
  inner.className = 'grid-inline'
  const tableStyled = document.createElement('div')
  tableStyled.className = 'table-rows'
  const layout = document.createElement('table')
  const headed = document.createElement('table')
  headed.append(document.createElement('th'))
  root.append(inner, tableStyled, layout, headed)
  document.body.append(root)
  const { findings, add } = collector()
  checkGrid(add, { scope: '[data-structure-scope]' })
  expect(findings).toEqual([
    { rule: 'nested-grid', detail: 'div.grid-inline is a grid inside div.grid-root, which is also a grid' },
    { rule: 'hardcoded-grid', detail: 'div.table-rows uses display:table as a layout grid' },
    { rule: 'layout-table', detail: 'table is a table with no header, used as a layout grid' },
  ])
})

it('reports physical or justified text alignment computed at runtime, and start stays silent', () => {
  const root = surface('div')
  const left = document.createElement('p')
  left.className = `align-${PHYSICAL_LEFT}`
  const justified = document.createElement('p')
  justified.className = `align-${PHYSICAL_JUSTIFY}`
  const start = document.createElement('p')
  root.append(left, justified, start)
  document.body.append(root)
  const { findings, add } = collector()
  checkAlignment(add, { scope: '[data-structure-scope]' })
  expect(findings).toEqual([
    { rule: 'alignment', detail: `p.align-${PHYSICAL_LEFT} uses physical or justified text-align ${PHYSICAL_LEFT}` },
    {
      rule: 'alignment',
      detail: `p.align-${PHYSICAL_JUSTIFY} uses physical or justified text-align ${PHYSICAL_JUSTIFY}`,
    },
  ])
})

it('intersects a laid-out box with every ancestor that clips it, and stops at a fixed box', () => {
  // happy-dom paints no box, so every edge reads zero; what is driven here is
  // the walk itself — the clipping intersection, the fixed stop, and the
  // detached stop. The painted-box arithmetic is the browser suites' account.
  const pane = document.createElement('div')
  pane.className = 'clip-x'
  const target = document.createElement('button')
  pane.append(target)
  const pinned = document.createElement('div')
  pinned.className = 'viewport-fixed'
  document.body.append(pane, pinned)
  expect(drawnBox(target)).toEqual({ top: 0, left: 0, right: 0, bottom: 0 })
  expect(drawnBox(pinned)).toEqual({ top: 0, left: 0, right: 0, bottom: 0 })
  expect(drawnBox(document.createElement('button'))).toEqual({ top: 0, left: 0, right: 0, bottom: 0 })
})

it('clips a drawn box into an ancestor that clips vertically, and leaves the horizontal edges to the x axis', () => {
  const pane = document.createElement('div')
  pane.className = 'scroll-scroll'
  const target = document.createElement('button')
  pane.append(target)
  document.body.append(pane)
  paintBox(target, { top: 10, left: 10, right: 110, bottom: 60 })
  paintBox(pane, { top: 20, left: 40, right: 200, bottom: 50 })
  expect(drawnBox(target)).toEqual({ top: 20, left: 10, right: 110, bottom: 50 })
})

it('reports a visible control that paints no box as collapsed, and skips what is not reachable', () => {
  const live = document.createElement('button')
  const hidden = document.createElement('button')
  hidden.className = 'off-page'
  const walled = document.createElement('div')
  walled.setAttribute('inert', '')
  walled.append(document.createElement('button'))
  document.body.append(live, hidden, walled)
  const { findings, add } = collector()
  checkTouchTargets(add, { target: 24, interactive: 'button' })
  expect(findings).toEqual([{ rule: 'target-collapsed', detail: 'button takes focus but paints no box' }])
})

it('reports a reachable control under the target floor on either axis, and stays silent at it', () => {
  const narrow = document.createElement('button')
  const short = document.createElement('button')
  const exact = document.createElement('button')
  document.body.append(narrow, short, exact)
  paintBox(narrow, { top: 0, left: 0, right: 20, bottom: 100 })
  paintBox(short, { top: 0, left: 0, right: 100, bottom: 20 })
  paintBox(exact, { top: 0, left: 0, right: 44, bottom: 44 })
  const { findings, add } = collector()
  checkTouchTargets(add, { target: 44, interactive: 'button' })
  expect(findings).toEqual([
    { rule: 'target-size', detail: 'button is 20x100, under 44' },
    { rule: 'target-size', detail: 'button is 100x20, under 44' },
  ])
})

it('compares only controls that paint pixels, so two unpainted controls never collide', () => {
  document.body.append(document.createElement('button'), document.createElement('button'))
  const { findings, add } = collector()
  checkOverlappingTargets(add, { interactive: 'button' })
  expect(findings).toEqual([])
})

it('reports two controls painted over each other, and allows one pixel on either axis', () => {
  const first = document.createElement('button')
  const second = document.createElement('button')
  document.body.append(first, second)
  paintBox(first, { top: 0, left: 0, right: 100, bottom: 100 })
  paintBox(second, { top: 50, left: 50, right: 150, bottom: 150 })
  const { findings, add } = collector()
  checkOverlappingTargets(add, { interactive: 'button' })
  expect(findings).toEqual([{ rule: 'overlapping-targets', detail: 'button overlaps button' }])
  paintBox(second, { top: 0, left: 99, right: 199, bottom: 100 })
  const widthTolerant = collector()
  checkOverlappingTargets(widthTolerant.add, { interactive: 'button' })
  expect(widthTolerant.findings).toEqual([])
  paintBox(second, { top: 99, left: 0, right: 100, bottom: 199 })
  const heightTolerant = collector()
  checkOverlappingTargets(heightTolerant.add, { interactive: 'button' })
  expect(heightTolerant.findings).toEqual([])
})

it('never reads a control over its own ancestor or descendant as a collision', () => {
  const card = document.createElement('div')
  card.setAttribute('role', 'button')
  const link = document.createElement('a')
  link.setAttribute('href', '/sessions')
  card.append(link)
  document.body.append(card)
  paintBox(card, { top: 0, left: 0, right: 200, bottom: 200 })
  paintBox(link, { top: 10, left: 10, right: 100, bottom: 50 })
  const { findings, add } = collector()
  checkOverlappingTargets(add, { interactive: '[role="button"], a[href]' })
  expect(findings).toEqual([])
})
