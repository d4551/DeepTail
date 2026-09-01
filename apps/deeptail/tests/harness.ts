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
import { type AnswerTable, installTauriInternals, type RecordedCall } from './tauri-ipc.ts'

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
  const body = await readFile(join(DIST, rel)).catch(() => undefined)
  if (body === undefined) {
    res.writeHead(404)
    res.end('not found')
    return
  }
  res.writeHead(200, { 'content-type': TYPES[extname(rel)] ?? 'application/octet-stream' })
  res.end(body)
}

export async function startHarness(): Promise<Harness> {
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
  const origin = `http://127.0.0.1:${String(address.port)}/`
  const executablePath = await chromiumPath()
  const browser: Browser = await chromium.launch(executablePath === undefined ? {} : { executablePath })

  return {
    async open(table, options = {}) {
      const context = await browser.newContext({
        colorScheme: options.dark === true ? 'dark' : 'light',
        // A phone viewport is not a phone: the row actions are revealed by
        // `not (hover: hover)`, which only holds once the context emulates a
        // touch device rather than merely a narrow window.
        ...(options.mobile === true ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : {}),
        locale: options.locale ?? 'en-GB',
      })
      await context.addInitScript(installTauriInternals, table)
      const page = await context.newPage()
      await page.goto(origin, { waitUntil: 'domcontentloaded' })
      return page
    },
    async shoot(page, name) {
      await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true })
    },
    async audit(page) {
      const result = await new AxeBuilder({ page }).withTags([...WCAG_TAGS]).analyze()
      // `incomplete` is axe reporting that it could not decide — the state
      // colour-contrast lands in when a background cannot be resolved. Treating
      // it as a pass would let a real failure hide behind an undecided one.
      return [...result.violations, ...result.incomplete].map((finding) => ({
        id: finding.id,
        impact: finding.impact ?? 'unknown',
        help: finding.help,
        nodes: finding.nodes.map((node) => node.html),
      }))
    },
    calls(page) {
      return page.evaluate(
        () => (window as unknown as { deeptailRecordedCalls?: RecordedCall[] }).deeptailRecordedCalls ?? [],
      )
    },
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
