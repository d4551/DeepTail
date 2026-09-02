/**
 * Logical streams over one host's Remote stream mux.
 *
 * The Gateway multiplexes every stream over a single WebSocket at
 * `/api/remote.mux`. The wire is five messages: a client opens or cancels a
 * logical stream by id, and the host answers with items, one error, or an end.
 * DeepTail needs one of those streams — the Gateway's reserved `$events`
 * channel, which carries the roster events that keep the fleet live.
 *
 * The frames themselves are `./frames.ts`; what lives here is the connection:
 * one socket at a time, and the policy that decides when to open the next.
 *
 * @module
 */

import { cancelFrame, type HostEvent, openFrame, readSocketFrame } from './frames.ts'
import { SOCKET_OPEN } from './socket-state.ts'
import type { CarrierHooks, MuxSocketLike } from './transport.ts'

export type { HostEvent }

/** First reconnect delay; each further attempt doubles it. */
const RETRY_BASE_MS = 500
/** Ceiling for the reconnect delay, so a long outage still retries steadily. */
const RETRY_CEILING_MS = 30_000

/** What a roster subscriber is told. */
export interface RosterSinks {
  /** The host answered its opening frame; the connection is established. */
  onReady: () => void
  /** One forwarded host event. */
  onEvent: (event: HostEvent) => void
  /** The stream ended or failed; the subscriber should treat the host as offline. */
  onLost: (reason: string) => void
}

/** The callbacks a connection hands to its own socket's listeners. */
interface StreamHandlers {
  /** Take one message the socket dispatched. */
  receive: (event: Event) => void
  /** End the connection and report what ended it. */
  fail: (reason: string) => void
  /** Whether the connection has already been closed. */
  isClosed: () => boolean
}

/**
 * How long to wait before opening the next connection.
 *
 * Exponential with a cap, jittered so a whole fleet does not return in lockstep
 * and give the hosts a synchronised thundering herd. The cap is what keeps a
 * long outage retrying at all rather than doubling into hours.
 *
 * Exported because it is the reconnection policy rather than an implementation
 * detail: a ceiling and a spread are properties worth stating and worth
 * checking, and neither is observable from the connection that uses them.
 *
 * @param attempt - how many reconnects have already been scheduled.
 * @returns the delay in milliseconds.
 */
export function retryDelay(attempt: number): number {
  const backoff = Math.min(RETRY_CEILING_MS, RETRY_BASE_MS * 2 ** attempt)
  return backoff * (0.8 + Math.random() * 0.4)
}

/**
 * Attach one connection's listeners to the socket carrying it.
 *
 * The opening frame goes out only once the socket reports open, and never after
 * the connection has closed, so a socket that lost its race with disposal or
 * with a successor stays silent.
 *
 * @param socket - the mux socket this connection owns.
 * @param streamId - the logical stream id it claims.
 * @param handlers - the connection's own callbacks.
 * @returns nothing.
 */
function wireEventStream(socket: MuxSocketLike, streamId: string, handlers: StreamHandlers): void {
  socket.addEventListener('message', handlers.receive)
  socket.addEventListener(
    'close',
    () => {
      handlers.fail('connection closed')
    },
    { once: true },
  )
  socket.addEventListener(
    'error',
    () => {
      handlers.fail('connection failed')
    },
    { once: true },
  )
  socket.addEventListener(
    'open',
    () => {
      if (handlers.isClosed()) return
      socket.send(openFrame(streamId))
    },
    { once: true },
  )
}

/**
 * Open one connection to the event stream over a fresh mux socket.
 *
 * Each connection owns its stream id, its ready flag and a closed latch, and
 * every callback is gated on that latch. Closing therefore silences a
 * connection for good: a socket that has been replaced can never report against
 * the one that succeeded it, and nothing speaks after disposal.
 *
 * @param carrier - the transport reaching one paired host.
 * @param sinks - where this connection reports readiness, events and loss.
 * @returns a closer that cancels the stream, closes the socket and silences the
 *   connection; calling it again does nothing further.
 */
function openEventStream(carrier: CarrierHooks, sinks: RosterSinks): () => void {
  const streamId = `deeptail-${crypto.randomUUID()}`
  const socket = carrier.openMuxSocket()
  let ready = false
  let closed = false

  /**
   * Cancel the stream, close the socket, and latch the connection shut.
   *
   * The latch is what silences the connection: every callback reads it, so
   * detaching listeners as well would only be a second way of saying the same
   * thing, and a second thing to keep in step.
   */
  function close(): void {
    if (closed) return
    closed = true
    if (socket.readyState === SOCKET_OPEN) socket.send(cancelFrame(streamId))
    socket.close()
  }

  /** Latch the connection shut first, then say why it ended. */
  function fail(reason: string): void {
    if (closed) return
    close()
    sinks.onLost(reason)
  }

  /** Act on one message the socket dispatched. */
  function receive(event: Event): void {
    if (closed) return
    const outcome = readSocketFrame(event, streamId, ready)
    switch (outcome.kind) {
      case 'ready':
        ready = true
        sinks.onReady()
        break
      case 'event':
        sinks.onEvent(outcome.event)
        break
      case 'lost':
        fail(outcome.reason)
        break
      default:
        break
    }
  }

  wireEventStream(socket, streamId, { receive, fail, isClosed: () => closed })
  return close
}

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
  let close: (() => void) | undefined
  let disposed = false
  let attempt = 0
  let retry: ReturnType<typeof setTimeout> | undefined

  const connect = (): void => {
    retry = undefined
    if (disposed) return
    close = openEventStream(carrier, {
      onReady: () => {
        attempt = 0
        sinks.onReady()
      },
      onEvent: (event) => {
        sinks.onEvent(event)
      },
      onLost: (reason) => {
        sinks.onLost(reason)
        if (disposed) return
        retry = setTimeout(connect, retryDelay(attempt))
        attempt += 1
      },
    })
  }

  connect()

  return () => {
    // Disposal is final. The latch is what makes reconnection impossible —
    // a timer that fires after it finds `disposed` set and returns — and
    // clearing the timer is what stops it outliving the subscription that
    // scheduled it.
    disposed = true
    if (retry !== undefined) clearTimeout(retry)
    retry = undefined
    close?.()
  }
}
