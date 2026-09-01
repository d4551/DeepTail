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

/** One frame from the Rust-held mux socket. */
type MuxFrame =
  | { readonly type: 'open' }
  | { readonly type: 'message'; readonly data: string }
  | { readonly type: 'error'; readonly message: string }
  | { readonly type: 'close'; readonly code: number; readonly reason: string }

/** The response shape `carrier_fetch` returns across the IPC boundary. */
interface CarrierResponse {
  readonly status: number
  readonly headers: readonly (readonly [string, string])[]
  readonly body: string
}

/** `WebSocket.OPEN`; the harness mux client compares `readyState` against it. */
const OPEN = 1
/** `WebSocket.CLOSED`. */
const CLOSED = 3

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
 * Fetch one client plugin bundle through Rust and execute it as a classic
 * script, exactly as the served shell's same-origin `<script src>` would.
 *
 * A blob URL is used rather than `eval` so the app's CSP can stay at
 * `script-src 'self' blob:` instead of allowing arbitrary evaluation.
 * @param host - paired host id.
 * @param url - bundle URL the boot table named, absolute on the host.
 */
async function carrierLoadBundle(host: string, url: string): Promise<void> {
  const path = new URL(url, 'http://dsh.internal')
  const source = await invoke<string>('carrier_load_bundle', {
    host,
    path: `${path.pathname}${path.search}`,
  })
  const blob = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
  try {
    await new Promise<void>((resolve, reject) => {
      const element = document.createElement('script')
      element.src = blob
      element.addEventListener(
        'load',
        () => {
          element.remove()
          resolve()
        },
        { once: true },
      )
      element.addEventListener(
        'error',
        () => {
          element.remove()
          reject(new Error(`deeptail: bundle ${url} failed to execute`))
        },
        { once: true },
      )
      document.head.append(element)
    })
  } finally {
    URL.revokeObjectURL(blob)
  }
}

/**
 * A `WebSocket`-shaped view of the Rust-held mux socket.
 *
 * The harness gateway's mux client uses only `readyState`, `addEventListener`,
 * `removeEventListener`, `send`, and `close`, so this adapter implements
 * exactly that surface and the protocol itself stays in the harness.
 */
class CarrierMuxSocket extends EventTarget implements MuxSocketLike {
  #readyState = 0
  readonly #host: string

  /**
   * Open the socket for one host.
   * @param host - paired host id.
   */
  constructor(host: string) {
    super()
    this.#host = host
    const channel = new Channel<MuxFrame>((frame) => {
      this.#receive(frame)
    })
    invoke('carrier_open_mux', { host, channel }).catch((reason: unknown) => {
      this.#readyState = CLOSED
      this.dispatchEvent(new Event('error'))
      // The harness client treats an error before open as a carrier failure and
      // retries with backoff; the close keeps its bookkeeping consistent.
      this.dispatchEvent(new CloseEvent('close', { code: 1006, reason: String(reason) }))
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
    invoke('carrier_send_mux', { host: this.#host, data }).catch((reason: unknown) => {
      // The Rust side rejects exactly when no socket is open for this host, so
      // swallowing it would leave `readyState` reporting OPEN while every write
      // vanished — the failure this adapter exists to make visible.
      if (this.#readyState === CLOSED) return
      this.#readyState = CLOSED
      this.dispatchEvent(new Event('error'))
      this.dispatchEvent(new CloseEvent('close', { code: 1006, reason: String(reason) }))
    })
  }

  /**
   * Close the socket and report it. The `close` event is what the harness
   * stream client watches to retire the generation and start reconnecting; a
   * silent close would leave it waiting on a socket that is already gone.
   */
  close(): void {
    if (this.#readyState === CLOSED) return
    this.#readyState = CLOSED
    void invoke('carrier_close_mux', { host: this.#host })
    this.dispatchEvent(new CloseEvent('close', { code: 1000, reason: 'suspended' }))
  }

  #receive(frame: MuxFrame): void {
    switch (frame.type) {
      case 'open':
        this.#readyState = OPEN
        this.dispatchEvent(new Event('open'))
        return
      case 'message':
        this.dispatchEvent(new MessageEvent('message', { data: frame.data }))
        return
      case 'error':
        this.dispatchEvent(new Event('error'))
        return
      case 'close':
        this.#readyState = CLOSED
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
  fetch(input: URL, init: RequestInit): Promise<Response>
  loadBundle(url: string): Promise<void>
  openMuxSocket(): MuxSocketLike
  /**
   * Close the live mux socket through its adapter.
   *
   * Closing it by invoking the native command directly would drop the
   * connection without dispatching a `close` event, leaving the harness stream
   * client believing the socket is still open until its first failed send.
   */
  suspendMuxSocket(): void
}

/**
 * Build the carrier for one paired host.
 * @param host - paired host id.
 * @returns hooks to install as `__DSH_TRANSPORT__` before the shell boots.
 */
export function createCarrier(host: string): CarrierHooks {
  let live: CarrierMuxSocket | undefined
  return {
    fetch: (input, init) => carrierFetch(host, input, init),
    loadBundle: (url) => carrierLoadBundle(host, url),
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
