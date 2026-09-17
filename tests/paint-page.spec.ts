/**
 * The page painter, the contract it holds the shipped document to, and the
 * shipped document itself.
 *
 * These cases read and write files, so they carry the filesystem and path
 * modules; the chrome they paint is exercised in `ssr-paint.spec.ts`, which
 * stays free of them. Every rule in `paint-contract.ts` is driven here twice:
 * once against a chrome carrying the defect it exists for, and once against the
 * page this repository actually ships, read off disk. The defects are assembled
 * from parts, so this file's own source carries none of them whole.
 *
 * The suite over the built page is what makes the contract a gate: the file the
 * build writes is read off disk, held to every rule, held byte for byte to the
 * chrome the factories paint now, and read once more through the gate program
 * run as a process — so a build that shipped an unpainted page fails here.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  assertPaintedDocument,
  assertPaintedShell,
  BUILT_PAGE,
  documentOffences,
  type PaintOffence,
  paintOffences,
} from '../scripts/paint-contract.ts'
import { builtPages, GATE, gateOutcome } from '../scripts/paint-gate.ts'
import { EMPTY_ROOT, firstPaintMarkup, paintIndex } from '../scripts/paint-index.ts'
import { DIST_PAGE, paintFile, readPage } from '../scripts/paint-stamp.ts'
import { ROOT } from '../scripts/source-tree.ts'
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

/**
 * Every refusal as `line: what it says`, so a case pins the message and the
 * line it sits on rather than only that something was refused.
 * @param offences - the refusals to render.
 * @returns one line per refusal.
 */
function named(offences: readonly PaintOffence[]): string[] {
  return offences.map((offence) => `${String(offence.line)}: ${offence.why}`)
}

/**
 * Run the paint gate over one page written for a case.
 * @param html - the page to write and read.
 * @returns what the gate found.
 */
async function outcomeFor(html: string): Promise<Awaited<ReturnType<typeof gateOutcome>>> {
  const root = await mkdtemp(join(tmpdir(), 'deeptail-gate-'))
  const page = join(root, 'index.html')
  await writeFile(page, html)
  const outcome = await gateOutcome([{ label: 'page.html', path: page }])
  await rm(root, { recursive: true, force: true })
  return outcome
}

