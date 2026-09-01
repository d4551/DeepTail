/**
 * The roster stream's connection lifecycle.
 *
 * Two guarantees carry it and neither is observable from the DOM: after the
 * disposer returns, nothing this subscription owns may reconnect; and a socket
 * that has already been retired may not retire the one that replaced it. Both
 * are exercised against fake sockets, because a real one cannot be made to fail
 * on cue.
 */

import { expect, it } from 'bun:test'
import { subscribeRoster } from '../apps/deeptail/src/stream.ts'
import type { CarrierHooks, MuxSocketLike } from '../apps/deeptail/src/transport.ts'

/** `WebSocket.OPEN`. */
const OPEN = 1
/** `WebSocket.CLOSED`. */
const CLOSED = 3

/** A socket the test drives directly. */
class FakeSocket extends EventTarget implements MuxSocketLike {
  readyState = OPEN
  readonly sent: string[] = []
  closed = false

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.closed = true
    this.readyState = CLOSED
  }

  /** Announce that the socket is open, which is when the client sends its request. */
  open(): void {
    this.dispatchEvent(new Event('open'))
  }

  /**
   * Deliver one downlink frame.
   * @param value - the frame's item value.
   */
  deliver(value: unknown): void {
    const streamId = JSON.parse(this.sent[0] ?? '{}').streamId as string
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'item', streamId, value }) }))
  }

  /** Announce that the socket has gone away. */
  drop(): void {
    this.readyState = CLOSED
    this.dispatchEvent(new CloseEvent('close', { code: 1006 }))
  }
}

/** A carrier handing out sockets the test keeps hold of. */
function fakeCarrier(): { carrier: CarrierHooks; sockets: FakeSocket[] } {
  const sockets: FakeSocket[] = []
  const carrier = {
    openMuxSocket: () => {
      const socket = new FakeSocket()
      sockets.push(socket)
      return socket
    },
  } as unknown as CarrierHooks
  return { carrier, sockets }
}

/** What the subscription reported. */
function recorder(): { ready: number; lost: string[]; events: string[]; sinks: Parameters<typeof subscribeRoster>[1] } {
  const state = {
    ready: 0,
    lost: [] as string[],
    events: [] as string[],
    sinks: {
      onReady: () => {
        state.ready += 1
      },
      onEvent: (event: { event: string }) => {
        state.events.push(event.event)
      },
      onLost: (reason: string) => {
        state.lost.push(reason)
      },
    },
  }
  return state
}

it('publishes nothing before the host answers with its ready frame', () => {
  const { carrier, sockets } = fakeCarrier()
  const seen = recorder()
  const dispose = subscribeRoster(carrier, seen.sinks)
  sockets[0]?.open()
  // The opening request names the reserved events channel.
  expect(JSON.parse(sockets[0]?.sent[0] ?? '{}').endpoint).toBe('$events')
  expect(seen.ready).toBe(0)
  sockets[0]?.deliver({ type: 'ready', clientId: 'c', host: 'h' })
  expect(seen.ready).toBe(1)
  sockets[0]?.deliver({ type: 'emit', event: 'api-session/added', args: [] })
  expect(seen.events).toEqual(['api-session/added'])
  dispose()
})

it('cancels the stream and closes the socket when disposed', () => {
  const { carrier, sockets } = fakeCarrier()
  const seen = recorder()
  const dispose = subscribeRoster(carrier, seen.sinks)
  sockets[0]?.open()
  sockets[0]?.deliver({ type: 'ready', clientId: 'c', host: 'h' })
  dispose()
  expect(sockets[0]?.closed).toBe(true)
  expect(JSON.parse(sockets[0]?.sent.at(-1) ?? '{}').type).toBe('cancel')
})

it('never reconnects after the disposer has returned', async () => {
  const { carrier, sockets } = fakeCarrier()
  const seen = recorder()
  const dispose = subscribeRoster(carrier, seen.sinks)
  sockets[0]?.open()
  sockets[0]?.deliver({ type: 'ready', clientId: 'c', host: 'h' })
  // Drop first, so a retry is already scheduled, then dispose before it fires.
  // Disposal has to cancel that pending reconnection, not merely close what is
  // open at the moment it runs.
  sockets[0]?.drop()
  expect(seen.lost.length).toBe(1)
  dispose()
  await new Promise<void>((settle) => {
    setTimeout(settle, 1_800)
  })
  expect(sockets.length).toBe(1)
})

it('reports a drop once, however many times the socket announces it', () => {
  const { carrier, sockets } = fakeCarrier()
  const seen = recorder()
  const dispose = subscribeRoster(carrier, seen.sinks)
  sockets[0]?.open()
  sockets[0]?.deliver({ type: 'ready', clientId: 'c', host: 'h' })
  sockets[0]?.drop()
  sockets[0]?.drop()
  sockets[0]?.dispatchEvent(new Event('error'))
  expect(seen.lost.length).toBe(1)
  dispose()
})

it('reconnects after a drop and reports the host reachable again', async () => {
  const { carrier, sockets } = fakeCarrier()
  const seen = recorder()
  const dispose = subscribeRoster(carrier, seen.sinks)
  sockets[0]?.open()
  sockets[0]?.deliver({ type: 'ready', clientId: 'c', host: 'h' })
  sockets[0]?.drop()
  expect(seen.lost.length).toBe(1)
  await new Promise<void>((settle) => {
    setTimeout(settle, 1_500)
  })
  expect(sockets.length).toBeGreaterThan(1)
  const replacement = sockets.at(-1)
  replacement?.open()
  replacement?.deliver({ type: 'ready', clientId: 'c', host: 'h' })
  expect(seen.ready).toBe(2)
  dispose()
})

it('does not let a retired socket retire the one that replaced it', async () => {
  const { carrier, sockets } = fakeCarrier()
  const seen = recorder()
  const dispose = subscribeRoster(carrier, seen.sinks)
  sockets[0]?.open()
  sockets[0]?.deliver({ type: 'ready', clientId: 'c', host: 'h' })
  sockets[0]?.drop()
  await new Promise<void>((settle) => {
    setTimeout(settle, 1_500)
  })
  const replacement = sockets.at(-1)
  replacement?.open()
  replacement?.deliver({ type: 'ready', clientId: 'c', host: 'h' })
  const lostBefore = seen.lost.length
  // The first socket is gone; anything it says now belongs to a connection that
  // no longer exists and must not tear down its successor.
  sockets[0]?.drop()
  expect(seen.lost.length).toBe(lostBefore)
  replacement?.deliver({ type: 'emit', event: 'api-session/removed', args: ['s-1'] })
  expect(seen.events).toContain('api-session/removed')
  dispose()
})

it('treats an opening frame that is not the ready frame as a lost connection', () => {
  const { carrier, sockets } = fakeCarrier()
  const seen = recorder()
  const dispose = subscribeRoster(carrier, seen.sinks)
  sockets[0]?.open()
  sockets[0]?.deliver({ type: 'emit', event: 'api-session/added', args: [] })
  expect(seen.ready).toBe(0)
  expect(seen.lost.length).toBe(1)
  dispose()
})

it('discards a malformed frame instead of throwing', () => {
  const { carrier, sockets } = fakeCarrier()
  const seen = recorder()
  const dispose = subscribeRoster(carrier, seen.sinks)
  sockets[0]?.open()
  expect(() => {
    sockets[0]?.dispatchEvent(new MessageEvent('message', { data: '{not json' }))
  }).not.toThrow()
  expect(seen.lost).toEqual([])
  dispose()
})
