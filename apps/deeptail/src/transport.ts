/**
 * The `__DSH_TRANSPORT__` carrier, backed entirely by Rust.
 *
 * The harness client reads this page global before any of its plugins boot and
 * uses it in place of the page's own `fetch`, bundle loading, and stream
 * socket. Nothing here talks to the network directly: the device token lives
 * in Rust, and the app's CSP names no host at all.
 *
 * @module
 */

import { Channel, invoke } from '@tauri-apps/api/core'
import { messageOf } from './reason.ts'
import {
  SOCKET_CLOSE_ABNORMAL,
  SOCKET_CLOSE_NORMAL,
  SOCKET_CLOSED,
  SOCKET_CONNECTING,
  SOCKET_OPEN,
} from './socket-state.ts'
import { executeBundle, fetchBundle } from './transport-bundles.ts'

/** One frame from the Rust-held mux socket. */
type MuxFrame =
  | { readonly type: 'open' }
  | { readonly type: 'message'; readonly data: string }
  | { readonly type: 'error'; readonly message: string }
  | { readonly type: 'close'; readonly code: number; readonly reason: string }

/** The response shape the Rust unary-call command returns across the IPC boundary. */
interface CarrierResponse {
  readonly status: number
  readonly headers: readonly (readonly [string, string])[]
  readonly body: string
}

/**
 * Perform one unary `/api` call through Rust.
 * @param host - paired host id.
 * @param input - URL the harness client built against the page origin; only its path and query are used.
 * @param init - the request init the harness client sets.
 * @returns an ordinary `Response` the harness client can read.
 */
async function carrierFetch(host: string, input: URL, init: RequestInit): Promise<Response> {
  const headers: [string, string][] = []
  new Headers(init.headers ?? {}).forEach((value, name) => {
    headers.push([name, value])
  })
  const response = await invoke<CarrierResponse>('carrier_fetch', {
    host,
    request: {
      path: `${input.pathname}${input.search}`,
      method: init.method ?? 'GET',
      headers,
      body: typeof init.body === 'string' ? init.body : null,
    },
  })
  return new Response(response.body, {
    status: response.status,
    headers: new Headers(response.headers.map(([name, value]) => [name, value])),
  })
}

/**
 * A `WebSocket`-shaped view of the Rust-held mux socket.
 *
 * The harness gateway's mux client uses only `readyState`, `addEventListener`,
 * `removeEventListener`, `send`, and `close`, so this class implements
 * exactly that surface and the protocol itself stays in the harness.
 */
class CarrierMuxSocket extends EventTarget implements MuxSocketLike {
  #readyState = SOCKET_CONNECTING
  readonly #host: string

  /**
   * Open the socket for one host.
   * @param hostId - paired host id.
   */
  constructor(hostId: string) {
    super()
    this.#host = hostId
    const channel = new Channel<MuxFrame>((frame) => {
      this.#receive(frame)
    })
    invoke('carrier_open_mux', { host: hostId, channel }).then(undefined, (reason) => {
      // The harness client treats an error before open as a carrier failure and
      // retries with backoff; the close keeps its bookkeeping consistent.
      this.#fail(reason)
    })
  }

  /** Current state, matching the `WebSocket` numeric constants. */
  get readyState(): number {
    return this.#readyState
  }

  /**
   * Send one text frame.
   * @param data - a serialized mux message.
   */
  send(data: string): void {
    invoke('carrier_send_mux', { host: this.#host, data }).then(undefined, (reason) => {
      // The Rust side rejects precisely when no socket is open for this host;
      // an unreported rejection strands `readyState` at OPEN while every write
      // vanishes — the failure this view exists to surface.
      this.#fail(reason)
    })
  }

