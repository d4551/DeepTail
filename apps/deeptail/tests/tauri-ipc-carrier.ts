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

import type { AnswerTable, ForwardedEvent, IpcState, JsonValue, MuxEventValue, ScriptChannel } from './tauri-ipc.ts'

/** A record of JSON values, which is what every frame here parses to. */
type Sent = { readonly [field: string]: JsonValue }

/** Anything an invoke argument can arrive as: a wire value, a live handle, or nothing. */
type Invoked = JsonValue | object | undefined

/**
 * Whether a value is a record this reads fields off.
 * @param value - the value to test.
 * @returns true when it is a record.
 */
function isRecord(value: Invoked): value is Sent {
  return value !== undefined && value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * The text one field of an invoke argument carries.
 * @param value - the argument.
 * @param key - the field.
 * @returns the text, or empty when the field carries none.
 */
function textAt(value: Invoked, key: string): string {
  if (!isRecord(value)) return ''
  const held = value[key]
  return typeof held === 'string' ? held : ''
}

/**
 * One JSON document, read as a record of fields.
 * @param text - the document.
 * @returns its fields, or none when it is not a record.
 */
function readJson(text: string): Sent {
  const parsed: Invoked = JSON.parse(text === '' ? '{}' : text)
  return isRecord(parsed) ? parsed : {}
}

/**
 * Whether an invoke argument is the mux channel handle.
 *
 * The handle itself is what the caller keeps: the page assigns `onmessage` on
 * the object it passed, and often after the invoke has returned, so a copy
 * taken here would hold the handler the handle had before the page set one —
 * a stream that opens and then delivers nothing.
 * @param value - the argument.
 * @returns true when the argument is a channel handle.
 */
function isChannel(value: Invoked): value is ScriptChannel {
  if (value === undefined || value === null || typeof value !== 'object' || Array.isArray(value)) return false
  if (!('onmessage' in value)) return true
  return value.onmessage === undefined || typeof value.onmessage === 'function'
}

/**
 * Answer a Typert Remote call with a server-response envelope.
 * @param script - the answers this page should give.
 * @param args - the invoke arguments.
 * @param state - this page's IPC state.
 * @returns the carrier response, or a promise that never settles.
 */
function deeptailCarrierFetch(script: AnswerTable, args: Record<string, object>, state: IpcState): Promise<object> {
  const request = args.request
  const path = textAt(request, 'path')
  const endpoint = path.replace(/^\/api\//u, '').split('?')[0] ?? ''
  const envelope = readJson(textAt(request, 'body'))
  const payload = envelope.payload
  const sent = isRecord(payload) ? payload.args : undefined
  const host = typeof args.host === 'string' ? args.host : ''
  state.recorded.push({ host, endpoint, args: isRecord(sent) ? sent : {} })
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
    body: JSON.stringify({
      type: 'server-response',
      rpcId: typeof envelope.rpcId === 'string' ? envelope.rpcId : '0',
      result,
    }),
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
  const channel = args.channel
  if (!isChannel(channel) || !(script.muxHosts ?? []).includes(host)) {
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
  const frame = readJson(typeof args.data === 'string' ? args.data : '{}')
  const streamId = frame.streamId
  if (channel === undefined || frame.type !== 'open' || typeof streamId !== 'string') {
    return Promise.resolve(null)
  }
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
export const CARRIER_SOURCES = [
  isRecord,
  textAt,
  readJson,
  isChannel,
  deeptailCarrierFetch,
  deeptailOpenMux,
  deeptailSendMux,
] as const

export { deeptailCarrierFetch, deeptailOpenMux, deeptailSendMux }
