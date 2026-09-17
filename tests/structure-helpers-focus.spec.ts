/**
 * What a keyboard is shown: the ring a control paints when it holds focus, what
 * covers it, and the pass that focuses every control in turn to read both.
 *
 * The ring rule is driven both ways. Its two readings are handed to it directly
 * here, because a real engine's `:focus` state is the one thing no other case
 * can produce, and the two doubles in `structure-double.ts` paint that state
 * for the pass that reads it off the live document.
 *
 * @module
 */

import { beforeEach, expect, it } from 'bun:test'
import {
  checkFocusRing,
  checkFocusVisible,
  coveringAt,
  type FocusRing,
} from '../apps/deeptail/tests/structure-pointer.ts'
import { resetDocument } from './dom.ts'
import {
  answerHitTest,
  collector,
  FOCUS_RING_NONE,
  FOCUS_RING_SHOWN,
  paintBox,
  paintFocusRing,
  refuseFocus,
  restoreHitTest,
} from './structure-double.ts'

/** The declarations this file's painted controls read. */
const DECLARATIONS = [
  '.off-page { display: none; }',
  '.ring-always { outline: 2px solid rgb(0, 0, 0); }',
  '.shadow-always { box-shadow: 0 0 0 2px rgb(0, 0, 0); }',
].join('\n')

/** The ring a control that holds no focus paints: none. */
const RESTING: FocusRing = { outlineWidth: 0, outlineStyle: '', outlineOpacity: 1, shadow: '', borderWidth: 0 }

/** The controls the focus pass reads. */
const INTERACTIVE = 'button, [role="button"]'

/**
 * One ring reading, with every field the case is not about left at nothing.
 * @param deviation - the fields the case is about.
 * @returns the reading.
 */
function ring(deviation: Partial<FocusRing>): FocusRing {
  return { ...RESTING, ...deviation }
}

beforeEach(() => {
  resetDocument()
  const sheet = document.createElement('style')
  sheet.textContent = DECLARATIONS
  document.head.append(sheet)
})

it('reports a control that takes focus and paints no outline or shadow for it', () => {
  const node = document.createElement('button')
  document.body.append(node)
  const transparent = ring({ outlineWidth: 2, outlineStyle: 'solid', outlineOpacity: 0, shadow: 'none' })
  const { findings, add } = collector()
  checkFocusRing(add, node, RESTING, RESTING)
  checkFocusRing(add, node, RESTING, transparent)
  expect(findings).toEqual([
    { rule: 'focus-invisible', detail: 'button takes focus and paints no outline or shadow for it' },
    { rule: 'focus-invisible', detail: 'button takes focus and paints no outline or shadow for it' },
  ])
})

it('reports a control whose focused state is the one it already painted', () => {
  const node = document.createElement('button')
  document.body.append(node)
  const outline = ring({ outlineWidth: 2, outlineStyle: 'solid' })
  const shadow = ring({ shadow: '0 0 0 2px rgb(0, 0, 0)' })
  const { findings, add } = collector()
  checkFocusRing(add, node, outline, outline)
  checkFocusRing(add, node, shadow, shadow)
  expect(findings).toEqual([
    {
      rule: 'focus-invisible',
      detail: 'button paints the same outline focused as unfocused, so focus is nowhere the reader can see it',
    },
    {
      rule: 'focus-invisible',
      detail: 'button paints the same outline focused as unfocused, so focus is nowhere the reader can see it',
    },
  ])
})

it('reads every way an indicator can differ from the resting state as a ring the reader sees', () => {
  const node = document.createElement('button')
  node.id = 'control'
  document.body.append(node)
  const painted = ring({ outlineWidth: 2, outlineStyle: 'solid' })
  const faded = ring({ outlineWidth: 3, outlineStyle: 'solid', outlineOpacity: 0.4 })
  const thicker = ring({ outlineWidth: 2, outlineStyle: 'solid', borderWidth: 3 })
  const { findings, add } = collector()
  // An outline that arrives, a shadow that arrives, a style that changes, an
  // opacity that changes, and a border that thickens on a ring already painted:
  // each is the same square of pixels changing, which is what the reader sees.
  checkFocusRing(add, node, RESTING, painted)
  checkFocusRing(add, node, RESTING, ring({ shadow: '0 0 0 2px rgb(0, 0, 0)' }))
  checkFocusRing(add, node, ring({ outlineWidth: 2 }), painted)
  checkFocusRing(add, node, ring({ outlineWidth: 3, outlineStyle: 'solid' }), faded)
  checkFocusRing(add, node, painted, thicker)
  expect(findings).toEqual([])
})

