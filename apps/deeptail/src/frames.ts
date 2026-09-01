/**
 * The Remote stream mux wire, in both directions.
 *
 * A client opens or cancels a logical stream by id, and the host answers with
 * items, one error, or an end. Every frame that crosses the socket is written
 * and read here, so the connection above it never touches JSON and a malformed
 * frame is discarded at exactly one place.
 *
 * @module
 */

/** The Gateway's reserved logical stream carrying forwarded host events. */
const EVENT_STREAM_ENDPOINT = '$events'
/** The opening payload that stream expects. */
const EVENT_STREAM_PAYLOAD = { args: {} } as const

/** One host event forwarded to this client. */
export interface HostEvent {
  readonly event: string
  readonly args: readonly unknown[]
}

/** A server frame on the mux. */
type ServerMessage =
  | { readonly type: 'item'; readonly streamId: string; readonly value?: unknown }
  | { readonly type: 'error'; readonly streamId: string; readonly error: { message?: string } }
  | { readonly type: 'end'; readonly streamId: string }

/** What one frame asks of the connection that opened the stream. */
type FrameOutcome =
  | { readonly kind: 'ignore' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'event'; readonly event: HostEvent }
  | { readonly kind: 'lost'; readonly reason: string }

/** A frame carrying nothing the connection can act on. */
const IGNORE: FrameOutcome = { kind: 'ignore' }

/**
 * The frame that opens the event stream.
 * @param streamId - the id the connection claims for its logical stream.
 * @returns the serialized frame.
 */
export function openFrame(streamId: string): string {
  return JSON.stringify({
    type: 'open',
    streamId,
    endpoint: EVENT_STREAM_ENDPOINT,
    payload: EVENT_STREAM_PAYLOAD,
  })
}

/**
 * The frame that cancels a logical stream.
 * @param streamId - the id the connection claimed.
 * @returns the serialized frame.
 */
export function cancelFrame(streamId: string): string {
  return JSON.stringify({ type: 'cancel', streamId })
}

/**
 * Read one message the mux socket dispatched.
 *
 * The socket carries every logical stream at once, so anything addressed to
 * another id belongs to another reader and is left alone.
 *
 * @param event - whatever the socket dispatched.
 * @param streamId - the logical stream the connection opened.
 * @param ready - whether the host's ready frame has already arrived.
 * @returns what the connection should do with the message.
 */
export function readSocketFrame(event: Event, streamId: string, ready: boolean): FrameOutcome {
  // The adapter dispatches a real MessageEvent; narrowing on the instance
  // avoids a cast and rejects anything else the target might receive.
  if (!(event instanceof MessageEvent)) return IGNORE
  const data: unknown = event.data
  if (typeof data !== 'string') return IGNORE
  const message = parseServerMessage(data)
  if (message === undefined || message.streamId !== streamId) return IGNORE
  return readFrame(message, ready)
}

/**
 * Decide what one frame on our own stream means.
 * @param message - the parsed frame.
 * @param ready - whether the host's ready frame has already arrived.
 * @returns what the connection should do with the frame.
 */
function readFrame(message: ServerMessage, ready: boolean): FrameOutcome {
  switch (message.type) {
    case 'item': {
      if (!ready) {
        // The opening item proves the host attached its listeners. Only a ready
        // frame counts; anything else means we are not talking to the stream we
        // asked for.
        if (!isReadyFrame(message.value)) {
          return { kind: 'lost', reason: 'host opened the event stream with an unexpected frame' }
        }
        return { kind: 'ready' }
      }
      const forwarded = toHostEvent(message.value)
      return forwarded === undefined ? IGNORE : { kind: 'event', event: forwarded }
    }
    case 'error':
      return { kind: 'lost', reason: message.error.message ?? 'event stream failed' }
    case 'end':
      return { kind: 'lost', reason: 'event stream ended' }
    default:
      return IGNORE
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
