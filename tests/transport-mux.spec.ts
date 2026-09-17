/**
 * The `__DSH_TRANSPORT__` carrier's mux socket, driven through the Tauri IPC.
 *
 * The socket is a WebSocket face over a Rust channel: it registers the channel
 * with the invoke double, announces its lifecycle as the mux's frames land, and
 * retires itself when Rust refuses a call. The assertions read the events the
 * socket announced and the state it moved to — what a page holding the socket
 * would have seen.
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import {
  SOCKET_CLOSE_ABNORMAL,
  SOCKET_CLOSE_NORMAL,
  SOCKET_CLOSED,
  SOCKET_CONNECTING,
  SOCKET_OPEN,
} from '../apps/deeptail/src/socket-state.ts'
import type { MuxSocketLike } from '../apps/deeptail/src/transport.ts'
import { resetDocument } from './dom.ts'
import type { WireFrame } from './tauri-script.ts'
import {
  callbackRegistrations,
  channels,
  countOf,
  type Invocation,
  invocations,
  muxChannel,
  type OpenChannel,
  refuseCloseMuxWith,
  refuseOpenMuxWith,
  refuseSendMuxWith,
  resetTransportDouble,
  tick,
  transport,
  watch,
} from './transport-double.ts'

/** The one host every case pairs with, so a recorded call is read by host. */
const HOST = 'host-1'

/**
 * One frame as the wire carries it.
 *
 * Every field the wire declares is written, and a frame that carries none of
 * them carries `null`: the value a channel is handed is a wire value, and a
 * member that is merely absent is not one.
 * @param type - the frame's tag.
 * @param fields - the members the tag carries.
 * @returns the frame.
 */
function frame(
  type: WireFrame['type'],
  fields: Partial<Pick<WireFrame, 'data' | 'message' | 'code' | 'reason'>> = {},
): WireFrame {
  return {
    type,
    data: fields.data ?? null,
    message: fields.message ?? null,
    code: fields.code ?? null,
    reason: fields.reason ?? null,
  }
}

/** A carrier holding one socket, and the channel Rust would have been handed. */
interface Opened {
  /** The socket the page holds. */
  readonly socket: MuxSocketLike
  /** The channel it registered, which is what drives the wire in a case. */
  readonly channel: OpenChannel
  /** What the socket announced, from the moment this was built. */
  readonly seen: ReturnType<typeof watch>
}

beforeEach(() => {
  resetDocument()
  resetTransportDouble()
})

/**
 * Open the mux socket of a fresh carrier.
 *
 * `carrier_open_mux` is an invoke like any other, so the channel a case drives
 * lands once that call has settled rather than at the moment the socket was
 * asked for; a case that reached for it synchronously would drive a wire the
 * page never finished opening. The watch is taken before the settle so an event
 * the open itself announces is read as well.
 * @returns the socket, its channel, and what it announced.
 */
async function openedMux(): Promise<Opened> {
  const socket = transport.createCarrier(HOST).openMuxSocket()
  const seen = watch(socket)
  await tick()
  return { socket, channel: muxChannel(), seen }
}

/** The last call the page made, which is the one a case just provoked. */
function lastCall(): Invocation | undefined {
  return invocations.at(-1)
}

/**
 * Open the mux socket of a fresh carrier, and deliver the frame that says the
 * mux is open.
 *
 * The opening frame is what a connected socket carries, and most cases need
 * that socket rather than the connecting one, so the frame and the reads that
 * usually follow it are taken here.
 * @param held - the frame to deliver; `open` unless a case says otherwise.
 * @returns the socket, its channel, and what it announced.
 */
async function muxHolding(held: WireFrame = frame('open')): Promise<Opened> {
  const opened = await openedMux()
  opened.channel.receive(held)
  return opened
}

/**
 * Assert that the socket retired, at the code the close it announced carries.
 * @param opened - the socket and what it announced.
 * @param code - the close code the retirement is expected to carry.
 */
function expectRetired(opened: Opened, code: number): void {
  expect(opened.socket.readyState).toBe(SOCKET_CLOSED)
  expect(opened.seen.close()?.code).toBe(code)
}