it('reads what covers a control only when every point it paints is covered', () => {
  const node = document.createElement('button')
  document.body.append(node)
  const cover = document.createElement('div')
  cover.id = 'cover'
  document.body.append(cover)
  paintBox(node, { top: 100, left: 100, right: 200, bottom: 200 })
  // Nothing painted is nothing to cover, and a box laid out off the viewport
  // has no point the hit test can be asked about.
  expect(coveringAt(node)).toBeUndefined()
  paintBox(node, { top: 100, left: 2000, right: 2100, bottom: 2100 })
  expect(coveringAt(node)).toBeUndefined()
  paintBox(node, { top: 100, left: 100, right: 200, bottom: 200 })
  answerHitTest(null)
  expect(coveringAt(node)).toBeUndefined()
  answerHitTest(node)
  expect(coveringAt(node)).toBeUndefined()
  const child = document.createElement('span')
  node.append(child)
  answerHitTest(child)
  expect(coveringAt(node)).toBeUndefined()
  // An ancestor answering the hit test is a sample the control was not
  // hit-testable at, which is not a cover.
  const holder = document.createElement('div')
  document.body.append(holder)
  holder.append(node)
  answerHitTest(holder)
  expect(coveringAt(node)).toBeUndefined()
  answerHitTest(cover)
  expect(coveringAt(node)).toBe(cover)
  restoreHitTest()
  expect(coveringAt(node)).toBeUndefined()
})

it('reads a control that shows its focus as conforming, and leaves focus where it found it', () => {
  const opener = document.createElement('button')
  opener.id = 'opener'
  const other = document.createElement('button')
  other.id = 'other'
  document.body.append(opener, other)
  paintFocusRing(opener, FOCUS_RING_NONE, FOCUS_RING_SHOWN)
  paintFocusRing(other, FOCUS_RING_NONE, FOCUS_RING_SHOWN)
  opener.focus({ preventScroll: true })
  expect(document.activeElement).toBe(opener)
  const { findings, add } = collector()
  checkFocusVisible(add, { interactive: INTERACTIVE })
  expect(findings).toEqual([])
  expect(document.activeElement).toBe(opener)
})

it('reports a control that takes focus without showing it, and one whose ring never changes', () => {
  const bare = document.createElement('button')
  bare.id = 'bare'
  const constant = document.createElement('button')
  constant.id = 'constant'
  constant.className = 'ring-always'
  document.body.append(bare, constant)
  const { findings, add } = collector()
  checkFocusVisible(add, { interactive: INTERACTIVE })
  expect(findings).toEqual([
    { rule: 'focus-invisible', detail: 'button#bare takes focus and paints no outline or shadow for it' },
    {
      rule: 'focus-invisible',
      detail:
        'button#constant.ring-always paints the same outline focused as unfocused, so focus is nowhere the reader can see it',
    },
  ])
})

it('reports a control that holds focus under whatever covers every point it paints', () => {
  const covered = document.createElement('button')
  covered.id = 'covered'
  const cover = document.createElement('div')
  cover.id = 'cover'
  document.body.append(covered, cover)
  paintFocusRing(covered, FOCUS_RING_NONE, FOCUS_RING_SHOWN)
  paintBox(covered, { top: 10, left: 10, right: 110, bottom: 110 })
  answerHitTest(cover)
  const { findings, add } = collector()
  checkFocusVisible(add, { interactive: INTERACTIVE })
  restoreHitTest()
  expect(findings).toEqual([
    {
      rule: 'focus-obscured',
      detail: 'button#covered holds focus under div#cover, which covers every point it paints',
    },
  ])
})

it('reads a disabled, hidden, inert, refused or unrendered control as no control to read', () => {
  const disabled = document.createElement('button')
  disabled.setAttribute('disabled', '')
  const hidden = document.createElement('button')
  hidden.className = 'off-page'
  const walled = document.createElement('div')
  walled.setAttribute('inert', '')
  const inside = document.createElement('button')
  walled.append(inside)
  const drawing = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  drawing.setAttribute('role', 'button')
  const refused = document.createElement('button')
  refuseFocus(refused)
  document.body.append(disabled, hidden, walled, drawing, refused)
  const { findings, add } = collector()
  checkFocusVisible(add, { interactive: INTERACTIVE })
  expect(findings).toEqual([])
})
