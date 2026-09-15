/**
 * The page painter, and the shipped document it stamps.
 *
 * These cases read and write files, so they carry the filesystem and path
 * modules; the chrome they paint is exercised in `ssr-paint.spec.ts`, which
 * stays free of them.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { EMPTY_ROOT, paintIndex } from '../scripts/paint-index.ts'
import { DIST_PAGE, paintFile } from '../scripts/paint-stamp.ts'
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

describe('the page painter', () => {
  it('seats the chrome in the empty mount and keeps the one module entry', () => {
    const html = paintIndex(VITE_PAGE)
    expect(html.includes(EMPTY_ROOT)).toBe(false)
    expect([...html.matchAll(/<script\b/gu)]).toHaveLength(1)
    expect(html.includes('<div id="root"></div>')).toBe(false)
  })

  it('paints the same page twice, so a stamp is not a roll of the dice', () => {
    expect(paintIndex(VITE_PAGE)).toBe(paintIndex(VITE_PAGE))
  })

  it('refuses a page that has no empty mount to paint', () => {
    expect(() => paintIndex('<div id="root"><main></main></div>')).toThrow('no empty #root to paint')
  })

  it('refuses a page that already split the module entry', () => {
    const extra = VITE_PAGE.replace('</head>', '<script src="./other.js"></script></head>')
    expect(() => paintIndex(extra)).toThrow('exactly one script')
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
