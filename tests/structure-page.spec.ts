/**
 * What the page receives: the checks emitted as one self-contained source, the
 * two pointer floors read out of the sheet that declares them, and the wait
 * that settles a page before anything is measured on it.
 *
 * The source is what the browser suite evaluates, so what is driven here is
 * that it carries every check by definition and every limit by value: a name
 * missing from it is a `ReferenceError` on the page, and a limit missing from
 * it is a check measuring against nothing. What each check then reports is held
 * in `structure-typography.spec.ts`, `structure-page-shell.spec.ts` and their
 * siblings.
 *
 * @module
 */

import { expect, it } from 'bun:test'
import {
  finiteAnimations,
  pointerTargetFloor,
  pointerTargetFloorFrom,
  structureCheckSource,
  waitForFiniteAnimations,
} from '../apps/deeptail/tests/structure-emit.ts'
import { SHIPPED_CHECKS } from './structure-shipped.ts'

it('emits the checks as one self-contained page source, with the limits passed in the call', async () => {
  const coarse = await structureCheckSource(true, ['session-row'])
  // The source is an async IIFE: it settles the page's fonts and running
  // animations before it measures, so a finding read mid-flight cannot name a
  // defect the finished layout does not have.
  expect(coarse.startsWith('(async () => {')).toBe(true)
  expect(coarse.endsWith('})()')).toBe(true)
  expect(coarse).toContain('await waitForFiniteAnimations()')
  expect(coarse).toContain('await document.fonts.ready')
  expect(coarse).toContain('await Promise.allSettled')
  expect(coarse).toContain('[data-deeptail-picker]')
  expect(coarse).toContain('a[href]')
  // Every declaration read out of the token sheet travels with them: a scale
  // the page never receives would measure nothing, and one restated here would
  // measure against a scale nobody ships.
  for (const held of [
    '"sizes":[12,13,14,16,18]',
    '"leadings":[18,20,22,24,26]',
    '"weights":[400,500,600]',
    '"trackings":[0.04,0.08]',
    '"casings":["none","uppercase","lowercase","capitalize"]',
    '"measure":640',
    '"target":44',
    '"vocabulary":["session-row"]',
  ]) {
    expect(coarse).toContain(held)
  }
  const fine = await structureCheckSource(false, [])
  expect(fine).toContain('"target":24')
  expect(fine).toContain('"vocabulary":[]')
  // Every check the page runs is shipped in that source, by name — the helpers
  // the checks call included, since the source carries nothing else.
  expect(SHIPPED_CHECKS.filter((name) => !coarse.includes(`function ${name}`))).toEqual([])
})

it('reads each pointer floor out of the sheet that declares it, and refuses a sheet that names none', async () => {
  expect(await pointerTargetFloor('fine')).toBe(24)
  expect(await pointerTargetFloor('coarse')).toBe(44)
  expect(pointerTargetFloorFrom(':root { --dsh-target-coarse: 48px; }', 'coarse')).toBe(48)
  expect(() => pointerTargetFloorFrom(':root { }', 'fine')).toThrow(
    'deeptail: tokens.css does not define --dsh-target-fine',
  )
})

it('drops infinite animations and keeps ones that finish', () => {
  const spinning = {
    effect: { getComputedTiming: () => ({ iterations: Number.POSITIVE_INFINITY }) },
    finished: Promise.resolve(),
  }
  const once = {
    effect: { getComputedTiming: () => ({ iterations: 1 }) },
    finished: Promise.resolve(),
  }
  const none = { effect: null, finished: Promise.resolve() }
  expect(finiteAnimations([spinning, once, none])).toEqual([once])
})

it('settles the layout without waiting on a spinner', async () => {
  Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: Promise.resolve() } })
  Object.defineProperty(document, 'getAnimations', { configurable: true, value: () => [] })
  await waitForFiniteAnimations()
})
