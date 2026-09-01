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

/** Playwright resolves the Chromium it installed itself, which is what every
 *  developer machine has. An image that pre-ships one at a fixed path instead
 *  names it here, that being the only case where the default finds nothing. */
const CHROMIUM = process.env.DEEPTAIL_CHROMIUM

const DIST = new URL('../dist/', import.meta.url).pathname
const SHOTS = new URL('./screenshots/', import.meta.url).pathname
const TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
}

/** One scripted answer table for `window.__TAURI_INTERNALS__.invoke`. */
export interface Script {
  readonly hosts?: unknown
  readonly listError?: string
  readonly selectError?: string
  readonly pairError?: string
  readonly paired?: unknown
  /** Answers keyed by Remote endpoint, e.g. `session/list`. */
  readonly remote?: Readonly<Record<string, unknown>>
  /** Endpoints that should fail, keyed the same way. */
  readonly remoteErrors?: Readonly<Record<string, string>>
}

/** How a page should be opened. */
interface OpenOptions {
  readonly dark?: boolean
  readonly mobile?: boolean
  readonly locale?: string
}

/** A running harness. */
export interface Harness {
  open(script: Script, options?: OpenOptions): Promise<Page>
  shoot(page: Page, name: string): Promise<void>
  stop(): Promise<void>
}

/**
 * Start the static server and browser.
 * @returns the harness.
 */
export async function startHarness(): Promise<Harness> {
  const server: Server = createServer((req, res) => {
    const requested = (req.url ?? '/').split('?')[0] ?? '/'
    const rel = normalize(requested === '/' ? 'index.html' : requested.replace(/^\/+/u, ''))
    void readFile(join(DIST, rel)).then(
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
  const browser: Browser = await chromium.launch(
    CHROMIUM === undefined || CHROMIUM === '' ? {} : { executablePath: CHROMIUM },
  )

  return {
    async open(script, options = {}) {
      const context = await browser.newContext({
        colorScheme: options.dark === true ? 'dark' : 'light',
        ...(options.mobile === true ? { viewport: { width: 390, height: 844 } } : {}),
        locale: options.locale ?? 'en-GB',
      })
      await context.addInitScript((table: Script) => {
        const internals = {
          invoke(cmd: string, args?: Record<string, unknown>): Promise<unknown> {
            switch (cmd) {
              case 'list_hosts':
                return table.listError === undefined
                  ? Promise.resolve(table.hosts ?? [])
                  : Promise.reject(new Error(table.listError))
              case 'select_host':
                return table.selectError === undefined
                  ? Promise.resolve({})
                  : Promise.reject(new Error(table.selectError))
              case 'forget_host':
                return Promise.resolve(null)
              case 'pair_host':
                return table.pairError === undefined
                  ? Promise.resolve(table.paired ?? {})
                  : Promise.reject(new Error(table.pairError))
              case 'carrier_fetch': {
                // Answer a Typert Remote call with a server-response envelope.
                const request = args?.['request'] as { path?: string; body?: string } | undefined
                const endpoint = (request?.path ?? '').replace(/^\/api\//u, '').split('?')[0] ?? ''
                const rpcId = (JSON.parse(request?.body ?? '{}') as { rpcId?: string }).rpcId ?? '0'
                const failure = table.remoteErrors?.[endpoint]
                const result =
                  failure === undefined
                    ? { ok: true, value: table.remote?.[endpoint] ?? {} }
                    : { ok: false, error: { code: 'internal', message: failure, details: {} } }
                return Promise.resolve({
                  status: 200,
                  headers: [['content-type', 'application/json']],
                  body: JSON.stringify({ type: 'server-response', rpcId, result }),
                })
              }
              case 'carrier_open_mux':
                // No socket in the browser: the roster stays on its unary read,
                // which is exactly what an unreachable stream looks like.
                return new Promise(() => {})
              default:
                return Promise.resolve(null)
            }
          },
          transformCallback: (callback: unknown) => callback,
          unregisterCallback: () => undefined,
          convertFileSrc: (path: string) => path,
        }
        Object.assign(window, { __TAURI_INTERNALS__: internals })
      }, script)
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
