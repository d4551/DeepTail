/**
 * The page painter, and the page the build leaves on disk.
 *
 * These cases read and write files, so they carry the filesystem and path
 * modules; the chrome they paint is exercised in `ssr-paint.spec.ts`, which
 * stays free of them. What the contract refuses a chrome and a document for is
 * driven in `paint-shell-rules.spec.ts` and `paint-document-rules.spec.ts`,
 * which read the two halves of it case by case; these cases are about the
 * painter that assembles the page and the gate that reads the file it wrote.
 *
 * The suite over the built page is what makes the contract a gate: the file the
 * build writes is read off disk, held to every rule, held byte for byte to the
 * chrome the factories paint now, and read once more through the gate program
 * run as a process — so a build that shipped an unpainted page fails here.
 *
 * @module
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { assertPaintedDocument, BUILT_PAGE, documentOffences } from '../scripts/paint-document-rules.ts'
import { builtPages, GATE, gateOutcome } from '../scripts/paint-gate.ts'
import { EMPTY_ROOT, firstPaintMarkup, paintIndex } from '../scripts/paint-index.ts'
import { DIST_PAGE, paintFile, readPage } from '../scripts/paint-stamp.ts'
import { ROOT } from '../scripts/source-tree.ts'
import { resetDocument } from './dom.ts'
import { CHROME, mountOf, named, planted, SEATED, SECOND_ENTRY, VITE_PAGE } from './paint-fixture.ts'
import { TREE_SCAN_BUDGET_MS } from './tree-budget.ts'

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

// The factories read the document they are called in: the chrome's drawer
// state is a style resolved off `#root`, and the build stamps the page in a
// document that has none. So every case here paints into a document the case
// before it did not leave behind, which is the document the stamp saw.
beforeEach(() => {
  resetDocument()
})

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
})

describe('the stamp the painter writes', () => {
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
})

describe('the gate program', () => {
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
