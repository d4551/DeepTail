/**
 * The drawer's seated controls, bound once.
 *
 * A first paint ships the toggle and the dismiss with no listeners; the live
 * mount binds them. A later mount that adopts the same tree retargets that
 * binding rather than adding a second one, so one click acts once.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { resetDocument } from './dom.ts'
import { mountedRoot, mountLiveChrome, seatedToggle } from './shell-chrome-double.ts'

describe('the seated drawer controls', () => {
  it('open on one click while the first mount holds the binding', () => {
    resetDocument()
    const root = mountedRoot()
    const frame = mountLiveChrome(root)
    const toggle = seatedToggle(root)
    toggle.click()
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    frame.dispose()
  })

  it('open on one click after another mount adopted the tree', () => {
    resetDocument()
    const root = mountedRoot()
    const frame = mountLiveChrome(root)
    const adopted = mountLiveChrome(root)
    const toggle = seatedToggle(root)
    toggle.click()
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    adopted.dispose()
    frame.dispose()
  })
})
