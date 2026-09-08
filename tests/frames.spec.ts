/**
 * The mux wire, in both directions.
 *
 * Every frame that crosses the socket is written and read in `frames.ts`, so
 * the connection above it never touches JSON. That makes this module the one
 * place a malformed frame is discarded — and the one place a frame addressed to
 * another stream, or an opening frame that is not the host's ready frame, is
 * told apart from a frame the connection must act on. Read wrongly, a client
 * either acts on another reader's stream or drops the host's events in silence.
 */

import { describe, expect, it } from 'bun:test'
import {
  cancelFrame,
  decideFrame,
  openFrame,
  readSocketFrame,
  type ServerMessage,
} from '../apps/deeptail/src/frames.ts'

/** The logical stream the connection under test claimed. */
const STREAM = 'stream-1'

/**
 * A socket message carrying whatever the host sent.
 * @param data - the message's data, as the socket dispatched it.
 * @returns the event a socket listener receives.
 */
function dispatched(data: unknown): MessageEvent {
  return new MessageEvent('message', { data })
}

/**
 * One frame as the host writes it on the wire.
 * @param frame - the frame's fields.
 * @returns the serialized text.
 */
function wire(frame: unknown): string {
  return JSON.stringify(frame)
}

describe('the frames a client writes', () => {
  it('opens the reserved event stream, with the payload that stream expects', () => {
    expect(JSON.parse(openFrame(STREAM))).toEqual({
      type: 'open',
      streamId: STREAM,
      endpoint: '$events',
      payload: { args: {} },
    })
  })

  it('cancels a stream by the id it claimed, and says nothing else', () => {
    expect(JSON.parse(cancelFrame(STREAM))).toEqual({ type: 'cancel', streamId: STREAM })
  })
})

describe('the frames a client reads', () => {
  it('reads a frame addressed to the stream it opened', async () => {
    const item = wire({ type: 'item', streamId: STREAM, value: { type: 'ready' } })
    expect(await readSocketFrame(dispatched(item), STREAM)).toEqual({
      type: 'item',
      streamId: STREAM,
      value: { type: 'ready' },
    })
  })

  it('reads an item that carries no value as one, rather than as no frame', async () => {
    const item = wire({ type: 'item', streamId: STREAM })
    expect(await readSocketFrame(dispatched(item), STREAM)).toEqual({ type: 'item', streamId: STREAM })
  })

  it('reads an end and an error, with the error’s message when it carries one', async () => {
    expect(await readSocketFrame(dispatched(wire({ type: 'end', streamId: STREAM })), STREAM)).toEqual({
      type: 'end',
      streamId: STREAM,
    })
    const failed = wire({ type: 'error', streamId: STREAM, error: { message: 'the host gave up' } })
    expect(await readSocketFrame(dispatched(failed), STREAM)).toEqual({
      type: 'error',
      streamId: STREAM,
      error: { message: 'the host gave up' },
    })
    const bare = wire({ type: 'error', streamId: STREAM, error: { code: 7 } })
    expect(await readSocketFrame(dispatched(bare), STREAM)).toEqual({
      type: 'error',
      streamId: STREAM,
      error: {},
    })
  })
})

describe('the frames a client passes over', () => {
  it('reads nothing out of a frame addressed to another stream', async () => {
    // The socket carries every logical stream at once. A reader that answered
    // for another id would act on a stream it never opened.
    const item = wire({ type: 'item', streamId: 'stream-2', value: { type: 'ready' } })
    expect(await readSocketFrame(dispatched(item), STREAM)).toBeNull()
  })

  it('reads nothing out of text that is not a frame this wire knows', async () => {
    const cases = [
      'not json at all',
      wire({ streamId: STREAM }),
      wire({ type: 'open', streamId: STREAM }),
      wire({ type: 'item' }),
      wire({ type: 'item', streamId: 7 }),
      wire([1, 2, 3]),
      wire(null),
      wire('a string'),
    ]
    const read = await Promise.all(cases.map(async (text) => await readSocketFrame(dispatched(text), STREAM)))
    expect(read).toEqual(cases.map(() => null))
  })

  it('reads nothing out of anything but a socket message carrying text', async () => {
    expect(await readSocketFrame(new Event('open'), STREAM)).toBeNull()
    expect(await readSocketFrame(dispatched({ type: 'item', streamId: STREAM }), STREAM)).toBeNull()
    expect(await readSocketFrame(dispatched(7), STREAM)).toBeNull()
  })
})

describe('what one frame asks of the connection', () => {
  it('takes the host’s ready frame as the stream being attached', () => {
    const opening: ServerMessage = { type: 'item', streamId: STREAM, value: { type: 'ready' } }
    expect(decideFrame(opening, false)).toEqual({ kind: 'ready' })
  })

  it('gives up when the opening frame is anything else', () => {
    // The opening item is the only proof the host attached its listeners.
    // Anything else means this is not the stream that was asked for, and
    // carrying on would read another stream's frames as this one's events.
    const opening: ServerMessage = { type: 'item', streamId: STREAM, value: { type: 'emit', event: 'x', args: [] } }
    expect(decideFrame(opening, false)).toEqual({
      kind: 'lost',
      reason: 'host opened the event stream with an unexpected frame',
    })
    expect(decideFrame({ type: 'item', streamId: STREAM }, false)).toEqual({
      kind: 'lost',
      reason: 'host opened the event stream with an unexpected frame',
    })
  })

  it('forwards an emitted host event once the stream is attached', () => {
    const emitted: ServerMessage = {
      type: 'item',
      streamId: STREAM,
      value: { type: 'emit', event: 'session/update', args: [{ id: 'a' }, 2] },
    }
    expect(decideFrame(emitted, true)).toEqual({
      kind: 'event',
      event: { event: 'session/update', args: [{ id: 'a' }, 2] },
    })
  })
})

describe('an item the connection cannot act on', () => {
  it('passes over an item that carries no event to forward', () => {
    const cases: readonly ServerMessage[] = [
      { type: 'item', streamId: STREAM },
      { type: 'item', streamId: STREAM, value: { type: 'ready' } },
      { type: 'item', streamId: STREAM, value: { type: 'emit', args: [] } },
      { type: 'item', streamId: STREAM, value: { type: 'emit', event: 'x' } },
      { type: 'item', streamId: STREAM, value: { type: 'emit', event: 'x', args: 'not a list' } },
      { type: 'item', streamId: STREAM, value: [1, 2] },
      { type: 'item', streamId: STREAM, value: 'text' },
    ]
    expect(cases.map((message) => decideFrame(message, true))).toEqual(cases.map(() => ({ kind: 'ignore' })))
  })

  it('gives up on an error frame, keeping the host’s own account of it', () => {
    expect(decideFrame({ type: 'error', streamId: STREAM, error: { message: 'gone' } }, true)).toEqual({
      kind: 'lost',
      reason: 'gone',
    })
    expect(decideFrame({ type: 'error', streamId: STREAM, error: {} }, true)).toEqual({
      kind: 'lost',
      reason: 'event stream failed',
    })
  })

  it('gives up when the stream ends, whether or not it was attached', () => {
    expect(decideFrame({ type: 'end', streamId: STREAM }, true)).toEqual({
      kind: 'lost',
      reason: 'event stream ended',
    })
    expect(decideFrame({ type: 'end', streamId: STREAM }, false)).toEqual({
      kind: 'lost',
      reason: 'event stream ended',
    })
  })
})
