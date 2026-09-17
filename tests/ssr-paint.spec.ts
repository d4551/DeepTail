/**
 * The first paint the build stamps into the one page.
 *
 * An empty `#root` is a client-invented tree. These cases drive the same
 * factories the webview mounts, so a paint that returned nothing, skipped the
 * mount, or drifted from the live tree would fail here rather than in a
 * screenshot. What that markup must be once it is painted is stated in
 * `paint-shell-rules.ts` and driven in `paint-shell-rules.spec.ts`, against the
 * chrome this build really paints; these cases read the factories themselves.
 *
 * The landmarks the contract names are driven over the paint the factories
 * really produce, by dropping each one out of it: a landmark is proved present
 * by the refusal its absence earns, not by a fixture written to look like it.
 *
 * @module
 */

import { afterAll, beforeEach, describe, expect, it } from 'bun:test'
import { firstPaintMarkup } from '../scripts/paint-index.ts'
import { assertPaintedShell, paintOffences } from '../scripts/paint-shell-rules.ts'
import { resetDocument } from './dom.ts'
import { planted } from './paint-fixture.ts'
import { mountedRoot, mountLiveChrome, seatedDismiss, seatedToggle } from './shell-chrome-double.ts'

/** Each landmark the contract names, the part of the paint that carries it, and what its absence is refused for. */
const LANDMARKS: readonly (readonly [string, string, string])[] = [
  [
    '<main class="main">',
    '<div class="main">',
    'the shell carries no main landmark, so the chrome has no reading region',
  ],
  [' aria-label="Session navigation"', ' ', 'the shell carries no nav landmark named for a reader'],
  [
    '<div class="visually-hidden" role="status" aria-live="polite"></div>',
    '',
    'the shell carries no live region, so a change it announces reaches no reader',
  ],
  [' aria-controls="deeptail-sidebar"', ' ', 'the shell carries no control that names the region it opens'],
  ['class="main-title"', '', 'the shell carries no titled heading, so the first paint names no page'],
]

beforeEach(() => {
  resetDocument()
})

// The document is one object for the whole run, so a case that mounts a `#root`
// or writes a sheet into the head leaves both behind for every suite that runs
// after this file — and the paint factories resolve the drawer state off
// `#root`. This file hands the document back the way it found it.
afterAll(() => {
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

  it('paint a chrome that satisfies the contract the build holds it to', () => {
    expect(paintOffences(firstPaintMarkup())).toEqual([])
  })

  it('refuses the paint the moment any one landmark the contract names is dropped', () => {
    // Each part is planted into what the factories paint now, so a landmark
    // this product stopped painting fails by name rather than passing because
    // the same factory wrote both sides of the case.
    for (const [part, instead, why] of LANDMARKS) {
      const dropped = planted(firstPaintMarkup(), part, instead)
      expect([why, paintOffences(dropped)]).toEqual([why, [{ line: 1, why }]])
    }
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
