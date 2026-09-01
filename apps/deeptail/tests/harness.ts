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
type MuxEventValue =
  | { readonly type: 'ready'; readonly clientId: string; readonly host: string }
  | { readonly type: 'emit'; readonly event: string; readonly args: ForwardedEvent['args'] }

/** One frame the scripted mux socket delivers to the client. */
type ScriptFrame =
  | { readonly type: 'open' }
  | { readonly type: 'message'; readonly data: string }
  | { readonly type: 'close'; readonly code: number; readonly reason: string }

/** The mux channel handle `carrier_open_mux` receives. */
interface ScriptChannel {
  onmessage?: (frame: ScriptFrame) => void
}

/** One paired host as the fleet table reports it. */
type HostFixture = {
  readonly id: string
  readonly label: string
  readonly origin: string
}

/** The failure context a host attaches to a rejection. */
interface FailureDetails {
  readonly available?: readonly string[]
}

/** One session as the roster reports it over the wire. */
interface SessionFixture {
  readonly sessionId: string
  readonly updatedAt: number
  readonly running: boolean
  readonly blank: boolean
  readonly projections?: { readonly values?: { readonly title?: string } }
}

/** One roster event the mux forwards, with the argument tuple the host sends. */
interface ForwardedEvent {
  readonly event: string
  readonly args: readonly (string | number | boolean | SessionFixture)[]
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
  /** Endpoints that never answer, keyed the same way. A pending `session/list`
   *  is what the roster's loading state looks like. */
  readonly remotePending?: readonly string[]
  /** HTTP statuses to answer with, keyed the same way. A 401 or 403 is how a
   *  revoked device token reaches the client. */
  readonly remoteStatuses?: Readonly<Record<string, number>>
  /** Failure codes for the endpoints in `remoteErrors`, keyed the same way. */
  readonly remoteErrorCodes?: Readonly<Record<string, string>>
  /** Failure details for those endpoints, such as the presets a host does have. */
  readonly remoteErrorDetails?: Readonly<Record<string, FailureDetails>>
  /** Hosts whose `$events` mux answers. Anything not listed keeps the silent,
   *  never-opening socket, which is what an unreachable stream looks like. */
  readonly muxHosts?: readonly string[]
  /** Roster events the mux forwards once the stream is open, in order. Each is
   *  delivered to every host in `muxHosts`. */
  readonly muxEvents?: readonly ForwardedEvent[]
  /** Hosts whose mux closes right after opening, so the roster reports it lost. */
  readonly muxClose?: readonly string[]
}

/** How a page should be opened. */
interface OpenOptions {
  readonly dark?: boolean
  readonly mobile?: boolean
  readonly locale?: string
}

/** One Remote call the page issued, as the scripted IPC saw it. */
interface RecordedCall {
  readonly host: string
  readonly endpoint: string
  readonly args: Readonly<Record<string, unknown>>
}

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
      await context.addInitScript((script: AnswerTable) => {
        const muxChannels = new Map<string, ScriptChannel>()
        // Recorded so a case can assert what actually reached the host. Without
        // it a test can only see that a dialog closed, which a no-op satisfies.
        const recorded: { host: string; endpoint: string; args: Record<string, unknown> }[] = []
        Object.assign(window, { deeptailRecordedCalls: recorded })
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
                const envelope = JSON.parse(request?.body ?? '{}') as {
                  rpcId?: string
                  payload?: { args?: Record<string, unknown> }
                }
                const rpcId = envelope.rpcId ?? '0'
                const host = typeof args?.host === 'string' ? args.host : ''
                recorded.push({ host, endpoint, args: envelope.payload?.args ?? {} })
                const scoped = `${host}:${endpoint}`
                if ((script.remotePending ?? []).some((key) => key === scoped || key === endpoint)) {
                  // Never settles, so the read stays in flight and the surface
                  // waiting on it holds its pending state for the whole case.
                  const pending = Promise.withResolvers<object>()
                  return pending.promise
                }
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
                const host = typeof args?.host === 'string' ? args.host : ''
                const channel = args?.channel as ScriptChannel | undefined
                if (channel === undefined || !(script.muxHosts ?? []).includes(host)) {
                  // No socket for this host: the deferred is deliberately never
                  // settled, which is what an unreachable stream looks like.
                  const silent = Promise.withResolvers<null>()
                  return silent.promise
                }
                muxChannels.set(host, channel)
                // The open frame is what makes the socket report OPEN, which is
                // what lets the subscription send its `open` request.
                queueMicrotask(() => {
                  channel.onmessage?.({ type: 'open' })
                })
                return Promise.resolve(null)
              }
              case 'carrier_send_mux': {
                const host = typeof args?.host === 'string' ? args.host : ''
                const channel = muxChannels.get(host)
                const data = typeof args?.data === 'string' ? args.data : ''
                const frame = JSON.parse(data) as { type?: string; streamId?: string }
                if (channel === undefined || frame.type !== 'open' || typeof frame.streamId !== 'string') {
                  return Promise.resolve(null)
                }
                const streamId = frame.streamId
                const send = (value: MuxEventValue): void => {
                  channel.onmessage?.({ type: 'message', data: JSON.stringify({ type: 'item', streamId, value }) })
                }
                // The Gateway answers an opened `$events` stream with its ready
                // frame before anything else; nothing may be published first.
                queueMicrotask(() => {
                  send({ type: 'ready', clientId: 'test-client', host })
                  for (const forwarded of script.muxEvents ?? []) {
                    send({ type: 'emit', event: forwarded.event, args: forwarded.args })
                  }
                  if ((script.muxClose ?? []).includes(host)) {
                    channel.onmessage?.({ type: 'close', code: 1006, reason: 'host went away' })
                  }
                })
                return Promise.resolve(null)
              }
              default:
                return Promise.resolve(null)
            }
          },
          transformCallback: (callback: () => object) => callback,
          unregisterCallback: () => {},
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
