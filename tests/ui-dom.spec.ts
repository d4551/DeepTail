/**
 * The element factory every DeepTail surface builds through.
 *
 * These calls paint before any harness bundle loads, and everything a surface
 * says about itself to assistive technology is written here: the role, the
 * accessible state, the roving tab stop a long list is one stop rather than a
 * hundred through, and the `type` that stops a button submitting a form it
 * happens to sit inside. A surface that reached for `setAttribute` itself is
 * how `aria-busy=""` and a missing `aria-live` both got shipped, which is why
 * every one of them is written from one place — and why what that place writes
 * is read here attribute by attribute.
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import type { ActionMarker } from '../apps/deeptail/src/actions/registry.ts'
import {
  button,
  draftField,
  el,
  formActions,
  labelledField,
  liveRegion,
  screenReaderText,
  setAria,
} from '../apps/deeptail/src/ui/dom.ts'
import { resetDocument } from './dom.ts'

/** A marker the registry really declares, which is what a submit carries. */
const SUBMIT: ActionMarker = 'boot-retry'

beforeEach(() => {
  resetDocument()
})

describe('the element factory', () => {
  it('writes the tag, the classes, the text, the role and the data attributes', () => {
    const node = el('section', {
      className: 'pane wide',
      text: 'Harness',
      role: 'region',
      data: { deeptailState: 'ready', deeptailAction: 'drawer' },
    })
    expect(node.outerHTML).toBe(
      '<section class="pane wide" role="region" data-deeptail-state="ready" data-deeptail-action="drawer">Harness</section>',
    )
  })

  it('writes nothing it was not asked for', () => {
    // A class written as empty, a role written as nothing: each is an
    // attribute a stylesheet or a screen reader then reads.
    expect(el('div').outerHTML).toBe('<div></div>')
  })

  it('writes text rather than markup, so a host label can never be markup', () => {
    expect(el('div', { text: '<b>bold</b>' }).outerHTML).toBe('<div>&lt;b&gt;bold&lt;/b&gt;</div>')
  })

  it('writes every accessible state it names, and only where it is asked for', () => {
    const states: readonly (readonly [string, string, string])[] = [
      ['label', 'Paired hosts', 'aria-label'],
      ['hidden', 'true', 'aria-hidden'],
      ['checked', 'true', 'aria-checked'],
      ['expanded', 'false', 'aria-expanded'],
      ['modal', 'true', 'aria-modal'],
      ['haspopup', 'menu', 'aria-haspopup'],
      ['controls', 'panel-1', 'aria-controls'],
      ['live', 'polite', 'aria-live'],
      ['busy', 'true', 'aria-busy'],
      ['describedby', 'why-1', 'aria-describedby'],
      ['labelledby', 'name-1', 'aria-labelledby'],
      ['invalid', 'true', 'aria-invalid'],
      ['current', 'true', 'aria-current'],
    ]
    const written = states.map(([name, value, attribute]) => {
      const node = el('div', { aria: { [name]: value } })
      return [attribute, node.getAttribute(attribute), node.attributes.length]
    })
    expect(written).toEqual(states.map(([, value, attribute]) => [attribute, value, 1]))
  })
})

describe('a state written after a control was built', () => {
  it('is written the same way it would have been at build time', () => {
    // A request going in flight, a value being refused, a menu opening: each
    // is a state written after the control was built, and `aria-busy=""` is
    // what a surface that reached for `toggleAttribute` shipped instead.
    const node = el('div')
    setAria(node, { busy: 'false', expanded: 'true' })
    expect(node.outerHTML).toBe('<div aria-expanded="true" aria-busy="false"></div>')
  })
})

describe('a button', () => {
  it('is typed so it never submits a form it happens to sit inside', () => {
    const pressed: number[] = []
    const node = button('button', 'Retry', () => pressed.push(1))
    expect(node.type).toBe('button')
    expect(node.outerHTML).toBe('<button class="button" type="button">Retry</button>')
  })

  it('runs its handler when it is activated, and not before', () => {
    const pressed: number[] = []
    const node = button('button', 'Retry', () => pressed.push(1))
    expect(pressed).toEqual([])
    node.click()
    node.click()
    expect(pressed).toEqual([1, 1])
  })

  it('carries the role, the state and the data attributes a caller asks for', () => {
    const pressed: number[] = []
    const node = button('button', 'Menu', () => pressed.push(1), {
      role: 'menuitem',
      aria: { haspopup: 'menu', expanded: 'false' },
      data: { deeptailAction: 'drawer' },
    })
    expect(node.outerHTML).toBe(
      '<button class="button" role="menuitem" aria-expanded="false" aria-haspopup="menu" data-deeptail-action="drawer" type="button">Menu</button>',
    )
  })
})

describe('a form’s actions', () => {
  it('submits through the form, so Enter in a field works', () => {
    const cancelled: number[] = []
    const actions = formActions({
      cancelText: 'Cancel',
      submitText: 'Pair',
      submitAction: SUBMIT,
      busy: false,
      cancel: () => cancelled.push(1),
    })
    expect(actions.outerHTML).toBe(
      '<div class="actions"><button class="button button-outline" type="button">Cancel</button>' +
        `<button class="button button-primary" type="submit" data-deeptail-action="${SUBMIT}">Pair</button></div>`,
    )
  })

  it('disables both while an attempt is in flight, so a second cannot race the first', () => {
    const cancelled: number[] = []
    const busy = formActions({
      cancelText: 'Cancel',
      submitText: 'Pair',
      submitAction: SUBMIT,
      busy: true,
      cancel: () => cancelled.push(1),
    })
    expect([...busy.querySelectorAll('button')].map((one) => one.disabled)).toEqual([true, true])
    // Disabled means the handler is not reached, not merely that it looks off.
    busy.querySelector('button')?.click()
    expect(cancelled).toEqual([])
  })

  it('cancels through the caller’s own handler', () => {
    const cancelled: number[] = []
    const actions = formActions({
      cancelText: 'Cancel',
      submitText: 'Pair',
      submitAction: SUBMIT,
      busy: false,
      cancel: () => cancelled.push(1),
    })
    actions.querySelector('button')?.click()
    expect(cancelled).toEqual([1])
  })
})

describe('the parts a surface is assembled from', () => {
  it('announces a live region politely, under the classes it was given', () => {
    expect(liveRegion().outerHTML).toBe('<div class="visually-hidden" role="status" aria-live="polite"></div>')
    expect(liveRegion('strip').outerHTML).toBe('<div class="strip" role="status" aria-live="polite"></div>')
  })

  it('names a control with a label element, which is what names one', () => {
    const control = el('input')
    const field = labelledField('Link', control)
    expect(field.outerHTML).toBe('<label class="field"><span class="label">Link</span><input></label>')
    expect(field.querySelector('input')).toBe(control)
  })

  it('seeds a field from the draft and records every keystroke back into it', () => {
    // A refusal re-renders the form, so a field that did not carry its draft
    // would discard a paste every time the form was shown again.
    const typed: string[] = []
    const control = el('input')
    const field = draftField('Link', control, 'https://box.ts.net/', (value) => typed.push(value))
    expect(control.value).toBe('https://box.ts.net/')
    control.value = 'https://box.ts.net/?token=abc'
    control.dispatchEvent(new Event('input'))
    expect(typed).toEqual(['https://box.ts.net/?token=abc'])
    expect(field.querySelector('span')?.textContent).toBe('Link')
  })

  it('pairs a status with text only assistive technology reads', () => {
    expect(screenReaderText('online').outerHTML).toBe('<span class="visually-hidden">online</span>')
  })
})
