/**
 * The first paint the build stamps into the one page.
 *
 * An empty `#root` is a client-invented tree. These cases drive the same
 * factories the webview mounts, and the painter that writes them into the
 * shipped document, so a paint that returned nothing, skipped the mount, or
 * left a second script would fail here rather than in a screenshot.
 *
 * @module
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createTranslate } from '../apps/deeptail/src/locales.ts'
import { mountShellFrame } from '../apps/deeptail/src/ui/shell-frame.ts'
import {
  assertPaintedShell,
  DIST_PAGE,
  EMPTY_ROOT,
  firstPaintMarkup,
  paintFile,
  paintIndex,
} from '../scripts/paint-index.ts'
import { resetDocument } from './dom.ts'
import { TREE_SCAN_BUDGET_MS } from './tree-budget.ts'

/** A Vite-shaped page carrying the empty mount and the one module entry. */
const VITE_PAGE = `<!doctype html>
<html lang="en">
  <head>
    <script type="module" crossorigin src="./assets/index.js"></script>
  </head>
  <body>
    ${EMPTY_ROOT}
  </body>
</html>
`

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
    const frame = mountShellFrame(host, createTranslate('en'))
    expect(firstPaintMarkup()).toBe(host.innerHTML)
    frame.dispose()
  })

  it('paints the same markup twice, so a build is not a roll of the dice', () => {
    expect(firstPaintMarkup()).toBe(firstPaintMarkup())
  })
})

describe('the page painter', () => {
  it('seats that chrome in the empty mount and keeps the one module entry', () => {
    const painted = firstPaintMarkup()
    const html = paintIndex(VITE_PAGE)
    expect(html.includes(painted)).toBe(true)
    expect(html.includes(EMPTY_ROOT)).toBe(false)
    expect([...html.matchAll(/<script\b/gu)]).toHaveLength(1)
    expect(html.includes('<div id="root"></div>')).toBe(false)
  })

  it('refuses a page that has no empty mount to paint', () => {
    expect(() => paintIndex('<div id="root"><main></main></div>')).toThrow('no empty #root to paint')
  })

  it('refuses a page that already split the module entry', () => {
    const extra = VITE_PAGE.replace('</head>', '<script src="./other.js"></script></head>')
    expect(() => paintIndex(extra)).toThrow('exactly one script')
  })

  it('refuses markup that is not the product shell', () => {
    expect(() => assertPaintedShell('')).toThrow('lost the product shell')
    expect(() => assertPaintedShell('<div></div>')).toThrow('lost the product shell')
    expect(assertPaintedShell(firstPaintMarkup()).includes('<main')).toBe(true)
  })

  it('stamps a built page on disk', async () => {
    const root = await mkdtemp(join(tmpdir(), 'deeptail-paint-'))
    const page = join(root, 'index.html')
    await writeFile(page, VITE_PAGE)
    paintFile(page)
    const html = await readFile(page, 'utf8')
    expect(html.includes('<main')).toBe(true)
    expect(html.includes(EMPTY_ROOT)).toBe(false)
    await rm(root, { recursive: true, force: true })
  })
})

describe('the live mount', () => {
  it('adopts a first paint rather than inventing a second tree', () => {
    const root = document.createElement('div')
    root.id = 'root'
    document.body.append(root)
    const frame = mountShellFrame(root, createTranslate('en'))
    expect(root.querySelectorAll('main')).toHaveLength(1)
    const adopted = mountShellFrame(root, createTranslate('zh'))
    expect(root.querySelectorAll('main')).toHaveLength(1)
    expect(root.querySelectorAll('[data-deeptail-shell]')).toHaveLength(1)
    adopted.announce('opened')
    adopted.showError('lost the host')
    expect(root.querySelector('[role="alert"]')?.textContent).toBe('lost the host')
    const toggle = root.querySelector('.drawer-toggle')
    if (!(toggle instanceof HTMLButtonElement)) throw new Error('missing drawer toggle')
    toggle.click()
    root.querySelector('.drawer-scrim')?.dispatchEvent(new Event('click'))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    adopted.dispose()
    frame.dispose()
  })

  it('rebuilds when the first paint is incomplete, and relabels a full one', () => {
    const root = document.createElement('div')
    root.id = 'root'
    const sheet = document.createElement('style')
    sheet.textContent = '#root { --dsh-drawer: 1; }'
    document.head.append(sheet)
    document.body.append(root)
    const frame = mountShellFrame(root, createTranslate('en'))
    root.querySelector('.main-title')?.remove()
    const rebuilt = mountShellFrame(root, createTranslate('en'))
    expect(root.querySelector('.main-title')).not.toBeNull()
    rebuilt.dispose()
    const full = mountShellFrame(root, createTranslate('en'))
    const toggle = root.querySelector('.drawer-toggle')
    if (!(toggle instanceof HTMLButtonElement)) throw new Error('missing drawer toggle')
    toggle.click()
    const dismiss = root.querySelector('.drawer-dismiss')
    if (!(dismiss instanceof HTMLButtonElement)) throw new Error('missing drawer dismiss')
    dismiss.click()
    full.dispose()
    frame.dispose()
  })
})

describe('the shipped document', () => {
  it(
    'contains the product shell the factories paint',
    async () => {
      const html = await readFile(DIST_PAGE, 'utf8')
      expect(html.includes('<main')).toBe(true)
      expect(html.includes('data-deeptail-shell')).toBe(true)
      expect(html.includes(EMPTY_ROOT)).toBe(false)
      expect([...html.matchAll(/<script\b/gu)]).toHaveLength(1)
    },
    TREE_SCAN_BUDGET_MS,
  )
})
