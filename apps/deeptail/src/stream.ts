/**
 * Logical streams over one host's Remote stream mux.
 *
 * The Gateway multiplexes every stream over a single WebSocket at
 * `/api/remote.mux`. The wire is five messages: a client opens or cancels a
 * logical stream by id, and the host answers with items, one error, or an end.
 * DeepTail needs one of those streams — the Gateway's reserved `$events`
 * channel, which carries the roster events that keep the fleet live.
 *
 * @module
 */

import type { CarrierHooks, MuxSocketLike } from './transport.ts'

/** The Gateway's reserved logical stream carrying forwarded host events. */
const EVENT_STREAM_ENDPOINT = '$events'
/** The opening payload that stream expects. */
const EVENT_STREAM_PAYLOAD = { args: {} } as const

/** `WebSocket.OPEN`. */
const SOCKET_OPEN = 1

/** One host event forwarded to this client. */
export interface HostEvent {
  readonly event: string
  readonly args: readonly unknown[]
}

/** What a roster subscriber is told. */
export interface RosterSinks {
  /** The host answered its opening frame; the connection is established. */
  onReady: () => void
  /** One forwarded host event. */
  onEvent: (event: HostEvent) => void
  /** The stream ended or failed; the subscriber should treat the host as offline. */
  onLost: (reason: string) => void
}

/** A server frame on the mux. */
type ServerMessage =
  | { readonly type: 'item'; readonly streamId: string; readonly value?: unknown }
  | { readonly type: 'error'; readonly streamId: string; readonly error: { message?: string } }
  | { readonly type: 'end'; readonly streamId: string }

/**
 * Subscribe to one host's forwarded events.
 *
 * Nothing is published before the host's ready frame arrives: the span before
 * it is *connecting*, and reporting it as an outage would make every cold start
 * flash a disconnected state it is about to leave.
 *
 * @param carrier - the transport reaching one paired host.
 * @param sinks - roster callbacks.
 * @returns a disposer that cancels the stream and closes the socket.
 */
export function subscribeRoster(carrier: CarrierHooks, sinks: RosterSinks): () => void {
  const streamId = `deeptail-${crypto.randomUUID()}`
  let socket: MuxSocketLike | undefined
  let ready = false
  let disposed = false

  const lose = (reason: string): void => {
    if (disposed) return
    disposed = true
    sinks.onLost(reason)
  }

  const onMessage = (event: Event): void => {
    // The adapter dispatches a real MessageEvent; narrowing on the instance
    // avoids a cast and rejects anything else the target might receive.
    if (!(event instanceof MessageEvent)) return
    const data: unknown = event.data
    if (typeof data !== 'string') return
    const message = parseServerMessage(data)
    if (message === undefined || message.streamId !== streamId) return
    switch (message.type) {
      case 'item': {
        if (!ready) {
          // The opening item proves the host attached its listeners. Only a
          // ready frame counts; anything else means we are not talking to the
          // stream we asked for.
          if (!isReadyFrame(message.value)) {
            lose('host opened the event stream with an unexpected frame')
            return
          }
          ready = true
          sinks.onReady()
          return
        }
        const forwarded = toHostEvent(message.value)
        if (forwarded !== undefined) sinks.onEvent(forwarded)
        return
      }
      case 'error':
        lose(message.error.message ?? 'event stream failed')
        return
      case 'end':
        lose('event stream ended')
        return
      default:
        return
    }
  }

  const open = (): void => {
    const next = carrier.openMuxSocket()
    socket = next
    next.addEventListener('message', onMessage)
    next.addEventListener(
      'close',
      () => {
        lose('connection closed')
      },
      { once: true },
    )
    next.addEventListener(
      'error',
      () => {
        lose('connection failed')
      },
      { once: true },
    )
    next.addEventListener(
      'open',
      () => {
        next.send(
          JSON.stringify({ type: 'open', streamId, endpoint: EVENT_STREAM_ENDPOINT, payload: EVENT_STREAM_PAYLOAD }),
        )
      },
      { once: true },
    )
  }

  open()

  return () => {
    disposed = true
    const current = socket
    socket = undefined
    if (current === undefined) return
    current.removeEventListener('message', onMessage)
    if (current.readyState === SOCKET_OPEN) current.send(JSON.stringify({ type: 'cancel', streamId }))
    current.close()
  }
}

/**
 * Parse one mux frame, discarding anything that is not a frame we handle.
 * @param text - the raw text message.
 * @returns the frame, or undefined when it is not one.
 */
function parseServerMessage(text: string): ServerMessage | undefined {
  const value: unknown = JSON.parse(text)
  if (!isRecord(value) || typeof value.streamId !== 'string') return undefined
  const type = value.type
  if (type === 'item') return { type, streamId: value.streamId, value: value.value }
  if (type === 'end') return { type, streamId: value.streamId }
  if (type === 'error') {
    const error = value.error
    return {
      type,
      streamId: value.streamId,
      error: isRecord(error) && typeof error.message === 'string' ? { message: error.message } : {},
    }
  }
  return undefined
}

/** Whether an opening item is the host's ready frame. */
function isReadyFrame(value: unknown): boolean {
  return isRecord(value) && value.type === 'ready'
}

/** Project one downlink frame onto a forwarded host event. */
function toHostEvent(value: unknown): HostEvent | undefined {
  if (!isRecord(value) || value.type !== 'emit') return undefined
  const event = value.event
  const args = value.args
  if (typeof event !== 'string' || !Array.isArray(args)) return undefined
  return { event, args }
}

/** Whether a value is a plain object with string keys. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
