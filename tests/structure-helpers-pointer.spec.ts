/**
 * Pointer geometry: where a box is painted, what a finger reaches, which
 * controls share pixels, and what a control paints through the properties a
 * focus indicator is made of.
 *
 * happy-dom paints no box, so `paintBox` supplies one; the browser suites
 * remain the account of what a real engine paints. The focus state itself is
 * driven in `structure-helpers-focus.spec.ts`, where the two states are
 * compared.
 *
 * @module
 */

import { beforeEach, expect, it } from 'bun:test'
import {
  checkOverlappingTargets,
  checkTouchTargets,
  colourAlpha,
  drawnBox,
  readFocusRing,
} from '../apps/deeptail/tests/structure-pointer.ts'
import { resetDocument } from './dom.ts'
import { collector, paintBox } from './structure-double.ts'

/**
 * The declarations these checks read, as one stylesheet the document carries.
 *
 * The two axes are declared separately because that is what the rules read:
 * `overflow` is a shorthand the engine expands, and happy-dom reports each
 * longhand it was given.
 */
const DECLARATIONS = [
  '.scroll-scroll { overflow-y: scroll; }',
  '.clip-x { overflow-x: hidden; }',
  '.clip-both { overflow-x: hidden; overflow-y: hidden; }',
  '.viewport-fixed { position: fixed; }',
  '.off-page { display: none; }',
  '.ring { outline: 2px solid rgb(0, 0, 0); }',
  '.ring-shadow { box-shadow: 0 0 0 2px rgb(0, 0, 0); }',
].join('\n')

beforeEach(() => {
  resetDocument()
  const sheet = document.createElement('style')
  sheet.textContent = DECLARATIONS
  document.head.append(sheet)
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

it('leaves a box inside a fixed ancestor alone, because no ancestor overflow reaches it', () => {
  const outer = document.createElement('div')
  outer.className = 'clip-both'
  const pinned = document.createElement('div')
  pinned.className = 'viewport-fixed'
  const inside = document.createElement('button')
  const seated = document.createElement('button')
  pinned.append(inside)
  outer.append(pinned, seated)
  document.body.append(outer)
  paintBox(outer, { top: 0, left: 0, right: 10, bottom: 10 })
  paintBox(pinned, { top: 0, left: 0, right: 100, bottom: 100 })
  paintBox(inside, { top: 10, left: 10, right: 50, bottom: 50 })
  paintBox(seated, { top: 10, left: 10, right: 50, bottom: 50 })
  expect(drawnBox(inside)).toEqual({ top: 10, left: 10, right: 50, bottom: 50 })
  expect(drawnBox(seated)).toEqual({ top: 10, left: 10, right: 10, bottom: 10 })
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

it('reports a visible control that paints no box as collapsed, and skips what is not reachable', () => {
  const live = document.createElement('button')
  const hidden = document.createElement('button')
  hidden.className = 'off-page'
  const walled = document.createElement('div')
  walled.setAttribute('inert', '')
  walled.append(document.createElement('button'))
  const drawing = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  drawing.setAttribute('role', 'button')
  document.body.append(live, hidden, walled, drawing)
  const { findings, add } = collector()
  checkTouchTargets(add, { target: 24, interactive: 'button, [role="button"]' })
  expect(findings).toEqual([{ rule: 'target-collapsed', detail: 'button takes focus but paints no box' }])
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

it('reads a control an ancestor clips to nothing as no collision, where the same box outside it collides', () => {
  const pane = document.createElement('div')
  pane.className = 'clip-both'
  const inside = document.createElement('button')
  inside.id = 'inside'
  pane.append(inside)
  const loose = document.createElement('button')
  loose.id = 'loose'
  document.body.append(pane, loose)
  paintBox(pane, { top: 100, left: 100, right: 200, bottom: 200 })
  paintBox(inside, { top: 0, left: 0, right: 50, bottom: 50 })
  paintBox(loose, { top: 0, left: 0, right: 50, bottom: 50 })
  const { findings, add } = collector()
  checkOverlappingTargets(add, { interactive: 'button' })
  expect(findings).toEqual([])
  // The pane stops clipping, and the two boxes are one collision again.
  paintBox(pane, { top: 0, left: 0, right: 500, bottom: 500 })
  const clipped = collector()
  checkOverlappingTargets(clipped.add, { interactive: 'button' })
  expect(clipped.findings).toEqual([{ rule: 'overlapping-targets', detail: 'button#inside overlaps button#loose' }])
})

it('skips the controls a pointer cannot reach, and reads the ones it can apart', () => {
  const drawn = document.createElement('button')
  drawn.id = 'drawn'
  const walled = document.createElement('div')
  walled.setAttribute('inert', '')
  const walledControl = document.createElement('button')
  walledControl.id = 'walled'
  walled.append(walledControl)
  const hidden = document.createElement('button')
  hidden.id = 'hidden'
  hidden.className = 'off-page'
  const drawing = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  drawing.setAttribute('role', 'button')
  document.body.append(drawn, walled, hidden, drawing)
  paintBox(drawn, { top: 0, left: 0, right: 50, bottom: 50 })
  paintBox(walledControl, { top: 0, left: 0, right: 50, bottom: 50 })
  paintBox(hidden, { top: 0, left: 0, right: 50, bottom: 50 })
  paintBox(drawing, { top: 0, left: 0, right: 50, bottom: 50 })
  const { findings, add } = collector()
  checkOverlappingTargets(add, { interactive: 'button, [role="button"]' })
  expect(findings).toEqual([])
})

it('reads how opaque a computed colour is, and reads one it cannot take apart as opaque', () => {
  expect(colourAlpha('rgba(0, 0, 0, 0.5)')).toBe(0.5)
  expect(colourAlpha('rgb(0, 0, 0)')).toBe(1)
  expect(colourAlpha(' transparent ')).toBe(0)
  // A ring this cannot decode is a ring the reader can see, so it is not
  // reported as invisible.
  expect(colourAlpha('color(srgb 0 0 0)')).toBe(1)
})

it('reads a focus ring out of the properties one is painted with, and reads none as none', () => {
  const ringed = document.createElement('button')
  ringed.className = 'ring'
  const shadowed = document.createElement('button')
  shadowed.className = 'ring-shadow'
  const plain = document.createElement('button')
  document.body.append(ringed, shadowed, plain)
  expect(readFocusRing(getComputedStyle(ringed))).toEqual({
    outlineWidth: 2,
    outlineStyle: 'solid',
    outlineOpacity: 1,
    shadow: '',
    borderWidth: 0,
  })
  expect(readFocusRing(getComputedStyle(shadowed)).shadow).toBe('0 0 0 2px rgb(0, 0, 0)')
  expect(readFocusRing(getComputedStyle(plain)).outlineWidth).toBe(0)
  expect(readFocusRing(getComputedStyle(plain)).outlineStyle).toBe('')
})
