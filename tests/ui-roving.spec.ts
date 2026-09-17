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

/**
 * The controls a case drives, refusing a list the fixture built short.
 *
 * A case that reached for a stand-in control where a stop was missing would
 * press a key on something this list never held, so a short list is the case
 * failing here rather than continuing with something else.
 * @param count - how many controls the list has to hold.
 * @returns the controls, in display order.
 */
function built(count: number): readonly HTMLElement[] {
  const stops = rows(count)
  if (stops.length !== count) throw new Error(`the fixture built ${String(stops.length)} stops, not ${String(count)}`)
  return stops
}

describe('a roving tab stop', () => {
  it('gives the set one stop, on the first control', () => {
    expect(built(3).map((stop) => stop.tabIndex)).toEqual([0, -1, -1])
  })

  it('moves down and up, wrapping at each end', () => {
    const stops = built(3)
    const first = stops[0]
    const second = stops[1]
    const third = stops[2]
    if (first === undefined || second === undefined || third === undefined) throw new Error('the list is short')
    press(first, 'ArrowDown')
    expect([stops.map((stop) => stop.tabIndex), document.activeElement]).toEqual([[-1, 0, -1], second])
    press(second, 'ArrowUp')
    expect(document.activeElement).toBe(first)
    press(first, 'ArrowUp')
    expect(document.activeElement).toBe(third)
    press(third, 'ArrowDown')
    expect(document.activeElement).toBe(first)
  })

  it('jumps to the ends', () => {
    const stops = built(4)
    const first = stops[0]
    const last = stops[3]
    if (first === undefined || last === undefined) throw new Error('the list is short')
    press(first, 'End')
    expect(document.activeElement).toBe(last)
    press(last, 'Home')
    expect(document.activeElement).toBe(first)
  })
})

describe('a press a roving stop does not answer', () => {
  it('lets every other key through, so typing into a row still types', () => {
    const stops = built(2)
    const first = stops[0]
    const second = stops[1]
    if (first === undefined || second === undefined) throw new Error('the list is short')
    expect(press(first, 'a')).toBe(true)
    expect(press(first, 'ArrowDown')).toBe(false)
    expect([first.tabIndex, second.tabIndex]).toEqual([-1, 0])
  })

  it('ignores a press that came from inside a row rather than from the row', () => {
    // A row holds its own controls, and a press in one of those is that
    // control's to answer. Moving the tab stop for it would take focus out of
    // the field being typed into.
    const stops = built(2)
    const first = stops[0]
    const second = stops[1]
    if (first === undefined || second === undefined) throw new Error('the list is short')
    const inner = el('input')
    first.append(inner)
    press(inner, 'ArrowDown')
    expect([first.tabIndex, second.tabIndex]).toEqual([0, -1])
  })

  it('binds nothing over no controls at all', () => {
    expect(() => bindRovingFocus([])).not.toThrow()
  })
})