describe('the page painter', () => {
  it('seats the chrome in the empty mount and keeps the one module entry', () => {
    const html = paintIndex(VITE_PAGE)
    expect(html.includes(EMPTY_ROOT)).toBe(false)
    expect([...html.matchAll(/<script\b/gu)]).toHaveLength(1)
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

  it('refuses a document that is not the page this paint owes', () => {
    expect(() => assertPaintedDocument(mountOf(''))).toThrow('the stamped page is not the product document')
  })

  it('stamps a built page on disk, and reads back the bytes that landed', async () => {
    const root = await mkdtemp(join(tmpdir(), 'deeptail-paint-'))
    const page = join(root, 'index.html')
    await writeFile(page, VITE_PAGE)
    paintFile(page)
    const html = await readFile(page, 'utf8')
    expect(html.includes('<main')).toBe(true)
    expect(html.includes(EMPTY_ROOT)).toBe(false)
    expect(named(documentOffences(readPage(page)))).toEqual([])
    await rm(root, { recursive: true, force: true })
  })

  it('refuses a built page that is not there, and one that holds nothing', async () => {
    // The two states a painter would read as an empty string and stamp over: a
    // page the build never wrote, and a page that landed empty.
    const root = await mkdtemp(join(tmpdir(), 'deeptail-paint-'))
    const page = join(root, 'index.html')
    expect(() => readPage(page)).toThrow(`there is no built page at ${page}`)
    expect(() => paintFile(page)).toThrow('there is no built page at')
    await writeFile(page, '   \n')
    expect(() => readPage(page)).toThrow('is empty')
    await rm(root, { recursive: true, force: true })
  })
})

describe('the shell the painted chrome carries', () => {
  it('reads the shipped chrome as conforming', () => {
    expect(paintOffences(CHROME)).toEqual([])
  })

  it('refuses a chrome carrying no shell root, or more than one', () => {
    expect(named(paintOffences(planted(CHROME, ' data-deeptail-shell=""', '')))).toEqual([
      '1: the chrome carries 0 product shells; a document carries one',
    ])
    expect(named(paintOffences(`${CHROME}<div data-deeptail-shell=""></div>`))).toEqual([
      '1: the chrome carries 2 product shells; a document carries one',
    ])
  })

  it('refuses a shell with no reading region to read', () => {
    expect(named(paintOffences(planted(CHROME, READING_REGION, '<div class="main">')))).toEqual([
      '1: the shell carries no main landmark, so the chrome has no reading region',
    ])
  })

  it('refuses a nav landmark that names nothing, and admits a named one', () => {
    expect(named(paintOffences(planted(CHROME, ' aria-label="Session navigation"', '')))).toEqual([
      '1: the shell carries no nav landmark named for a reader',
    ])
    // A label stated and left blank names nothing either: it reads as no name.
    expect(named(paintOffences(planted(CHROME, 'aria-label="Session navigation"', 'aria-label="  "')))).toEqual([
      '1: the shell carries no nav landmark named for a reader',
    ])
    expect(paintOffences(planted(CHROME, 'aria-label="Session navigation"', 'aria-label="Sessions"'))).toEqual([])
  })

  it('refuses a shell with no live region, and admits one spelled in any case', () => {
    const quiet = '<div class="visually-hidden" role="status" aria-live="polite"></div>'
    expect(named(paintOffences(planted(CHROME, quiet, '')))).toEqual([
      '1: the shell carries no live region, so a change it announces reaches no reader',
    ])
    // `role` and `aria-live` are read as case-insensitive, the way a browser
    // reads them, so neither value is refused for the case it is spelled in.
    const shouted = '<div class="visually-hidden" role="STATUS" aria-live="POLITE"></div>'
    expect(paintOffences(planted(CHROME, quiet, shouted))).toEqual([])
  })

  it('refuses a shell with no control that names what it opens', () => {
    expect(named(paintOffences(planted(CHROME, ' aria-controls="deeptail-sidebar"', '')))).toEqual([
      '1: the shell carries no control that names the region it opens',
    ])
  })

  it('refuses a titled heading that names no page', () => {
    expect(named(paintOffences(planted(CHROME, '>Sessions<', '><')))).toEqual([
      '1: the shell carries no titled heading, so the first paint names no page',
    ])
    expect(named(paintOffences(planted(CHROME, TITLE_ELEMENT, '<h1 class="row-title">Sessions</h1>')))).toEqual([
      '1: the shell carries no titled heading, so the first paint names no page',
    ])
  })

  it('reads the titled heading by its class token, so one class more is still the heading', () => {
    expect(paintOffences(planted(CHROME, TITLE_ELEMENT, '<h1 class="main-title row-title">Sessions</h1>'))).toEqual([])
    expect(named(paintOffences(planted(CHROME, 'class="main-title"', 'class="main-title-extra"')))).toEqual([
      '1: the shell carries no titled heading, so the first paint names no page',
    ])
  })

  it('refuses a shell carrying more than one h1, and one whose h1 sits outside main', () => {
    const twice = planted(CHROME, '</main>', '<h1>Also</h1></main>')
    expect(named(paintOffences(twice))).toEqual(['1: the shell carries 2 h1 headings; a page carries one'])
    const outside = planted(planted(CHROME, TITLE_ELEMENT, ''), READING_REGION, `${TITLE_ELEMENT}${READING_REGION}`)
    expect(named(paintOffences(outside))).toEqual([
      '1: the shell carries its one h1 outside its reading region, so the page names itself outside main',
    ])
  })
})

describe('the references the painted chrome carries', () => {
  it('refuses a reference that reaches no id, and an id stated twice', () => {
    const dangling = planted(CHROME, 'aria-controls="deeptail-sidebar"', 'aria-controls="sidebar-gone"')
    expect(named(paintOffences(dangling))).toEqual([
      '1: aria-controls points at sidebar-gone, which is no id on the page',
    ])
    const twice = planted(CHROME, '</nav>', '</nav><span id="deeptail-sidebar"></span>')
    expect(named(paintOffences(twice))).toEqual([
      '1: an id is stated twice, so a reference to it reaches neither: deeptail-sidebar',
    ])
  })

  it('admits references that resolve, however they are spaced', () => {
    const padded = planted(CHROME, 'aria-controls="deeptail-sidebar"', 'aria-controls="  deeptail-sidebar  "')
    expect(paintOffences(padded)).toEqual([])
    const both = 'aria-controls="deeptail-sidebar" aria-describedby="deeptail-sidebar"'
    expect(paintOffences(planted(CHROME, 'aria-controls="deeptail-sidebar"', both))).toEqual([])
    // One more id, stated once and reached once, is not a duplicate.
    const reached = planted(CHROME, '</nav>', '</nav><span id="other"></span><button aria-labelledby="other"></button>')
    expect(paintOffences(reached)).toEqual([])
  })

  it('refuses a chrome the markup gate refuses, through the same read', () => {
    expect(named(paintOffences(planted(CHROME, 'class="shell"', STYLED)))).toEqual([
      '1: a style attribute is an inline style; put the rule in a stylesheet and add a class',
    ])
    expect(named(paintOffences(`${CHROME}${PRESENTATIONAL}`))).toEqual([
      '1: a retired presentational tag is alignment or type in markup; use the stylesheet',
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
    expect(named(documentOffences(planted(PAGE, '<html lang="en">', '<html>')))).toEqual([
      '2: the document states no language, so a reader is given no pronunciation',
    ])
    expect(named(documentOffences(planted(PAGE, '<html lang="en">', '<html lang="">')))).toEqual([
      '2: the document states no language, so a reader is given no pronunciation',
    ])
    expect(named(documentOffences(planted(PAGE, '<title>DeepTail</title>', '<title></title>')))).toEqual([
      '6: the document carries 1 non-empty titles; a document carries one',
    ])
    const fixed = planted(PAGE, 'width=device-width', 'width=1024')
    expect(named(documentOffences(fixed))).toEqual([
      '5: the document carries no viewport meta that states width=device-width',
    ])
    const meta = '    <meta name="viewport" content="width=device-width, initial-scale=1" />\n'
    expect(named(documentOffences(planted(PAGE, meta, '')))).toEqual([
      '2: the document carries no viewport meta that states width=device-width',
    ])
  })

  it('refuses a document carrying an inline script or a second entry', () => {
    expect(named(documentOffences(planted(PAGE, '<!doctype html>', `${INLINE_SCRIPT}\n<!doctype html>`)))).toEqual([
      '1: an inline script is a per-page script; ship a module and load it by src',
      '1: the document carries 1 scripts that are not one external module entry',
      '1: the document carries 2 scripts; a page carries one module entry',
    ])
    expect(named(documentOffences(planted(PAGE, '<!doctype html>', `${SECOND_ENTRY}\n<!doctype html>`)))).toEqual([
      '1: the document carries 2 scripts; a page carries one module entry',
    ])
  })

  it('refuses a single entry that is not a module', () => {
    expect(named(documentOffences(planted(PAGE, ' type="module" crossorigin', '')))).toEqual([
      '7: the document holds one script entry and it is not a module; a page loads its module by type="module"',
    ])
  })

  it('refuses a document whose chrome lost a landmark, through the same chrome rules', () => {
    expect(named(documentOffences(planted(PAGE, ' aria-controls="deeptail-sidebar"', '')))).toEqual([
      '11: the shell carries no control that names the region it opens',
    ])
  })

  it('reads a reference and a duplicate id over the whole document, not only the chrome', () => {
    // A reference written beside the shell, and an id beside the shell that
    // repeats one the shell carries: both are defects of the document.
    const dangling = planted(PAGE, '</body>', '<div aria-labelledby="nowhere"></div></body>')
    expect(named(documentOffences(dangling))).toEqual([
      '12: aria-labelledby points at nowhere, which is no id on the page',
    ])
    const twice = planted(PAGE, '</body>', '<span id="deeptail-sidebar"></span></body>')
    expect(named(documentOffences(twice))).toEqual([
      '12: an id is stated twice, so a reference to it reaches neither: deeptail-sidebar',
    ])
    const late = planted(PAGE, '</body>', '<div aria-controls="late"></div><span id="late"></span></body>')
    expect(documentOffences(late)).toEqual([])
  })
})

describe('the mount the painter seats', () => {
  it('refuses a document with no chrome in its mount', () => {
    expect(named(documentOffences(planted(PAGE, SEATED, mountOf(''))))).toEqual([
      '11: the document carries 0 main landmarks; a page carries one',
      '11: the document carries 0 product shells; a document carries one',
      '11: the mount carries no product shell, so the shipped page is a client-invented tree',
    ])
  })

  it('refuses a document carrying a second mount and a second shell', () => {
    const doubled = [
      '11: a second main splits the shell; a document carries one',
      '11: the document carries 2 mounts; a page carries one',
      '11: the document carries 2 main landmarks; a page carries one',
      '11: the document carries 2 product shells; a document carries one',
      '11: an id is stated twice, so a reference to it reaches neither: root',
      '11: an id is stated twice, so a reference to it reaches neither: deeptail-sidebar',
    ]
    expect(named(documentOffences(planted(PAGE, SEATED, `${SEATED}${SEATED}`)))).toEqual(doubled)
    const shellTwice = [
      '11: a second main splits the shell; a document carries one',
      '11: the document carries 2 main landmarks; a page carries one',
      '11: the document carries 2 product shells; a document carries one',
      '11: an id is stated twice, so a reference to it reaches neither: deeptail-sidebar',
    ]
    expect(named(documentOffences(planted(PAGE, CHROME, `${CHROME}${CHROME}`)))).toEqual(shellTwice)
  })

  it('refuses a shell seated outside the mount, which the client adopts nothing from', () => {
    expect(named(documentOffences(planted(PAGE, SEATED, `${mountOf('')}${CHROME}`)))).toEqual([
      '11: the product shell sits outside the mount, so the client adopts nothing where it looks',
    ])
  })

  it('refuses a document whose shell lost its reading region', () => {
    expect(named(documentOffences(planted(PAGE, READING_REGION, '<div class="main">')))).toEqual([
      '11: the document carries 0 main landmarks; a page carries one',
      '11: the shell carries no main landmark, so the chrome has no reading region',
    ])
  })
})

describe('the built page the gate reads', () => {
  it(
    'reads the page the build wrote, at the path it wrote it to, and holds it to the contract',
    async () => {
      const pages = builtPages()
      expect(pages.map((page) => page.label)).toEqual([BUILT_PAGE])
      const html = await readFile(DIST_PAGE, 'utf8')
      expect(documentOffences(html)).toEqual([])
      // Byte for byte, not by landmark: a document stamped before the shell
      // factories last changed still carries a shell, a main and a live
      // region, so every other case here would read it as the shipped page.
      // A build re-stamps it; a test read over a stale build fails here.
      expect(html).toContain(SEATED.replace(CHROME, firstPaintMarkup()))
      const outcome = await gateOutcome()
      expect([outcome.ok, outcome.text]).toEqual([true, `${GATE.clean(pages.length)}\n`])
    },
    TREE_SCAN_BUDGET_MS,
  )

  it('refuses a selection that reaches no page, rather than reporting a clean run over nothing', async () => {
    const outcome = await gateOutcome([])
    expect(outcome.ok).toBe(false)
    expect(outcome.text).toBe(
      'the built page is not the document this paint owes:\n' +
        `  ${BUILT_PAGE}:1: the gate selected no built page to read; run the app build before it\n`,
    )
  })

  it('refuses the defects a page on disk carries, naming each one', async () => {
    const outcome = await outcomeFor(mountOf(''))
    expect(outcome.ok).toBe(false)
    expect(outcome.text).toContain(
      'page.html:1: the mount carries no product shell, so the shipped page is a client-invented tree',
    )
  })

  it(
    'runs as its own program, over the page the build left on disk',
    async () => {
      const run = Bun.spawn([process.execPath, join(ROOT, 'scripts/paint-gate.ts')], {
        cwd: ROOT,
        stdout: 'pipe',
        stderr: 'pipe',
      })
      const [out, err, code] = await Promise.all([
        new Response(run.stdout).text(),
        new Response(run.stderr).text(),
        run.exited,
      ])
      expect([code, err, out]).toEqual([0, '', `${GATE.clean(1)}\n`])
    },
    TREE_SCAN_BUDGET_MS,
  )
})
