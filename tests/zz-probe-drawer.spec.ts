/**
 * The drawer's seated dismiss control, bound once.
 *
 * A first paint ships the dismiss with no listeners; the live mount binds it.
 * A later mount that adopts the same tree retargets that binding rather than
 * adding a second one, so one click acts once.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { resetDocument } from './dom.ts'
import { mountedRoot, mountLiveChrome, seatedDismiss, seatedToggle } from './shell-chrome-double.ts'

describe('the seated dismiss control', () => {
  it('closes the drawer on one click after another mount adopted the tree', () => {
    resetDocument()
    const root = mountedRoot()
    const frame = mountLiveChrome(root)
    const adopted = mountLiveChrome(root)
    const toggle = seatedToggle(root)
    toggle.click()
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    const dismiss = seatedDismiss(root)
    dismiss.click()
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    adopted.dispose()
    frame.dispose()
  })
})
