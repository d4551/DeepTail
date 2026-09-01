/**
 * The scripted Tauri IPC the browser suites run against.
 *
 * Playwright serialises `installTauriInternals` and evaluates it in the page
 * before anything else, so it must be self-contained: it may close over nothing
 * but its own argument. Everything the suites can vary lives in the answer
 * table it reads.
 *
 * @module
 */

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

/** One Remote call the page issued, as the scripted IPC saw it. */
export interface RecordedCall {
  readonly host: string
  readonly endpoint: string
  readonly args: Readonly<Record<string, unknown>>
}

/**
 * Install the scripted `window.__TAURI_INTERNALS__` this page will answer from.
 * @param script - the answers this page should give.
 */
export function installTauriInternals(script: AnswerTable): void {
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
          return script.selectError === undefined ? Promise.resolve({}) : Promise.reject(new Error(script.selectError))
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
}
