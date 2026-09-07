/**
 * Shared browser-test harness: a static server over the built bundle, one
 * Chromium, and a scripted Tauri IPC surface.
 *
 * Only the IPC boundary is substituted. `invoke()` reaches
 * `window.__TAURI_INTERNALS__.invoke`, which no browser provides, so each test
 * installs a scripted one. Everything above it is the shipped code.
 */

import { type Browser, chromium, type Page } from 'playwright'
import { auditPage, type Violation } from './audit.ts'
import { type AnswerTable, type ForwardedEvent, initScriptSource, type RecordedCall } from './tauri-ipc.ts'
import { PHONE_VIEWPORT, TABLET_VIEWPORT } from './viewports.ts'

export type { Violation } from './audit.ts'
export { WCAG_TAGS } from './audit.ts'
export type { AnswerTable } from './tauri-ipc.ts'

/** How a page should be opened. */
interface OpenOptions {
  /**
   * Writing direction the document loads under. A real right-to-left locale
   * arrives this way, before any style is resolved, rather than being switched
   * on a live page.
   */
  readonly direction?: 'ltr' | 'rtl'
  /** Emulate the platform's high-contrast mode, which replaces every colour. */
  readonly forcedColors?: boolean
  /** Emulate a viewer who has asked for less motion. */
  readonly reducedMotion?: boolean
  readonly dark?: boolean
  readonly mobile?: boolean
  /**
   * iPad-class viewport with a coarse pointer. Distinct from `mobile`: the
   * shell's drawer breakpoint sits below this width, so tablet is the
   * two-column layout a finger still has to hit.
   */
  readonly tablet?: boolean
  /**
   * Explicit CSS-pixel box. Combined with `mobile` / `tablet` so a 320-wide
   * phone is still a touch context, not a resized desktop window.
   */
  readonly width?: number
  readonly height?: number
  readonly locale?: string
}

/** A running harness. */
export interface Harness {
  open(table: AnswerTable, options?: OpenOptions): Promise<Page>
  shoot(page: Page, name: string): Promise<void>
  /** Every Remote call the page has issued, in order. */
  calls(page: Page): Promise<readonly RecordedCall[]>
  /**
   * Every Tauri command the page has invoked, in order.
   * @param page - the page to read from.
   */
  commands(page: Page): Promise<readonly string[]>
  /**
   * Forward one roster event to a page whose mux is open, at the moment the
   * caller chooses rather than in the opening burst.
   * @param page - the page to forward to.
   * @param event - the event name.
   * @param args - the event's argument tuple.
   */
  forward(page: Page, event: string, args: ForwardedEvent['args']): Promise<void>
  /**
   * Run axe-core over the page and return every WCAG 2.2 AA violation.
   *
   * The rule set is the published one, not a local opinion, so a surface cannot
   * be made to pass by rewriting the check.
   */
  audit(page: Page): Promise<readonly Violation[]>
  stop(): Promise<void>
}

const DIST = new URL('../dist/', import.meta.url)
const SHOTS = new URL('./screenshots/', import.meta.url).pathname
const TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
}

/**
 * Answer one request out of the built bundle.
 * @param request - the page's request.
 * @returns the file, or a 404 the page can name.
 */
async function serve(request: Request): Promise<Response> {
  // URL resolution normalises any `..` a request path carries, so the answer
  // can only ever land inside the bundle directory.
  const requested = new URL(request.url).pathname
  const rel = requested === '/' ? 'index.html' : requested.replace(/^\/+/u, '')
  const file = Bun.file(new URL(rel, DIST))
  if (!(await file.exists())) return new Response('not found', { status: 404 })
  const dot = rel.lastIndexOf('.')
  const type = dot === -1 ? '' : (TYPES[rel.slice(dot)] ?? 'application/octet-stream')
  return new Response(file, { headers: { 'content-type': type } })
}

/**
 * Serve the built bundle on a loopback port.
 * @returns the server and the origin it bound.
 */
function startServer(): { server: ReturnType<typeof Bun.serve>; origin: string } {
  const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: serve })
  return { server, origin: `http://127.0.0.1:${server.port}/` }
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
    ...viewportOptions(options),
    locale: options.locale ?? 'en-GB',
    ...(options.forcedColors === true ? { forcedColors: 'active' as const } : {}),
    ...(options.reducedMotion === true ? { reducedMotion: 'reduce' as const } : {}),
  })
  await context.addInitScript({ content: initScriptSource(table) })
  if (options.direction !== undefined) {
    await context.addInitScript((value) => {
      // An init script runs before the parser has created the root element,
      // so the direction is applied again once it exists.
      const apply = (): void => {
        document.documentElement?.setAttribute('dir', value)
      }
      apply()
      document.addEventListener('DOMContentLoaded', apply)
    }, options.direction)
  }
  const page = await context.newPage()
  await page.goto(origin, { waitUntil: 'domcontentloaded' })
  return page
}

/**
 * The viewport and touch emulation one set of options asks for.
 *
 * A phone viewport is not a phone: the row actions are revealed by
 * `not (hover: hover)`, which only holds once the context emulates a touch
 * device rather than merely a narrow window. An explicit width (320 CSS
 * pixels) keeps that touch context; it does not fall back to a desktop resize.
 * @param options - how the page should be opened.
 * @returns the context options, or none when no size was asked for.
 */
function viewportOptions(options: OpenOptions): { viewport?: { width: number; height: number }; hasTouch?: boolean } {
  const preset = options.tablet === true ? TABLET_VIEWPORT : options.mobile === true ? PHONE_VIEWPORT : undefined
  const width = options.width ?? preset?.width
  const height = options.height ?? preset?.height
  if (width === undefined || height === undefined) return {}
  // Touch, not Chromium's mobile text-autosize: `isMobile` at 320 CSS pixels
  // boosts 12px type and makes axe's contrast sampler lie.
  const coarse = options.mobile === true || options.tablet === true
  return { viewport: { width, height }, ...(coarse ? { hasTouch: true } : {}) }
}

export async function startHarness(): Promise<Harness> {
  const { server, origin } = startServer()
  const browser: Browser = await chromium.launch()

  return {
    open: (table, options = {}) => openPage(browser, origin, table, options),
    async shoot(page, name) {
      // Animations are stopped for the shot. The loading state's spinner is
      // mid-rotation whenever it is caught, so a running suite rewrote its own
      // screenshot on every run and left the tree dirty — a file that changes
      // when nothing changed is a file nobody can read a diff of.
      await page.screenshot({ path: `${SHOTS}${name}.png`, fullPage: true, animations: 'disabled' })
    },
    audit: (page) => auditPage(page),
    forward: (page, event, args) =>
      page.evaluate(
        (pair: readonly [string, ForwardedEvent['args']]) => {
          const push = window.deeptailForwardEvent
          if (push === undefined) throw new Error('no mux is open on this page')
          push(pair[0], pair[1])
        },
        [event, args] as const,
      ),
    calls: (page) => page.evaluate(() => window.deeptailRecordedCalls ?? []),
    commands: (page) => page.evaluate(() => window.deeptailInvokedCommands ?? []),
    async stop() {
      await browser.close()
      server.stop(true)
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
