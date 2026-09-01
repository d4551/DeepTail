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

/** First reconnect delay; each further attempt doubles it. */
const RETRY_BASE_MS = 500
/** Ceiling for the reconnect delay, so a long outage still retries steadily. */
const RETRY_CEILING_MS = 30_000

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
 * A dropped connection is retried with jittered exponential backoff, because a
 * fleet control plane whose whole value is a live roster cannot answer a wifi
 * blip by staying offline until the app is restarted. `onLost` still fires so
 * the host reads as offline while the retries run, and `onReady` firing again
 * is what returns it to online.
 *
 * @param carrier - the transport reaching one paired host.
 * @param sinks - roster callbacks.
 * @returns a disposer that cancels the stream, closes the socket, and
 *   guarantees no further reconnection.
 */
export function subscribeRoster(carrier: CarrierHooks, sinks: RosterSinks): () => void {
  let socket: MuxSocketLike | undefined
  let streamId = ''
  let ready = false
  let disposed = false
  let attempt = 0
  let retry: ReturnType<typeof setTimeout> | undefined
  // Every socket the subscription opens gets a generation, and only the newest
  // one may report. A close arriving from a socket already replaced would
  // otherwise retire the connection that succeeded it.
  let generation = 0
  let onMessage: ((event: Event) => void) | undefined

  const detach = (): void => {
    const current = socket
    socket = undefined
    if (current === undefined) return
    if (onMessage !== undefined) current.removeEventListener('message', onMessage)
    if (current.readyState === SOCKET_OPEN) current.send(JSON.stringify({ type: 'cancel', streamId }))
    current.close()
  }

  const schedule = (): void => {
    if (disposed) return
    // Exponential with a cap, jittered so a whole fleet does not return in
    // lockstep and give the hosts a synchronised thundering herd.
    const backoff = Math.min(RETRY_CEILING_MS, RETRY_BASE_MS * 2 ** attempt)
    attempt += 1
    retry = setTimeout(open, backoff * (0.8 + Math.random() * 0.4))
  }

  const lose = (mine: number, reason: string): void => {
    if (disposed || mine !== generation) return
    generation += 1
    detach()
    sinks.onLost(reason)
    schedule()
  }

  function open(): void {
    retry = undefined
    if (disposed) return
    generation += 1
    const mine = generation
    const id = `deeptail-${crypto.randomUUID()}`
    streamId = id
    ready = false

    const next = carrier.openMuxSocket()
    socket = next

    const handle = (event: Event): void => {
      // The adapter dispatches a real MessageEvent; narrowing on the instance
      // avoids a cast and rejects anything else the target might receive.
      if (disposed || mine !== generation) return
      if (!(event instanceof MessageEvent)) return
      const data: unknown = event.data
      if (typeof data !== 'string') return
      const message = parseServerMessage(data)
      if (message === undefined || message.streamId !== id) return
      switch (message.type) {
        case 'item': {
          if (!ready) {
            // The opening item proves the host attached its listeners. Only a
            // ready frame counts; anything else means we are not talking to the
            // stream we asked for.
            if (!isReadyFrame(message.value)) {
              lose(mine, 'host opened the event stream with an unexpected frame')
              return
            }
            ready = true
            attempt = 0
            sinks.onReady()
            return
          }
          const forwarded = toHostEvent(message.value)
          if (forwarded !== undefined) sinks.onEvent(forwarded)
          return
        }
        case 'error':
          lose(mine, message.error.message ?? 'event stream failed')
          break
        case 'end':
          lose(mine, 'event stream ended')
          break
        default:
          break
      }
    }
    onMessage = handle
    next.addEventListener('message', handle)
    next.addEventListener(
      'close',
      () => {
        lose(mine, 'connection closed')
      },
      { once: true },
    )
    next.addEventListener(
      'error',
      () => {
        lose(mine, 'connection failed')
      },
      { once: true },
    )
    next.addEventListener(
      'open',
      () => {
        if (disposed || mine !== generation) return
        next.send(
          JSON.stringify({
            type: 'open',
            streamId: id,
            endpoint: EVENT_STREAM_ENDPOINT,
            payload: EVENT_STREAM_PAYLOAD,
          }),
        )
      },
      { once: true },
    )
  }

  open()

  return () => {
    // Disposal is final: the generation is retired and the pending retry is
    // cleared, so nothing this subscription owns can reopen after this returns.
    disposed = true
    generation += 1
    if (retry !== undefined) clearTimeout(retry)
    retry = undefined
    detach()
  }
}

/**
 * Parse one mux frame, discarding anything that is not a frame we handle.
 * @param text - the raw text message.
 * @returns the frame, or undefined when it is not one.
 */
function parseServerMessage(text: string): ServerMessage | undefined {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return undefined
  }
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
