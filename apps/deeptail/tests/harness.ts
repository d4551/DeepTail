/**
 * Shared browser-test harness: a static server over the built bundle, one
 * Chromium, and a scripted Tauri IPC surface.
 *
 * Only the IPC boundary is substituted. `invoke()` reaches
 * `window.__TAURI_INTERNALS__.invoke`, which no browser provides, so each test
 * installs a scripted one. Everything above it is the shipped code.
 */

import { readFile } from 'node:fs/promises'
import { createServer, type Server, type ServerResponse } from 'node:http'
import { extname, join, normalize } from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { type Browser, chromium, type Page } from 'playwright'
import { type AnswerTable, initScriptSource, type RecordedCall } from './tauri-ipc.ts'

export type { AnswerTable } from './tauri-ipc.ts'

/** Shape of the optional `tests/chromium.json` override. */
interface ChromiumConfig {
  readonly executablePath?: string
}

/**
 * Resolve the Chromium executable: a `chromium.json` beside the tests names
 * one for images whose environment pre-ships a browser at a fixed path; an
 * absent file means Playwright's own resolution. No ambient environment is
 * read.
 *
 * @returns the configured path, or `undefined` for Playwright's default.
 */
async function chromiumPath(): Promise<string | undefined> {
  const raw = await readFile(new URL('./chromium.json', import.meta.url), 'utf8').then(
    (text) => JSON.parse(text) as ChromiumConfig,
    () => null,
  )
  const path = raw?.executablePath ?? ''
  return path === '' ? undefined : path
}

/** A JSON value carried by a scripted roster event. */
interface OpenOptions {
  readonly dark?: boolean
  readonly mobile?: boolean
  readonly locale?: string
}

/** One Remote call the page issued, as the scripted IPC saw it. */
/** The conformance tags every surface is held to. */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] as const

/** One accessibility violation, reduced to what a failure message needs. */
export interface Violation {
  readonly id: string
  readonly impact: string
  readonly help: string
  readonly nodes: readonly string[]
}

/** A running harness. */
export interface Harness {
  open(table: AnswerTable, options?: OpenOptions): Promise<Page>
  shoot(page: Page, name: string): Promise<void>
  /** Every Remote call the page has issued, in order. */
  calls(page: Page): Promise<readonly RecordedCall[]>
  /**
   * Run axe-core over the page and return every WCAG 2.2 AA violation.
   *
   * The rule set is the published one, not a local opinion, so a surface cannot
   * be made to pass by rewriting the check.
   */
  audit(page: Page): Promise<readonly Violation[]>
  stop(): Promise<void>
}

const DIST = new URL('../dist/', import.meta.url).pathname
const SHOTS = new URL('./screenshots/', import.meta.url).pathname
const TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
}

/**
 * Start the static server and browser.
 * @returns the harness.
 */
async function serve(rel: string, res: ServerResponse): Promise<void> {
  const body = await readFile(join(DIST, rel)).catch(() => null)
  if (body === null) {
    res.writeHead(404)
    res.end('not found')
    return
  }
  res.writeHead(200, { 'content-type': TYPES[extname(rel)] ?? 'application/octet-stream' })
  res.end(body)
}

/**
 * Serve the built bundle on a loopback port.
 * @returns the server and the origin it bound.
 */
async function startServer(): Promise<{ server: Server; origin: string }> {
  const server: Server = createServer((req, res) => {
    const requested = (req.url ?? '/').split('?')[0] ?? '/'
    const rel = normalize(requested === '/' ? 'index.html' : requested.replace(/^\/+/u, ''))
    void serve(rel, res)
  })
  await new Promise<void>((done) => {
    server.listen(0, '127.0.0.1', done)
  })
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('server did not bind a port')
  return { server, origin: `http://127.0.0.1:${String(address.port)}/` }
}

/**
 * Open one page with its own scripted IPC.
 * @param browser - the running browser.
 * @param origin - where the bundle is served.
 * @param table - the answers this page should give.
 * @param options - how the page should be opened.
 * @returns the page, loaded.
 */
async function openPage(browser: Browser, origin: string, table: AnswerTable, options: OpenOptions): Promise<Page> {
  const context = await browser.newContext({
    colorScheme: options.dark === true ? 'dark' : 'light',
    // A phone viewport is not a phone: the row actions are revealed by
    // `not (hover: hover)`, which only holds once the context emulates a touch
    // device rather than merely a narrow window.
    ...(options.mobile === true ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : {}),
    locale: options.locale ?? 'en-GB',
  })
  await context.addInitScript({ content: initScriptSource(table) })
  const page = await context.newPage()
  await page.goto(origin, { waitUntil: 'domcontentloaded' })
  return page
}

/**
 * Every WCAG rule a page definitively fails.
 *
 * axe separates what it decided from what it could not. Only the decided
 * failures are returned: its `incomplete` set is the manual-review bucket, and
 * an open overlay puts every element behind it there because the background
 * behind a stacked element cannot be resolved. Failing on those would fail the
 * build for a limit of the tool rather than a defect in the page.
 * @param page - the page to audit.
 * @returns the violations.
 */
async function auditPage(page: Page): Promise<readonly Violation[]> {
  const result = await new AxeBuilder({ page }).withTags([...WCAG_TAGS]).analyze()
  return result.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact ?? 'unknown',
    help: violation.help,
    nodes: violation.nodes.map((node) => node.html),
  }))
}

export async function startHarness(): Promise<Harness> {
  const { server, origin } = await startServer()
  const executablePath = await chromiumPath()
  const browser: Browser = await chromium.launch(executablePath === undefined ? {} : { executablePath })

  return {
    open: (table, options = {}) => openPage(browser, origin, table, options),
    async shoot(page, name) {
      await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true })
    },
    audit: (page) => auditPage(page),
    calls: (page) =>
      page.evaluate(
        () => (window as unknown as { deeptailRecordedCalls?: RecordedCall[] }).deeptailRecordedCalls ?? [],
      ),
    async stop() {
      await browser.close()
      await new Promise<void>((done) => {
        server.close(() => {
          done()
        })
      })
    },
  }
}

/**
 * Wait for a selector and return its trimmed text.
 * @param page - the page.
 * @param selector - what to wait for.
 * @returns the element's text.
 */
export async function textOf(page: Page, selector: string): Promise<string> {
  const node = page.locator(selector).first()
  await node.waitFor({ state: 'visible' })
  return ((await node.textContent()) ?? '').trim()
}
