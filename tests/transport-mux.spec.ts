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
import { resetDocument } from './dom.ts'
import {
  channels,
  countOf,
  invocations,
  refuseCloseMuxWith,
  refuseOpenMuxWith,
  refuseSendMuxWith,
  resetTransportDouble,
  tick,
  transport,
  watch,
} from './transport-double.ts'

beforeEach(() => {
  resetDocument()
  resetTransportDouble()
})

describe('the mux socket', () => {
  it('opens through Rust, handing it the channel it registered', () => {
    const carrier = transport.createCarrier('host-1')
    const socket = carrier.openMuxSocket()
    expect(socket.readyState).toBe(SOCKET_CONNECTING)
    expect(invocations.length).toBe(1)
    expect(invocations[0]?.command).toBe('carrier_open_mux')
    expect(invocations[0]?.host).toBe('host-1')
    expect(invocations[0]?.channel).toBe(channels[0])
  })

  it('reaches OPEN and announces it when the mux says open', () => {
    const carrier = transport.createCarrier('host-1')
    const socket = carrier.openMuxSocket()
    const seen = watch(socket)
    channels[0]?.receive({ type: 'open' })
    expect(socket.readyState).toBe(SOCKET_OPEN)
    expect(seen.events).toEqual(['open'])
  })

  it('announces a suspended close, and a second close is a no-op', () => {
    const carrier = transport.createCarrier('host-1')
    const socket = carrier.openMuxSocket()
    channels[0]?.receive({ type: 'open' })
    const seen = watch(socket)
    socket.close()
    socket.close()
    expect(socket.readyState).toBe(SOCKET_CLOSED)
    expect(seen.events).toEqual(['close'])
    expect(seen.close()?.code).toBe(SOCKET_CLOSE_NORMAL)
    expect(seen.close()?.reason).toBe('suspended')
    expect(countOf('carrier_close_mux')).toBe(1)
    expect(invocations.at(-1)?.host).toBe('host-1')
  })
})

describe('the refusals the socket retires itself on', () => {
  it('retires the socket when opening is refused', async () => {
    refuseOpenMuxWith(new Error('no socket for host'))
    const carrier = transport.createCarrier('host-1')
    const socket = carrier.openMuxSocket()
    const seen = watch(socket)
    await tick()
    expect(seen.events).toEqual(['error', 'close'])
    expect(socket.readyState).toBe(SOCKET_CLOSED)
    expect(seen.close()?.code).toBe(SOCKET_CLOSE_ABNORMAL)
    expect(seen.close()?.reason).toBe('no socket for host')
  })

  it('does not double-signal when Rust refuses a close it already announced', async () => {
    refuseCloseMuxWith(new Error('nothing to close'))
    const carrier = transport.createCarrier('host-1')
    const socket = carrier.openMuxSocket()
    const seen = watch(socket)
    socket.close()
    await tick()
    expect(seen.events).toEqual(['close'])
    expect(socket.readyState).toBe(SOCKET_CLOSED)
  })
})

describe('the frames the mux wire carries', () => {
  it('delivers a message frame as a MessageEvent carrying its data', () => {
    const carrier = transport.createCarrier('host-1')
    const socket = carrier.openMuxSocket()
    const seen = watch(socket)
    channels[0]?.receive({ type: 'message', data: 'down-link' })
    expect(seen.message()?.type).toBe('message')
    expect(seen.message()?.data).toBe('down-link')
  })

  it('announces an error frame as an error event', () => {
    const carrier = transport.createCarrier('host-1')
    const socket = carrier.openMuxSocket()
    const seen = watch(socket)
    channels[0]?.receive({ type: 'error', message: 'mux lost' })
    expect(seen.events).toEqual(['error'])
  })

  it('closes with the code and reason the close frame carries', () => {
    const carrier = transport.createCarrier('host-1')
    const socket = carrier.openMuxSocket()
    const seen = watch(socket)
    channels[0]?.receive({ type: 'close', code: 4321, reason: 'host said so' })
    expect(socket.readyState).toBe(SOCKET_CLOSED)
    expect(seen.close()?.code).toBe(4321)
    expect(seen.close()?.reason).toBe('host said so')
  })

  it('retires the socket when a send is refused, and does not stay OPEN', async () => {
    const carrier = transport.createCarrier('host-1')
    const socket = carrier.openMuxSocket()
    channels[0]?.receive({ type: 'open' })
    refuseSendMuxWith(new Error('write refused'))
    const seen = watch(socket)
    socket.send('up-link')
    await tick()
    expect(invocations[1]?.command).toBe('carrier_send_mux')
    expect(invocations[1]?.data).toBe('up-link')
    expect(seen.events).toEqual(['error', 'close'])
    expect(socket.readyState).toBe(SOCKET_CLOSED)
    expect(seen.close()?.code).toBe(SOCKET_CLOSE_ABNORMAL)
  })

  it('throws on a frame tag the page union does not name', () => {
    const carrier = transport.createCarrier('host-1')
    carrier.openMuxSocket()
    expect(() => channels[0]?.receive({ type: 'stranger' })).toThrow('deeptail: unknown mux frame {"type":"stranger"}')
  })
})

describe('suspending the mux socket', () => {
  it('closes the live socket through its own view, and the second call is a no-op', () => {
    const carrier = transport.createCarrier('host-1')
    const socket = carrier.openMuxSocket()
    channels[0]?.receive({ type: 'open' })
    const seen = watch(socket)
    carrier.suspendMuxSocket()
    carrier.suspendMuxSocket()
    expect(socket.readyState).toBe(SOCKET_CLOSED)
    expect(seen.events).toEqual(['close'])
    expect(countOf('carrier_close_mux')).toBe(1)
  })
})
