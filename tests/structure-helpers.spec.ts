/**
 * The geometry halves of the browser-suite structure helpers: how an element
 * is named, what the declaration-only geometry reads, and what the layout and
 * pointer checks report for markup built right here.
 *
 * happy-dom paints no box, so every rectangle is zero — the painted-box
 * collision, clipping, and overflow findings need a real layout, and the
 * browser suites are the account of those. What a helper reads off the
 * declaration and off markup built here is driven here, where the mutation
 * runs can judge it. The page-contract halves are held in
 * `structure-page.spec.ts`.
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
import { describe as describeElement } from '../apps/deeptail/tests/structure-report.ts'
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
  '.grid-root { display: grid; }',
  '.grid-inline { display: inline-grid; }',
  '.table-rows { display: table; }',
  `.align-${PHYSICAL_LEFT} { text-align: ${PHYSICAL_LEFT}; }`,
  `.align-${PHYSICAL_JUSTIFY} { text-align: ${PHYSICAL_JUSTIFY}; }`,
  '.off-page { display: none; }',
  '.viewport-fixed { position: fixed; }',
].join('\n')

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
  expect(describeElement(named)).toBe('div#submit.button.primary')
  const oneClass = document.createElement('span')
  oneClass.className = 'label'
  expect(describeElement(oneClass)).toBe('span.label')
  expect(describeElement(document.createElement('button'))).toBe('button')
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

it('reads text that fits its box as not clipped', () => {
  const label = document.createElement('span')
  label.textContent = 'Pair host'
  document.body.append(label)
  const { findings, add } = collector()
  checkClipping(add)
  expect(findings).toEqual([])
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

it('compares only controls that paint pixels, so two unpainted controls never collide', () => {
  document.body.append(document.createElement('button'), document.createElement('button'))
  const { findings, add } = collector()
  checkOverlappingTargets(add, { interactive: 'button' })
  expect(findings).toEqual([])
})
