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
  /** Why booting the harness client fails, when the test needs it to. */
  readonly bootError?: string
}

/** How a page should be opened. */

/** One Remote call the page issued, as the scripted IPC saw it. */
export interface RecordedCall {
  readonly host: string
  readonly endpoint: string
  readonly args: Readonly<Record<string, unknown>>
}

/** What one page's scripted IPC accumulates while it runs. */
interface IpcState {
  readonly channels: Map<string, ScriptChannel>
  readonly recorded: RecordedCall[]
}

/**
 * Answer a Typert Remote call with a server-response envelope.
 * @param script - the answers this page should give.
 * @param args - the invoke arguments.
 * @param state - this page's IPC state.
 * @returns the carrier response, or a promise that never settles.
 */
function deeptailCarrierFetch(script: AnswerTable, args: Record<string, object>, state: IpcState): Promise<object> {
  const request = args.request as { path?: string; body?: string } | undefined
  const endpoint = (request?.path ?? '').replace(/^\/api\//u, '').split('?')[0] ?? ''
  const envelope = JSON.parse(request?.body ?? '{}') as { rpcId?: string; payload?: { args?: Record<string, unknown> } }
  const host = typeof args.host === 'string' ? args.host : ''
  state.recorded.push({ host, endpoint, args: envelope.payload?.args ?? {} })
  const scoped = `${host}:${endpoint}`
  if ((script.remotePending ?? []).some((key) => key === scoped || key === endpoint)) {
    // Never settles, so the read stays in flight and the surface waiting on it
    // holds its pending state for the whole case.
    return Promise.withResolvers<object>().promise
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
    body: JSON.stringify({ type: 'server-response', rpcId: envelope.rpcId ?? '0', result }),
  })
}

/**
 * Attach this page's mux channel for a host, if that host answers at all.
 * @param script - the answers this page should give.
 * @param args - the invoke arguments.
 * @param state - this page's IPC state.
 * @returns null once opened, or a promise that never settles.
 */
function deeptailOpenMux(script: AnswerTable, args: Record<string, object>, state: IpcState): Promise<null> {
  const host = typeof args.host === 'string' ? args.host : ''
  const channel = args.channel as ScriptChannel | undefined
  if (channel === undefined || !(script.muxHosts ?? []).includes(host)) {
    // No socket for this host: the deferred is deliberately never settled,
    // which is what an unreachable stream looks like.
    return Promise.withResolvers<null>().promise
  }
  state.channels.set(host, channel)
  // The open frame is what makes the socket report OPEN, which is what lets the
  // subscription send its `open` request.
  queueMicrotask(() => {
    channel.onmessage?.({ type: 'open' })
  })
  return Promise.resolve(null)
}

/**
 * Answer an opened `$events` stream the way the Gateway does.
 * @param script - the answers this page should give.
 * @param args - the invoke arguments.
 * @param state - this page's IPC state.
 * @returns null.
 */
function deeptailSendMux(script: AnswerTable, args: Record<string, object>, state: IpcState): Promise<null> {
  const host = typeof args.host === 'string' ? args.host : ''
  const channel = state.channels.get(host)
  const frame = JSON.parse(typeof args.data === 'string' ? args.data : '{}') as {
    type?: string
    streamId?: string
  }
  if (channel === undefined || frame.type !== 'open' || typeof frame.streamId !== 'string') {
    return Promise.resolve(null)
  }
  const streamId = frame.streamId
  const send = (value: MuxEventValue): void => {
    channel.onmessage?.({ type: 'message', data: JSON.stringify({ type: 'item', streamId, value }) })
  }
  // A test that needs the roster to change at a chosen moment — after focusing a
  // row, say — drives this rather than the opening burst.
  Object.assign(window, {
    deeptailForwardEvent: (event: string, tuple: ForwardedEvent['args']): void => {
      send({ type: 'emit', event, args: tuple })
    },
  })
  // The Gateway answers an opened stream with its ready frame before anything
  // else; nothing may be published first.
  queueMicrotask(() => {
    send({ type: 'ready', clientId: 'test-client', host })
    for (const forwarded of script.muxEvents ?? []) send({ type: 'emit', event: forwarded.event, args: forwarded.args })
    if ((script.muxClose ?? []).includes(host)) {
      channel.onmessage?.({ type: 'close', code: 1006, reason: 'host went away' })
    }
  })
  return Promise.resolve(null)
}

/**
 * Dispatch one Tauri command to its scripted answer.
 * @param script - the answers this page should give.
 * @param cmd - the command name.
 * @param args - the invoke arguments.
 * @param state - this page's IPC state.
 * @returns whatever that command answers with.
 */
function deeptailInvoke(
  script: AnswerTable,
  cmd: string,
  args: Record<string, object>,
  state: IpcState,
): Promise<object | null> {
  switch (cmd) {
    case 'list_hosts':
      return script.listError === undefined
        ? Promise.resolve(script.hosts ?? [])
        : Promise.reject(new Error(script.listError))
    case 'select_host':
      return script.selectError === undefined ? Promise.resolve({}) : Promise.reject(new Error(script.selectError))
    case 'forget_host':
      return Promise.resolve(null)
    case 'boot_injections':
      return script.bootError === undefined ? Promise.resolve([]) : Promise.reject(new Error(script.bootError))
    case 'carrier_close_mux':
      return Promise.resolve(null)
    case 'pair_host':
      return script.pairError === undefined
        ? Promise.resolve(script.paired ?? {})
        : Promise.reject(new Error(script.pairError))
    case 'carrier_fetch':
      return deeptailCarrierFetch(script, args, state)
    case 'carrier_open_mux':
      return deeptailOpenMux(script, args, state)
    case 'carrier_send_mux':
      return deeptailSendMux(script, args, state)
    default:
      return Promise.resolve(null)
  }
}

/**
 * Install the scripted `window.__TAURI_INTERNALS__` this page will answer from.
 * @param script - the answers this page should give.
 */
function installTauriInternals(script: AnswerTable): void {
  // Recorded so a case can assert what actually reached the host. Without it a
  // test can only see that a dialog closed, which a no-op satisfies.
  const state: IpcState = { channels: new Map<string, ScriptChannel>(), recorded: [] }
  Object.assign(window, {
    deeptailRecordedCalls: state.recorded,
    __TAURI_INTERNALS__: {
      invoke: (cmd: string, args?: Record<string, object>) => deeptailInvoke(script, cmd, args ?? {}, state),
      transformCallback: (callback: () => object) => callback,
      unregisterCallback: () => {},
      convertFileSrc: (path: string) => path,
    },
  })
}

/**
 * The script a page evaluates before the bundle runs.
 *
 * Playwright evaluates this in the page, where nothing from this module exists,
 * so the source of every function it needs is emitted alongside the call. That
 * is what lets the scripted IPC be written as ordinary typed functions instead
 * of one closure that may reference nothing outside itself.
 * @param table - the answers the page should give.
 * @returns the source to evaluate.
 */
export function initScriptSource(table: AnswerTable): string {
  const sources = [deeptailCarrierFetch, deeptailOpenMux, deeptailSendMux, deeptailInvoke, installTauriInternals]
  return `${sources.map(String).join('\n\n')}\ninstallTauriInternals(${JSON.stringify(table)})`
}
