/**
 * The carrier half of the scripted IPC: Remote calls, and the mux socket.
 *
 * Split from `./tauri-ipc.ts` along the seam it already had — those answer the
 * commands that reach a host, these answer the commands that manage the
 * registry — and emitted into the page alongside them, because a function the
 * page evaluates must travel with every function it calls.
 *
 * @module
 */

import type { AnswerTable, ForwardedEvent, IpcState, MuxEventValue, ScriptChannel } from './tauri-ipc.ts'

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

/** The scripted carrier commands, emitted into the page beside the dispatcher. */
export const CARRIER_SOURCES = [deeptailCarrierFetch, deeptailOpenMux, deeptailSendMux] as const

export { deeptailCarrierFetch, deeptailOpenMux, deeptailSendMux }
