/**
 * The shipped document, as the webview loads it.
 *
 * The unit suite drives the painter and the contract the page is held to.
 * These cases read the bytes the build wrote, and the tree a real engine makes
 * of them, at the three moments that decide whether there is a first paint at
 * all: with the module entry held back, so the shipped chrome can be read
 * before anything adopts it; with the entry refused, which is the page a reader
 * whose bundle never arrives is left with; and with the entry released, so the
 * live mount can be shown to have adopted that same tree rather than building a
 * second one.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { documentOffences } from '../../../scripts/paint-document-rules.ts'
import { AUDIT_RULES } from './audit-rules.ts'
import { oneHost } from './fixtures.ts'
import { BUILT_PAGE, type Harness, startHarness } from './harness.ts'
import { waitForLiveShell } from './surfaces.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('ships one module entry and the product shell, which the contract reads as the product document', async () => {
  const html = await Bun.file(BUILT_PAGE).text()
  expect(documentOffences(html)).toEqual([])
  expect(html.includes('<main')).toBe(true)
  expect(html.includes('data-deeptail-shell')).toBe(true)
  expect(html.includes('<div id="root"></div>')).toBe(false)
  expect([...html.matchAll(/<script\b/gu)]).toHaveLength(1)
})

it('seats the shell in the document a reader gets before any module runs', async () => {
  const page = await harness.open(oneHost(), { entry: 'block' })
  expect(await page.locator('[data-deeptail-shell]').count()).toBe(1)
  expect(await page.locator('#root > [data-deeptail-shell]').count()).toBe(1)
  expect(await page.locator('[data-deeptail-shell] main').count()).toBe(1)
  expect(await page.locator('nav[aria-label]').count()).toBe(1)
  expect(await page.locator('[role="status"][aria-live="polite"]').count()).toBe(1)
  // The page a reader is left with names itself and says what to do, which is
  // all a first paint can promise before a host has answered.
  expect(((await page.locator('h1').textContent()) ?? '').trim()).not.toBe('')
  expect(((await page.locator('.placeholder').textContent()) ?? '').trim()).not.toBe('')
  const facts = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    title: document.title.trim(),
    viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? '',
    scripts: [...document.scripts].map((script) => ({ src: script.src, body: script.textContent ?? '' })),
  }))
  expect(facts.lang).not.toBe('')
  expect(facts.title).not.toBe('')
  expect(facts.viewport).toContain('width=device-width')
  expect(facts.scripts).toHaveLength(1)
  expect(facts.scripts[0]?.src).not.toBe('')
  expect(facts.scripts[0]?.body).toBe('')
  await page.close()
}, 60_000)

it('is a conformant page with the module entry never arriving', async () => {
  const page = await harness.open(oneHost(), { entry: 'block' })
  const evidence = await harness.auditEvidence(page, AUDIT_RULES)
  expect(evidence.engine).not.toBe('')
  expect(evidence.runs.filter((run) => run.rules === 0)).toEqual([])
  expect(evidence.findings).toEqual([])
  await page.close()
}, 60_000)

it('adopts the chrome the document shipped rather than building a second tree', async () => {
  const page = await harness.open(oneHost(), { entry: 'hold' })
  await waitForLiveShell(page)
  // Every node is asked about by identity: the tree the document carried was
  // recorded as the parser created it, so a node the live mount built is one
  // that record never held.
  const adopted = await page.evaluate(() => {
    const shipped = window.deeptailSsrShipped
    if (shipped === undefined) throw new Error('the shipped tree was never recorded')
    const main = document.querySelector('main')
    const shell = document.querySelector('[data-deeptail-shell]')
    const toggle = document.querySelector('.drawer-toggle')
    return {
      main: main !== null && shipped(main),
      shell: shell !== null && shipped(shell),
      toggle: toggle !== null && shipped(toggle),
      mains: document.querySelectorAll('main').length,
      shells: document.querySelectorAll('[data-deeptail-shell]').length,
    }
  })
  expect(adopted).toEqual({ main: true, shell: true, toggle: true, mains: 1, shells: 1 })
  await page.close()
}, 60_000)

it('hands a reader whose engine runs no script the document it served', async () => {
  const page = await harness.open(oneHost(), { scriptingOff: true })
  const response = await page.reload()
  const html = (await response?.text()) ?? ''
  expect(documentOffences(html)).toEqual([])
  expect(html.includes('data-deeptail-shell')).toBe(true)
  expect(await page.locator('[data-deeptail-shell]').count()).toBe(1)
  expect(await page.locator('main h1').count()).toBe(1)
  await page.close()
}, 60_000)

it('adopts that chrome and fires the drawer toggle', async () => {
  const page = await harness.open(oneHost(), { mobile: true })
  await waitForLiveShell(page)
  expect(await page.locator('main').count()).toBe(1)
  const toggle = page.locator('.drawer-toggle')
  await toggle.click()
  expect(await toggle.getAttribute('aria-expanded')).toBe('true')
  await page.close()
})
