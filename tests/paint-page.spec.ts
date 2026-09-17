/**
 * The page painter, the contract it holds the shipped document to, and the
 * shipped document itself.
 *
 * These cases read and write files, so they carry the filesystem and path
 * modules; the chrome they paint is exercised in `ssr-paint.spec.ts`, which
 * stays free of them. Every rule in `paint-contract.ts` is driven here twice:
 * once against a chrome carrying the defect it exists for, and once against
 * the page this repository actually ships, read off disk. The defects are
 * assembled from parts, so this file's own source carries none of them whole.
 * The chrome fixture and the planted-defect helpers live in `paint-fixture.ts`.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { assertPaintedShell, documentOffences, paintOffences } from '../scripts/paint-contract.ts'
import { EMPTY_ROOT, firstPaintMarkup, paintIndex } from '../scripts/paint-index.ts'
import { DIST_PAGE, paintFile } from '../scripts/paint-stamp.ts'
import {
  CHROME,
  INLINE_SCRIPT,
  mountOf,
  PAGE,
  PRESENTATIONAL,
  planted,
  READING_REGION,
  SEATED,
  SECOND_ENTRY,
  STYLED,
  TITLE_ELEMENT,
  VITE_PAGE,
} from './paint-fixture.ts'
import { TREE_SCAN_BUDGET_MS } from './tree-budget.ts'

describe('the page painter', () => {
  it('seats the chrome in the empty mount and keeps the one module entry', () => {
    const html = paintIndex(VITE_PAGE)
    expect(html.includes(EMPTY_ROOT)).toBe(false)
    expect([...html.matchAll(/<script\b/gu)]).toHaveLength(1)
    expect(html.includes(EMPTY_ROOT)).toBe(false)
  })

  it('paints the same page twice, so a stamp is not a roll of the dice', () => {
    expect(paintIndex(VITE_PAGE)).toBe(paintIndex(VITE_PAGE))
  })

  it('refuses a page that has no empty mount to paint', () => {
    expect(() => paintIndex('<div id="root"><main></main></div>')).toThrow('no empty #root to paint')
  })

  it('refuses a page that already split the module entry', () => {
    const extra = planted(VITE_PAGE, '</head>', `${SECOND_ENTRY}</head>`)
    expect(() => paintIndex(extra)).toThrow('carries 2 scripts')
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

describe('the shell the painted chrome carries', () => {
  it('reads the shipped chrome as conforming', () => {
    expect(paintOffences(CHROME)).toEqual([])
  })

  it('refuses a chrome carrying no shell root, or more than one', () => {
    expect(paintOffences(planted(CHROME, ' data-deeptail-shell=""', ''))).toEqual([
      'the chrome carries 0 product shells; a document carries one',
    ])
    expect(paintOffences(`${CHROME}<div data-deeptail-shell=""></div>`)).toEqual([
      'the chrome carries 2 product shells; a document carries one',
    ])
  })

  it('refuses a shell with no reading region to read', () => {
    expect(paintOffences(planted(CHROME, READING_REGION, '<div class="main">'))).toEqual([
      'the shell carries no main landmark, so the chrome has no reading region',
    ])
  })

  it('refuses a shell whose one heading sits outside its reading region', () => {
    const outside = planted(planted(CHROME, TITLE_ELEMENT, ''), READING_REGION, `${TITLE_ELEMENT}${READING_REGION}`)
    expect(paintOffences(outside)).toEqual([
      'the shell carries its one h1 outside its reading region, so the page names itself outside main',
    ])
  })

  it('refuses a shell carrying more than one h1', () => {
    const twice = planted(CHROME, '</main>', `<h1>Also</h1></main>`)
    expect(paintOffences(twice)).toEqual(['the shell carries 2 h1 headings; a page carries one'])
  })
})

describe('the landmarks and references the painted chrome carries', () => {
  it('refuses a nav landmark named by nothing', () => {
    expect(paintOffences(planted(CHROME, ' aria-label="Session navigation"', ''))).toEqual([
      'the shell carries no nav landmark named for a reader',
    ])
  })

  it('refuses a shell with no live region and no control that names what it opens', () => {
    const silent = planted(CHROME, '<div class="visually-hidden" role="status" aria-live="polite"></div>', '')
    expect(paintOffences(silent)).toEqual([
      'the shell carries no live region, so a change it announces reaches no reader',
    ])
    expect(paintOffences(planted(CHROME, ' aria-controls="deeptail-sidebar"', ''))).toEqual([
      'the shell carries no control that names the region it opens',
    ])
  })

  it('refuses a titled heading that names no page', () => {
    expect(paintOffences(planted(CHROME, '>Sessions<', '><'))).toEqual([
      'the shell carries no titled heading, so the first paint names no page',
    ])
  })

  it('refuses a reference that reaches no id, and an id stated twice', () => {
    expect(paintOffences(planted(CHROME, 'aria-controls="deeptail-sidebar"', 'aria-controls="sidebar-gone"'))).toEqual([
      'aria-controls points at sidebar-gone, which is no id on the page',
    ])
    const twice = planted(CHROME, '</nav>', '</nav><span id="deeptail-sidebar"></span>')
    expect(paintOffences(twice)).toEqual([
      'an id is stated twice, so a reference to it reaches neither: deeptail-sidebar',
    ])
  })

  it('refuses a chrome the markup gate refuses, through the same read', () => {
    expect(paintOffences(planted(CHROME, 'class="shell"', STYLED))).toEqual([
      'line 1: a style attribute is an inline style; put the rule in a stylesheet and add a class',
    ])
    expect(paintOffences(`${CHROME}${PRESENTATIONAL}`)).toEqual([
      'line 1: a retired presentational tag is alignment or type in markup; use the stylesheet',
    ])
  })

  it('refuses markup that is not the product shell at all', () => {
    expect(() => assertPaintedShell('')).toThrow('lost the product shell')
    expect(() => assertPaintedShell('<div></div>')).toThrow('lost the product shell')
    expect(() => assertPaintedShell('<main data-deeptail-shell></main>')).toThrow('lost the product shell')
    expect(assertPaintedShell(CHROME)).toBe(CHROME)
  })
})

describe('the document the painter stamps', () => {
  it('reads the shaped page as conforming', () => {
    expect(documentOffences(PAGE)).toEqual([])
  })

  it('refuses a document that states no language, no title or no viewport', () => {
    expect(documentOffences(planted(PAGE, '<html lang="en">', '<html>'))).toEqual([
      'the document states no language, so a reader is given no pronunciation',
    ])
    expect(documentOffences(planted(PAGE, '<title>DeepTail</title>', '<title></title>'))).toEqual([
      'the document carries 1 non-empty titles; a document carries one',
    ])
    const viewport = '    <meta name="viewport" content="width=device-width, initial-scale=1" />\n'
    expect(documentOffences(planted(PAGE, viewport, ''))).toEqual([
      'the document carries no viewport meta that states width=device-width',
    ])
  })

  it('refuses a document carrying an inline script or a second entry', () => {
    expect(documentOffences(planted(PAGE, '<!doctype html>', `${INLINE_SCRIPT}\n<!doctype html>`))).toEqual([
      'line 1: an inline script is a per-page script; ship a module and load it by src',
      'the document carries 1 scripts that are not one external module entry',
      'the document carries 2 scripts; a page carries one module entry',
    ])
    expect(documentOffences(planted(PAGE, '<!doctype html>', `${SECOND_ENTRY}\n<!doctype html>`))).toEqual([
      'the document carries 2 scripts; a page carries one module entry',
    ])
  })
})

describe('the mount the painter seats', () => {
  it('refuses a document with no chrome in its mount, or with a second mount', () => {
    const emptied = planted(PAGE, SEATED, mountOf(''))
    expect(documentOffences(emptied)).toEqual([
      'the document carries 0 main landmarks; a page carries one',
      'the document carries 0 product shells; a document carries one',
      'the mount carries no product shell, so the shipped page is a client-invented tree',
    ])
    expect(documentOffences(planted(PAGE, SEATED, `${SEATED}${SEATED}`))).toEqual([
      'line 11: a second main splits the shell; a document carries one',
      'the document carries 2 mounts; a page carries one',
      'the document carries 2 main landmarks; a page carries one',
      'the document carries 2 product shells; a document carries one',
    ])
  })

  it('refuses a document whose shell lost its reading region', () => {
    expect(documentOffences(planted(PAGE, READING_REGION, '<div class="main">'))).toEqual([
      'the document carries 0 main landmarks; a page carries one',
      'the shell carries no main landmark, so the chrome has no reading region',
    ])
  })
})

describe('the shipped document', () => {
  it(
    'conforms to the contract, and carries the chrome the factories paint now',
    async () => {
      const html = await readFile(DIST_PAGE, 'utf8')
      expect(documentOffences(html)).toEqual([])
      // Byte for byte, not by landmark: a document stamped before the shell
      // factories last changed still carries a shell, a main and a live
      // region, so every other case here would read it as the shipped page.
      // A build re-stamps it; a test read over a stale build fails here.
      expect(html).toContain(SEATED.replace(CHROME, firstPaintMarkup()))
    },
    TREE_SCAN_BUDGET_MS,
  )
})
