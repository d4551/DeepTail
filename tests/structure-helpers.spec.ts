/**
 * The shared reads and the scroll subject: how an element is named, what the
 * computed values read, which elements a scope and a pointer's selector reach,
 * and what a pane that scrolls reports.
 *
 * happy-dom paints no box, so every rectangle is zero — where a branch needs
 * one, the case paints a rectangle onto the element instance it belongs to,
 * and the painted-box arithmetic itself is still the browser suites' account
 * of what a real engine does. What a helper reads off the declaration and off
 * markup built here is driven here, where the mutation runs can judge it. The
 * checks that read a box live in `structure-helpers-layout.spec.ts` and
 * `structure-helpers-rows.spec.ts`, the pointer and focus halves in
 * `structure-helpers-pointer.spec.ts` and `structure-helpers-focus.spec.ts`,
 * and the markup defects in `structure-defects.spec.ts`.
 */

import { beforeEach, expect, it } from 'bun:test'
import {
  carriesText,
  laidOutChildren,
  reachableTargets,
  surfaceElements,
} from '../apps/deeptail/tests/structure-elements.ts'
import { clippedAway, describe, pixelLength } from '../apps/deeptail/tests/structure-report.ts'
import {
  checkHorizontalOverflow,
  checkNestedScroll,
  isLayoutPane,
  scrolls,
} from '../apps/deeptail/tests/structure-scroll.ts'
import { resetDocument } from './dom.ts'
import { collector, paintBox, surface } from './structure-double.ts'

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
  '.off-page { display: none; }',
  '.visually-hidden { clip: rect(0px, 0px, 0px, 0px); }',
  '.partly-clipped { clip: rect(1px, 1px, 1px, 1px); }',
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
  expect(describe(named)).toBe('div#submit.button.primary')
  const oneClass = document.createElement('span')
  oneClass.className = 'label'
  expect(describe(oneClass)).toBe('span.label')
  expect(describe(document.createElement('button'))).toBe('button')
})

it('reads the pixels a computed length holds, and nought for a keyword that holds none', () => {
  expect(pixelLength('12px')).toBe(12)
  expect(pixelLength('13.33px')).toBe(13.33)
  expect(pixelLength(' 2px ')).toBe(2)
  // A keyword a font choice left in place has no length in it at all, and
  // answering nought for it is what lets a caller tell the two apart.
  expect(pixelLength('normal')).toBe(0)
  expect(pixelLength('')).toBe(0)
})

it('reads a box its own clip leaves nothing to paint, and one with something to paint', () => {
  const hidden = document.createElement('span')
  hidden.className = 'visually-hidden'
  const clipped = document.createElement('span')
  clipped.className = 'partly-clipped'
  const shown = document.createElement('span')
  document.body.append(hidden, clipped, shown)
  expect(clippedAway(getComputedStyle(hidden))).toBe(true)
  expect(clippedAway(getComputedStyle(clipped))).toBe(false)
  // Nothing declares a clip, so the computed value is the keyword.
  expect(clippedAway(getComputedStyle(shown))).toBe(false)
})

it('reads text an element carries itself, rather than the text of a child', () => {
  const own = document.createElement('p')
  own.textContent = 'Sessions'
  const blank = document.createElement('p')
  blank.textContent = '   '
  const holder = document.createElement('p')
  holder.append(own)
  const both = document.createElement('p')
  both.append(holder, document.createTextNode('Roster'))
  document.body.append(own, blank, holder, both)
  expect([carriesText(own), carriesText(blank), carriesText(holder), carriesText(both)]).toEqual([
    true,
    false,
    false,
    true,
  ])
})

it('reads the element children that paint a box, and leaves the hidden and the unlaid', () => {
  const parent = document.createElement('div')
  const painted = document.createElement('button')
  painted.id = 'painted'
  const collapsed = document.createElement('button')
  collapsed.id = 'collapsed'
  const hidden = document.createElement('button')
  hidden.id = 'hidden'
  hidden.className = 'off-page'
  const drawing = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  parent.append(painted, collapsed, hidden, drawing)
  document.body.append(parent)
  paintBox(painted, { top: 0, left: 0, right: 20, bottom: 20 })
  paintBox(collapsed, { top: 0, left: 0, right: 20, bottom: 0 })
  paintBox(hidden, { top: 0, left: 0, right: 20, bottom: 20 })
  paintBox(drawing, { top: 0, left: 0, right: 20, bottom: 20 })
  expect(laidOutChildren(parent).map((one) => one.id)).toEqual(['painted'])
})

it('reads every element of every surface, each surface included and read once', () => {
  const outer = surface('div')
  outer.id = 'outer'
  const inner = surface('div')
  inner.id = 'inner'
  const leaf = document.createElement('span')
  inner.append(leaf)
  outer.append(inner)
  const single = surface('p')
  single.id = 'single'
  document.body.append(outer, single)
  // The nested surface is reached by one walk and named once: a defect inside
  // it is one finding, not one per root that can reach it.
  expect(surfaceElements('[data-structure-scope]').map((one) => one.id)).toEqual([
    'outer',
    'inner',
    '',
    'single',
  ])
})

it('reads the shadow content of a surface, which the document tree does not carry', () => {
  const host = surface('div')
  const shadow = host.attachShadow({ mode: 'open' })
  const drawn = document.createElement('span')
  drawn.id = 'in-shadow'
  shadow.append(drawn)
  document.body.append(host)
  expect(surfaceElements('[data-structure-scope]').map((one) => one.id)).toEqual(['', 'in-shadow'])
})

it('reads the controls a pointer can reach, and leaves the inert, the hidden and the unrendered', () => {
  const reachable = document.createElement('button')
  reachable.id = 'reachable'
  const hidden = document.createElement('button')
  hidden.id = 'hidden'
  hidden.className = 'off-page'
  const walled = document.createElement('div')
  walled.setAttribute('inert', '')
  const inside = document.createElement('button')
  inside.id = 'inside'
  walled.append(inside)
  const drawing = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  drawing.id = 'drawing'
  drawing.setAttribute('role', 'button')
  document.body.append(reachable, hidden, walled, drawing)
  expect(reachableTargets({ interactive: 'button, [role="button"]' }).map((one) => one.id)).toEqual(['reachable'])
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

it('reads a pane with nothing scrolling above it, and a pane attached to nothing, as conforming', () => {
  const outer = document.createElement('div')
  const inner = document.createElement('div')
  inner.className = 'scroll-auto'
  outer.append(inner)
  const loose = document.createElement('div')
  loose.className = 'scroll-auto'
  document.body.append(outer, loose)
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
