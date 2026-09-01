/**
 * Shared browser-test harness: a static server over the built bundle, one
 * Chromium, and a scripted Tauri IPC surface.
 *
 * Only the IPC boundary is substituted. `invoke()` reaches
 * `window.__TAURI_INTERNALS__.invoke`, which no browser provides, so each test
 * installs a scripted one. Everything above it is the shipped code.
 */

import { readFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { type Browser, chromium, type Page } from 'playwright'

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

/** One paired host as the fleet table reports it. */
type HostFixture = {
  readonly id: string
  readonly label: string
  readonly origin: string
}

/** One scripted answer table for `window.__TAURI_INTERNALS__.invoke`. */
export type AnswerTable = {
  readonly hosts?: readonly HostFixture[]
  readonly listError?: string
  readonly selectError?: string
  readonly pairError?: string
  readonly paired?: HostFixture
  /** Answers keyed by Remote endpoint, e.g. `session/list`. */
  readonly remote?: Readonly<Record<string, object>>
  /** Endpoints that should fail, keyed the same way. */
  readonly remoteErrors?: Readonly<Record<string, string>>
  /** HTTP statuses to answer with, keyed the same way. A 401 or 403 is how a
   *  revoked device token reaches the client. */
  readonly remoteStatuses?: Readonly<Record<string, number>>
  /** Failure codes for the endpoints in `remoteErrors`, keyed the same way. */
  readonly remoteErrorCodes?: Readonly<Record<string, string>>
  /** Failure details for those endpoints, such as the presets a host does have. */
  readonly remoteErrorDetails?: Readonly<Record<string, unknown>>
}

/** How a page should be opened. */
interface OpenOptions {
  readonly dark?: boolean
  readonly mobile?: boolean
  readonly locale?: string
}

/** A running harness. */
export interface Harness {
  open(table: AnswerTable, options?: OpenOptions): Promise<Page>
  shoot(page: Page, name: string): Promise<void>
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
export async function startHarness(): Promise<Harness> {
  const server: Server = createServer((req, res) => {
    const requested = (req.url ?? '/').split('?')[0] ?? '/'
    const rel = normalize(requested === '/' ? 'index.html' : requested.replace(/^\/+/u, ''))
    readFile(join(DIST, rel)).then(
      (body) => {
        res.writeHead(200, { 'content-type': TYPES[extname(rel)] ?? 'application/octet-stream' })
        res.end(body)
        return undefined
      },
      () => {
        res.writeHead(404)
        res.end('not found')
        return undefined
      },
    )
  })
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
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
      await context.addInitScript((script: AnswerTable) => {
        const internals = {
          invoke(cmd: string, args?: Record<string, object>): Promise<object | null> {
            switch (cmd) {
              case 'list_hosts':
                return script.listError === undefined
                  ? Promise.resolve(script.hosts ?? [])
                  : Promise.reject(new Error(script.listError))
              case 'select_host':
                return script.selectError === undefined
                  ? Promise.resolve({})
                  : Promise.reject(new Error(script.selectError))
              case 'forget_host':
                return Promise.resolve(null)
              case 'pair_host':
                return script.pairError === undefined
                  ? Promise.resolve(script.paired ?? {})
                  : Promise.reject(new Error(script.pairError))
              case 'carrier_fetch': {
                // Answer a Typert Remote call with a server-response envelope.
                const request = args?.request as { path?: string; body?: string } | undefined
                const endpoint = (request?.path ?? '').replace(/^\/api\//u, '').split('?')[0] ?? ''
                const rpcId = (JSON.parse(request?.body ?? '{}') as { rpcId?: string }).rpcId ?? '0'
                const host = typeof args?.host === 'string' ? args.host : ''
                const scoped = `${host}:${endpoint}`
                const failure = script.remoteErrors?.[scoped] ?? script.remoteErrors?.[endpoint]
                const result =
                  failure === undefined
                    ? { ok: true, value: script.remote?.[endpoint] ?? {} }
                    : {
                        ok: false,
                        error: {
                          code: script.remoteErrorCodes?.[scoped] ?? script.remoteErrorCodes?.[endpoint] ?? 'internal',
                          message: failure,
                          details: script.remoteErrorDetails?.[scoped] ?? script.remoteErrorDetails?.[endpoint] ?? {},
                        },
                      }
                return Promise.resolve({
                  status: script.remoteStatuses?.[scoped] ?? script.remoteStatuses?.[endpoint] ?? 200,
                  headers: [['content-type', 'application/json']],
                  body: JSON.stringify({ type: 'server-response', rpcId, result }),
                })
              }
              case 'carrier_open_mux': {
                // No socket in the browser: the roster stays on its unary read,
                // which is exactly what an unreachable stream looks like. The
                // deferred is deliberately never settled — that is the signal.
                const socket = Promise.withResolvers<null>()
                return socket.promise
              }
              default:
                return Promise.resolve(null)
            }
          },
          transformCallback: (callback: () => object) => callback,
          unregisterCallback: () => undefined,
          convertFileSrc: (path: string) => path,
        }
        Object.assign(window, { __TAURI_INTERNALS__: internals })
      }, table)
      const page = await context.newPage()
      await page.goto(origin, { waitUntil: 'domcontentloaded' })
      return page
    },
    async shoot(page, name) {
      await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true })
    },
    async stop() {
      await browser.close()
      await new Promise<void>((done) => server.close(() => done()))
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
