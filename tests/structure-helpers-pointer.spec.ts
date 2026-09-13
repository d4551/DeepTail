/**
 * Pointer-geometry halves of the structure helpers: target size and overlap.
 *
 * Split from `structure-helpers.spec.ts` so that file stays under the size
 * limit. happy-dom paints no box; `paintBox` supplies one.
 *
 * @module
 */

import { beforeEach, expect, it } from 'bun:test'
import { checkOverlappingTargets, checkTouchTargets } from '../apps/deeptail/tests/structure-pointer.ts'
import { resetDocument } from './dom.ts'
import { collector, paintBox } from './structure-double.ts'

beforeEach(() => {
  resetDocument()
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