describe('the mux socket', () => {
  it('ZZPROBE opens the wire through the runtime the page holds', () => {
    const carrier = transport.createCarrier(HOST)
    const socket = carrier.openMuxSocket()
    // The page reached Tauri, not a stand-in: the channel it registered went
    // through the runtime's own `transformCallback`, and the identifier that
    // came back is the one `carrier_open_mux` was handed.
    expect({
      registered: callbackRegistrations(),
      commands: invocations.map((call) => call.command),
      channel: channels[0]?.id,
      connecting: socket.readyState === SOCKET_CONNECTING,
    }).toEqual({ registered: 1, commands: ['carrier_open_mux'], channel: '1', connecting: true })
  })

  it('opens through Rust, handing it the channel it registered', async () => {
    const { socket, channel } = await openedMux()
    expect(socket.readyState).toBe(SOCKET_CONNECTING)
    expect(invocations.length).toBe(1)
    expect(invocations[0]?.command).toBe('carrier_open_mux')
    expect(invocations[0]?.host).toBe(HOST)
    expect(invocations[0]?.channel).toBe(channel.id)
    expect(channels).toEqual([channel])
  })

  it('reaches OPEN and announces it when the mux says open', async () => {
    const { socket, seen } = await muxHolding()
    expect(socket.readyState).toBe(SOCKET_OPEN)
    expect(seen.events).toEqual(['open'])
  })

  it('announces a suspended close, and a second close is a no-op', async () => {
    const { socket, seen } = await muxHolding()
    socket.close()
    socket.close()
    expect(socket.readyState).toBe(SOCKET_CLOSED)
    expect(seen.events).toEqual(['open', 'close'])
    expect(seen.close()?.code).toBe(SOCKET_CLOSE_NORMAL)
    expect(seen.close()?.reason).toBe('suspended')
    expect(countOf('carrier_close_mux')).toBe(1)
    expect(lastCall()?.host).toBe(HOST)
  })
})

describe('the refusals the socket retires itself on', () => {
  it('retires the socket when opening is refused', async () => {
    refuseOpenMuxWith(new Error('no socket for host'))
    const opened = await openedMux()
    expect(opened.seen.events).toEqual(['error', 'close'])
    expectRetired(opened, SOCKET_CLOSE_ABNORMAL)
    expect(opened.seen.close()?.reason).toBe('no socket for host')
  })

  it('does not double-signal when Rust refuses a close it already announced', async () => {
    refuseCloseMuxWith(new Error('nothing to close'))
    const opened = await openedMux()
    opened.socket.close()
    await Promise.resolve()
    expect(opened.seen.events).toEqual(['close'])
    expect(opened.socket.readyState).toBe(SOCKET_CLOSED)
  })
})

describe('the frames the mux wire carries', () => {
  it('delivers a message frame as a MessageEvent carrying its data', async () => {
    const { seen } = await muxHolding(frame('message', { data: 'down-link' }))
    expect(seen.message()?.type).toBe('message')
    expect(seen.message()?.data).toBe('down-link')
  })

  it('announces an error frame as an error event', async () => {
    const { seen } = await muxHolding(frame('error', { message: 'mux lost' }))
    expect(seen.events).toEqual(['error'])
  })

  it('closes with the code and reason the close frame carries', async () => {
    const opened = await muxHolding(frame('close', { code: 4321, reason: 'host said so' }))
    expectRetired(opened, 4321)
    expect(opened.seen.close()?.reason).toBe('host said so')
  })

  it('retires the socket when a send is refused, and does not stay OPEN', async () => {
    const opened = await muxHolding()
    refuseSendMuxWith(new Error('write refused'))
    opened.socket.send('up-link')
    await tick()
    expect(invocations[1]?.command).toBe('carrier_send_mux')
    expect(invocations[1]?.data).toBe('up-link')
    expect(opened.seen.events).toEqual(['open', 'error', 'close'])
    expectRetired(opened, SOCKET_CLOSE_ABNORMAL)
  })

  it('throws on a frame tag the page union does not name', async () => {
    const { channel } = await openedMux()
    // The refusal names the tag it could not read, so the two halves of the
    // wire disagreeing is a message rather than a silent drop. It is asserted
    // by what it says the frame was, not by the whole rendering of it: the
    // members the frame carries are the double's business, not the socket's.
    expect(() => channel.receive(frame('stranger'))).toThrow('deeptail: unknown mux frame')
  })
})

describe('suspending the mux socket', () => {
  it('closes the live socket through its own view, and the second call is a no-op', async () => {
    const carrier = transport.createCarrier(HOST)
    const socket = carrier.openMuxSocket()
    const seen = watch(socket)
    await Promise.resolve()
    muxChannel().receive(frame('open'))
    carrier.suspendMuxSocket()
    carrier.suspendMuxSocket()
    expect(socket.readyState).toBe(SOCKET_CLOSED)
    expect(seen.events).toEqual(['open', 'close'])
    expect(countOf('carrier_close_mux')).toBe(1)
  })
})
