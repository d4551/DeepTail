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
import { joined } from './fixtures.ts'
import { TREE_SCAN_BUDGET_MS } from './tree-budget.ts'

/** A style attribute, assembled so this file does not carry one whole. */
const STYLED = joined(' class="shell" st', 'yle="color: red"')

/** A presentational element the platform retired, assembled the same way. */
const PRESENTATIONAL = joined('<mar', 'quee>a</mar', 'quee>')

/** An inline script, assembled so this file does not carry one whole. */
const INLINE_SCRIPT = joined('<scr', 'ipt></scr', 'ipt>')

/** A second external module entry, which a page may carry only one of. */
const SECOND_ENTRY = '<script type="module" src="./other.js"></script>'

/** The opening of the one mount a page carries. */
const MOUNT = '<div id="root">'

/** The one mount, carrying one thing and closed. */
const mountOf = (content: string): string => `${MOUNT}${content}</div>`

/** The shell's own title element, which the contract reads by name. */
const TITLE_ELEMENT = '<h1 class="main-title">Sessions</h1>'

/** The reading region the shell opens. */
const READING_REGION = '<main class="main">'

/**
 * The chrome the painter seats, shaped the way the shell factories paint it.
 *
 * A fixture rather than the paint itself, because the planted defects below
 * are edits to one part of it: reading the real paint would make every case
 * answer for whatever the factories happen to draw today.
 */
const CHROME = [
  '<div class="shell" data-deeptail-shell="" data-drawer="closed">',
  '<div class="drawer-scrim"></div>',
  '<nav class="sidebar" aria-label="Session navigation" id="deeptail-sidebar">',
  '<button class="drawer-dismiss" type="button" hidden="">Hide the session list</button>',
  '<div class="brand-row"><span class="brand-name">DEEPTAIL</span></div>',
  '</nav>',
  READING_REGION,
  '<div class="main-header">',
  '<button class="drawer-toggle" type="button" aria-expanded="false" aria-controls="deeptail-sidebar">Show</button>',
  TITLE_ELEMENT,
  '</div>',
  '<div class="main-body"><div class="placeholder">Choose a session.</div></div>',
  '<div class="visually-hidden" role="status" aria-live="polite"></div>',
  '</main>',
  '</div>',
].join('')

/** The one mount with that chrome seated in it. */
const SEATED = mountOf(CHROME)

/**
 * The page Vite writes around one body.
 * @param body - the body's content, verbatim.
 * @returns the built page.
 */
function pageWith(body: string): string {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="utf-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
    '    <title>DeepTail</title>',
    '    <script type="module" crossorigin src="./assets/index.js"></script>',
    '    <link rel="stylesheet" crossorigin href="./assets/index.css">',
    '  </head>',
    '  <body>',
    `    ${body}`,
    '  </body>',
    '</html>',
  ].join('\n')
}

/** The page as Vite leaves it: the mount empty, for the painter to seat. */
const VITE_PAGE = pageWith(EMPTY_ROOT)

/** The page as the painter stamps it: the mount carrying the chrome. */
const PAGE = pageWith(SEATED)

/**
 * One string with one part of it replaced, refusing a fixture that no longer
 * carries the part a case plants against.
 * @param text - the text to edit.
 * @param from - the part to replace, which must be there.
 * @param to - what to replace it with.
 * @returns the edited text.
 */
function planted(text: string, from: string, to: string): string {
  if (!text.includes(from)) throw new Error(`deeptail: the fixture no longer carries ${from}`)
  return text.replace(from, to)
}

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

describe('the contract the painted chrome is held to', () => {
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

describe('the contract the built document is held to', () => {
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

  it('refuses a document with no chrome in its mount, or with a second mount', () => {
    const emptied = planted(PAGE, SEATED, mountOf(''))
    expect(documentOffences(emptied)).toEqual([
      'the document carries 0 main landmarks; a page carries one',
      'the mount carries no product shell, so the shipped page is a client-invented tree',
    ])
    expect(documentOffences(planted(PAGE, SEATED, `${SEATED}${SEATED}`))).toEqual([
      'the document carries 2 mounts; a page carries one',
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
