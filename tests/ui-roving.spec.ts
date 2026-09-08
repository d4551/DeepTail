/**
 * The one tab stop a whole list is reached through.
 *
 * A list of a hundred rows is one stop on the page, and the arrow keys are how
 * the rest are reached. What that costs is that every list has to agree on it:
 * a row that kept its own stop would put a hundred stops back on the page, and
 * a press answered where a field inside the row should have answered it takes
 * focus out of what is being typed into.
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { el } from '../apps/deeptail/src/ui/dom.ts'
import { bindRovingFocus } from '../apps/deeptail/src/ui/roving.ts'
import { resetDocument } from './dom.ts'

beforeEach(() => {
  resetDocument()
})

/**
 * Press one key on an element, the way a person does.
 * @param node - the element with focus.
 * @param key - the key pressed.
 * @returns whether the element's handlers let the press through.
 */
function press(node: HTMLElement, key: string): boolean {
  return node.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

/**
 * A list of controls, each with its own roving stop bound.
 * @param count - how many controls.
 * @returns the controls, in display order.
 */
function rows(count: number): HTMLElement[] {
  const stops = Array.from({ length: count }, (_unused, index) => el('button', { text: String(index) }))
  for (const stop of stops) document.body.append(stop)
  bindRovingFocus(stops)
  return stops
}

describe('a roving tab stop', () => {
  it('gives the set one stop, on the first control', () => {
    expect(rows(3).map((stop) => stop.tabIndex)).toEqual([0, -1, -1])
  })

  it('moves down and up, wrapping at each end', () => {
    const stops = rows(3)
    press(stops[0] ?? el('div'), 'ArrowDown')
    expect([stops.map((stop) => stop.tabIndex), document.activeElement]).toEqual([[-1, 0, -1], stops[1] ?? null])
    press(stops[1] ?? el('div'), 'ArrowUp')
    expect(document.activeElement).toBe(stops[0] ?? null)
    press(stops[0] ?? el('div'), 'ArrowUp')
    expect(document.activeElement).toBe(stops[2] ?? null)
    press(stops[2] ?? el('div'), 'ArrowDown')
    expect(document.activeElement).toBe(stops[0] ?? null)
  })

  it('jumps to the ends', () => {
    const stops = rows(4)
    press(stops[0] ?? el('div'), 'End')
    expect(document.activeElement).toBe(stops[3] ?? null)
    press(stops[3] ?? el('div'), 'Home')
    expect(document.activeElement).toBe(stops[0] ?? null)
  })
})

describe('a press a roving stop does not answer', () => {
  it('lets every other key through, so typing into a row still types', () => {
    const stops = rows(2)
    expect(press(stops[0] ?? el('div'), 'a')).toBe(true)
    expect(press(stops[0] ?? el('div'), 'ArrowDown')).toBe(false)
    expect(stops.map((stop) => stop.tabIndex)).toEqual([-1, 0])
  })

  it('ignores a press that came from inside a row rather than from the row', () => {
    // A row holds its own controls, and a press in one of those is that
    // control's to answer. Moving the tab stop for it would take focus out of
    // the field being typed into.
    const stops = rows(2)
    const inner = el('input')
    stops[0]?.append(inner)
    press(inner, 'ArrowDown')
    expect(stops.map((stop) => stop.tabIndex)).toEqual([0, -1])
  })

  it('binds nothing over no controls at all', () => {
    expect(() => bindRovingFocus([])).not.toThrow()
  })
})
