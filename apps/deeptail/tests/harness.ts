/**
 * Shared browser-test harness: a static server over the built bundle, one
 * Chromium, and a scripted Tauri IPC surface.
 *
 * Only the IPC boundary is substituted. `invoke()` reaches
 * `window.__TAURI_INTERNALS__.invoke`, which no browser provides, so each test
 * installs a scripted one. Everything above it is the shipped code.
 */

import AxeBuilder from '@axe-core/playwright'
import { type Browser, chromium, type Page } from 'playwright'
import { type AnswerTable, type ForwardedEvent, initScriptSource, type RecordedCall } from './tauri-ipc.ts'
import { PHONE_VIEWPORT, TABLET_VIEWPORT } from './viewports.ts'

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
  const raw = await Bun.file(new URL('./chromium.json', import.meta.url))
    .text()
    .then(
      (text) => JSON.parse(text) as ChromiumConfig,
      () => null,
    )
  const path = raw?.executablePath ?? ''
  if (path === '') return undefined
  // The override names one machine's build. On any other machine that path is
  // simply absent, and launching against it fails outright with nothing in the
  // suite explaining why; Playwright's own resolution is the better answer
  // there than a hard stop.
  return (await Bun.file(path).exists()) ? path : undefined
}

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

/**
 * The published WCAG 2.2 AA tag set axe-core documents for `@axe-core/playwright`.
 * `best-practice` is extra strictness on top of that set, not a substitute for it.
 */
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] as const

/** The conformance tags every surface is held to. */
const AUDIT_TAGS = [...WCAG_TAGS, 'best-practice'] as const

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
  const coarse = options.mobile === true || options.tablet === true
  const preset = options.tablet === true ? TABLET_VIEWPORT : options.mobile === true ? PHONE_VIEWPORT : undefined
  const width = options.width ?? preset?.width
  const height = options.height ?? preset?.height
  const context = await browser.newContext({
    colorScheme: options.dark === true ? 'dark' : 'light',
    // A phone viewport is not a phone: the row actions are revealed by
    // `not (hover: hover)`, which only holds once the context emulates a touch
    // device rather than merely a narrow window. An explicit width (320 CSS
    // pixels) keeps that touch context; it does not fall back to a desktop
    // resize.
    ...(width !== undefined && height !== undefined
      ? {
          viewport: { width, height },
          // Touch, not Chromium's mobile text-autosize: `isMobile` at 320 CSS
          // pixels boosts 12px type and makes axe's contrast sampler lie.
          ...(coarse ? { hasTouch: true } : {}),
        }
      : {}),
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
 * Every WCAG finding on a page: what axe decided against, and what it could not
 * decide at all.
 *
 * Both are returned. An undecided finding is not a pass — it is a question the
 * markup left open, and the answer is to write markup axe can decide about.
 * @param page - the page to audit.
 * @returns the findings.
 */
async function auditOnce(page: Page): Promise<{ decided: Violation[]; undecided: Violation[] }> {
  const shape = (finding: {
    id: string
    impact?: string | null
    help: string
    nodes: { html: string }[]
  }): Violation => ({
    id: finding.id,
    impact: finding.impact ?? 'unknown',
    help: finding.help,
    nodes: finding.nodes.map((node) => node.html),
  })
  const result = await new AxeBuilder({ page }).withTags([...AUDIT_TAGS]).analyze()
  return { decided: result.violations.map(shape), undecided: result.incomplete.map(shape) }
}

/**
 * Move every pane that overflows to one end of its scroll, or the middle.
 * @param page - the page to scroll.
 * @param at - 0 for the top, 1 for the bottom, 0.5 for halfway.
 * @returns whether anything on the page scrolls at all.
 */
function scrollPanes(page: Page, at: number): Promise<boolean> {
  return page.evaluate((position: number) => {
    let moved = false
    for (const node of document.querySelectorAll('*')) {
      if (!(node instanceof HTMLElement)) continue
      const room = node.scrollHeight - node.clientHeight
      if (room <= 1) continue
      const overflow = getComputedStyle(node).overflowY
      if (overflow !== 'auto' && overflow !== 'scroll') continue
      node.scrollTop = room * position
      moved = true
    }
    return moved
  }, at)
}

/**
 * Every WCAG finding on a page: what axe decided against, and what it could not
 * decide at all.
 *
 * Both are returned. An undecided finding is not a pass — it is a question the
 * markup left open, and the answer is to write markup axe can decide about.
 *
 * A pane that scrolls asks that question about its own content: axe samples an
 * element at its centre, and an element scrolled out of its pane has no centre
 * on screen to sample, so `color-contrast` comes back undecided for markup that
 * is perfectly legible once it is scrolled to. The page is therefore audited at
 * each end of its scroll and at the middle. Anything axe decides against at any
 * position is reported — the union, so this can only ever find more. Only a
 * finding it could not decide at *every* position is carried as undecided,
 * because that is a node no scroll position ever brings into view.
 * @param page - the page to audit.
 * @returns the findings.
 */
async function auditPage(page: Page): Promise<readonly Violation[]> {
  const first = await auditOnce(page)
  if (!(await scrollPanes(page, 0))) return [...first.decided, ...first.undecided]
  const decided = new Map<string, Violation>()
  const key = (finding: Violation): string => `${finding.id}\n${finding.nodes.join('\n')}`
  for (const finding of first.decided) decided.set(key(finding), finding)
  let undecided = new Map(first.undecided.map((finding) => [key(finding), finding]))
  for (const position of [0, 0.5, 1]) {
    await scrollPanes(page, position)
    const pass = await auditOnce(page)
    for (const finding of pass.decided) decided.set(key(finding), finding)
    const seen = new Set(pass.undecided.map(key))
    undecided = new Map([...undecided].filter(([id]) => seen.has(id)))
  }
  return [...decided.values(), ...undecided.values()]
}

export async function startHarness(): Promise<Harness> {
  const { server, origin } = startServer()
  const executablePath = await chromiumPath()
  const browser: Browser = await chromium.launch(executablePath === undefined ? {} : { executablePath })

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