  /**
   * Close the socket and report it. The `close` event is what the harness
   * stream client watches to retire the generation and start reconnecting; a
   * silent close leaves it waiting on a socket that is gone.
   */
  close(): void {
    if (this.#readyState === SOCKET_CLOSED) return
    this.#readyState = SOCKET_CLOSED
    invoke('carrier_close_mux', { host: this.#host }).then(undefined, (reason: Parameters<typeof messageOf>[0]) => {
      // Rust rejects this when it holds no socket for the host; the page-side
      // retire signal goes out below and #fail's guard keeps this rejection
      // from double-signalling it.
      this.#fail(reason)
    })
    this.dispatchEvent(new CloseEvent('close', { code: SOCKET_CLOSE_NORMAL, reason: 'suspended' }))
  }

  /**
   * Retire the socket after the Rust carrier rejected a call. Generic because
   * a rejection callback cannot annotate its variable with anything narrower
   * than what `messageOf` narrows by.
   * @param reason - whatever the Rust side rejected with.
   */
  #fail<T>(reason: T): void {
    if (this.#readyState === SOCKET_CLOSED) return
    this.#readyState = SOCKET_CLOSED
    this.dispatchEvent(new Event('error'))
    this.dispatchEvent(new CloseEvent('close', { code: SOCKET_CLOSE_ABNORMAL, reason: messageOf(reason) }))
  }

  #receive(frame: MuxFrame): void {
    switch (frame.type) {
      case 'open':
        this.#readyState = SOCKET_OPEN
        this.dispatchEvent(new Event('open'))
        return
      case 'message':
        this.dispatchEvent(new MessageEvent('message', { data: frame.data }))
        return
      case 'error':
        this.dispatchEvent(new Event('error'))
        return
      case 'close':
        this.#readyState = SOCKET_CLOSED
        this.dispatchEvent(new CloseEvent('close', { code: frame.code, reason: frame.reason }))
        return
      default:
        // The frame union is closed on the Rust side; an unknown tag means the
        // two halves disagree, which must be loud rather than ignored.
        throw new Error(`deeptail: unknown mux frame ${JSON.stringify(frame)}`)
    }
  }
}

/**
 * The exact socket surface the harness's Remote stream mux client uses:
 * `readyState` compared against `WebSocket.OPEN`, the four lifecycle events,
 * `send`, and `close`. Declaring it structurally keeps the carrier honest about
 * how little of `WebSocket` the protocol actually depends on.
 */
export interface MuxSocketLike extends EventTarget {
  readonly readyState: number
  send(data: string): void
  close(): void
}

/** The carrier hooks the harness client reads from `globalThis.__DSH_TRANSPORT__`. */
export interface CarrierHooks {
  readonly send: (input: URL, init: RequestInit) => Promise<Response>
  readonly loadBundle: (url: string) => Promise<void>
  readonly openMuxSocket: () => MuxSocketLike
  /**
   * Close the live mux socket through its own view.
   *
   * Closing it by invoking the native command directly drops the
   * connection without dispatching a `close` event, leaving the harness stream
   * client believing the socket is still open until its first failed send.
   */
  readonly suspendMuxSocket: () => void
}

/**
 * The carrier, plus the one capability the harness contract does not name.
 *
 * The harness client reads `CarrierHooks` and nothing else. Warming a bundle
 * is DeepTail's own: a served page hands a preload row to the browser, and a
 * page inside a webview has no browser-visible URL to hand it, so the boot
 * table's preload row is honoured here or not at all.
 */
export interface Carrier extends CarrierHooks {
  /**
   * Fetch a bundle now so the row that runs it does not wait on the network.
   * @param url - bundle URL the boot table named, absolute on the host.
   */
  readonly warmBundle: (url: string) => Promise<void>
}

/**
 * Build the carrier for one paired host.
 * @param host - paired host id.
 * @returns hooks to install as `__DSH_TRANSPORT__` before the shell boots.
 */
export function createCarrier(host: string): Carrier {
  let live: CarrierMuxSocket | undefined
  // What a preload row fetched, held until the row that runs it takes it.
  const warmed = new Map<string, string>()
  return {
    send: (input, init) => carrierFetch(host, input, init),
    warmBundle: async (url) => {
      warmed.set(url, await fetchBundle(host, url))
    },
    loadBundle: async (url) => {
      const held = warmed.get(url)
      warmed.delete(url)
      await executeBundle(url, held ?? (await fetchBundle(host, url)))
    },
    openMuxSocket: () => {
      live = new CarrierMuxSocket(host)
      return live
    },
    suspendMuxSocket: () => {
      live?.close()
      live = undefined
    },
  }
}
