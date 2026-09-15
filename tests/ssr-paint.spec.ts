/**
 * The first paint the build stamps into the one page.
 *
 * An empty `#root` is a client-invented tree. These cases drive the same
 * factories the webview mounts, so a paint that returned nothing, skipped the
 * mount, or drifted from the live tree would fail here rather than in a
 * screenshot. The page painter's own cases, which read and stamp files, live
 * in `paint-page.spec.ts`.
 *
 * @module
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { assertPaintedShell, firstPaintMarkup } from '../scripts/paint-index.ts'
import { resetDocument } from './dom.ts'
import { mountedRoot, mountLiveChrome, seatedDismiss, seatedToggle } from './shell-chrome-double.ts'

beforeEach(() => {
  resetDocument()
})

describe('the first-paint factories', () => {
  it('paint one main landmark and the named control-plane chrome', () => {
    const painted = firstPaintMarkup()
    expect(painted.includes('<main')).toBe(true)
    expect(painted.includes('data-deeptail-shell')).toBe(true)
    expect(painted.includes('id="deeptail-sidebar"')).toBe(true)
    expect(painted.includes('class="drawer-toggle"')).toBe(true)
    expect(painted.includes('class="placeholder"')).toBe(true)
    expect(painted.split('<main').length - 1).toBe(1)
  })

  it('paints the same tree the live mount builds', () => {
    const host = document.createElement('div')
    const frame = mountLiveChrome(host)
    expect(firstPaintMarkup()).toBe(host.innerHTML)
    frame.dispose()
  })

  it('paints the same markup twice, so a build is not a roll of the dice', () => {
    expect(firstPaintMarkup()).toBe(firstPaintMarkup())
  })

  it('refuses markup that is not the product shell', () => {
    expect(() => assertPaintedShell('')).toThrow('lost the product shell')
    expect(() => assertPaintedShell('<div></div>')).toThrow('lost the product shell')
    expect(() => assertPaintedShell('<main data-deeptail-shell></main>')).toThrow('lost the product shell')
    expect(assertPaintedShell(firstPaintMarkup()).includes('<main')).toBe(true)
  })
})

describe('the live mount', () => {
  it('adopts a first paint rather than inventing a second tree', () => {
    const root = mountedRoot()
    const frame = mountLiveChrome(root)
    expect(root.querySelectorAll('main')).toHaveLength(1)
    const adopted = mountLiveChrome(root)
    expect(root.querySelectorAll('main')).toHaveLength(1)
    expect(root.querySelectorAll('[data-deeptail-shell]')).toHaveLength(1)
    adopted.announce('opened')
    adopted.showError('lost the host')
    expect(root.querySelector('[role="alert"]')?.textContent).toBe('lost the host')
    const toggle = seatedToggle(root)
    toggle.click()
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    root.querySelector('.drawer-scrim')?.dispatchEvent(new Event('click'))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    adopted.dispose()
    frame.dispose()
  })

  it('rebuilds when the first paint is incomplete, and relabels a full one', () => {
    const root = mountedRoot()
    const sheet = document.createElement('style')
    sheet.textContent = '#root { --dsh-drawer: 1; }'
    document.head.append(sheet)
    const frame = mountLiveChrome(root)
    root.querySelector('.main-title')?.remove()
    const rebuilt = mountLiveChrome(root)
    expect(root.querySelector('.main-title')).not.toBeNull()
    rebuilt.dispose()
    const full = mountLiveChrome(root)
    const toggle = seatedToggle(root)
    toggle.click()
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    const dismiss = seatedDismiss(root)
    dismiss.click()
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    full.dispose()
    frame.dispose()
  })
})
