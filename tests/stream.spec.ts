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
import { retryDelay, subscribeRoster } from '../apps/deeptail/src/stream.ts'
import type { CarrierHooks, MuxSocketLike } from '../apps/deeptail/src/transport.ts'
import type { JsonValue } from '../apps/deeptail/tests/tauri-ipc.ts'

/** WebSocket readyState: open, then closed after a drop. */
const OPEN = 1
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

  /** Deliver one downlink frame: the given value as the item's value. */
  deliver(value: JsonValue): void {
    const opening = JSON.parse(this.sent[0] ?? '{}')
    const streamId = typeof opening.streamId === 'string' ? opening.streamId : ''
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ type: 'item', streamId, value }) }))
  }

  /** Announce the socket has gone away. */
  drop(): void {
    this.readyState = CLOSED
    this.dispatchEvent(new CloseEvent('close', { code: 1006 }))
  }
}

/** A carrier handing out sockets the test keeps hold of. */
function fakeCarrier(): { carrier: Pick<CarrierHooks, 'openMuxSocket'>; sockets: FakeSocket[] } {
  const sockets: FakeSocket[] = []
  const carrier: Pick<CarrierHooks, 'openMuxSocket'> = {
    openMuxSocket: (): MuxSocketLike => {
      const socket = new FakeSocket()
      sockets.push(socket)
      return socket
    },
  }
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

/** Advance the clock, so timers the client set have fired. */
const tick = (ms: number): Promise<void> =>
  new Promise((settle) => {
    setTimeout(settle, ms)
  })

/** Lets the wire's asynchronous parse land before the test asserts. */
const parsed = (): Promise<void> => tick(0)

it('publishes nothing before the host answers with its ready frame', async () => {
  const { carrier, sockets } = fakeCarrier()
  const seen = recorder()
  const dispose = subscribeRoster(carrier, seen.sinks)
  sockets[0]?.open()
  // The opening request names the reserved events channel.
  expect(JSON.parse(sockets[0]?.sent[0] ?? '{}').endpoint).toBe('$events')
  expect(seen.ready).toBe(0)
  sockets[0]?.deliver({ type: 'ready', clientId: 'c', host: 'h' })
  await parsed()
  expect(seen.ready).toBe(1)
  sockets[0]?.deliver({ type: 'emit', event: 'api-session/added', args: [] })
  await parsed()
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
  await tick(1_800)
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
  await parsed()
  sockets[0]?.drop()
  expect(seen.lost.length).toBe(1)
  await tick(1_500)
  expect(sockets.length).toBeGreaterThan(1)
  const replacement = sockets.at(-1)
  replacement?.open()
  replacement?.deliver({ type: 'ready', clientId: 'c', host: 'h' })
  await parsed()
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
  await tick(1_500)
  const replacement = sockets.at(-1)
  replacement?.open()
  replacement?.deliver({ type: 'ready', clientId: 'c', host: 'h' })
  await parsed()
  const lostBefore = seen.lost.length
  // The first socket is gone; anything it says now belongs to a connection that
  // no longer exists and must not tear down its successor.
  sockets[0]?.drop()
  expect(seen.lost.length).toBe(lostBefore)
  replacement?.deliver({ type: 'emit', event: 'api-session/removed', args: ['s-1'] })
  await parsed()
  expect(seen.events).toContain('api-session/removed')
  dispose()
})

it('treats an opening frame that is not the ready frame as a lost connection', async () => {
  const { carrier, sockets } = fakeCarrier()
  const seen = recorder()
  const dispose = subscribeRoster(carrier, seen.sinks)
  sockets[0]?.open()
  sockets[0]?.deliver({ type: 'emit', event: 'api-session/added', args: [] })
  await parsed()
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

it('spreads its reconnection delays and caps them', () => {
  // A fleet whose hosts all drop together must not come back in lockstep, and a
  // long outage must keep retrying rather than doubling into hours.
  const first = Array.from({ length: 200 }, () => retryDelay(0))
  expect(Math.min(...first)).toBeGreaterThanOrEqual(400)
  expect(Math.max(...first)).toBeLessThanOrEqual(600)
  // Jitter: the same attempt must not always produce the same delay.
  expect(new Set(first).size).toBeGreaterThan(1)
  // Growth: each attempt waits about twice as long as the one before it.
  expect(Math.min(...Array.from({ length: 200 }, () => retryDelay(3)))).toBeGreaterThan(Math.max(...first))
  // Ceiling: however long the outage runs, the wait stops growing.
  for (const attempt of [8, 12, 20, 60]) {
    expect([attempt, retryDelay(attempt) <= 36_000]).toEqual([attempt, true])
  }
})

it('sends nothing on a socket that opens after the subscription was disposed', () => {
  const { carrier, sockets } = fakeCarrier()
  const seen = recorder()
  const dispose = subscribeRoster(carrier, seen.sinks)
  dispose()
  // The socket lost its race with disposal. Opening the stream now would claim
  // a stream id on a host nothing is listening to, and leave it open.
  sockets[0]?.open()
  expect(sockets[0]?.sent.filter((frame) => JSON.parse(frame).type === 'open')).toEqual([])
  expect(seen.ready).toBe(0)
})

it('starts the backoff again once a connection has been established', async () => {
  const { carrier, sockets } = fakeCarrier()
  const seen = recorder()
  const dispose = subscribeRoster(carrier, seen.sinks)
  // Two failures in a row, so the next wait is the third rung of the backoff.
  sockets[0]?.open()
  sockets[0]?.drop()
  await tick(800)
  sockets.at(-1)?.open()
  sockets.at(-1)?.drop()
  await tick(1_400)
  const established = sockets.length
  // This one reaches the host. A subsequent drop is a fresh outage, so it must
  // wait the first rung again rather than the third: without the reset the next
  // socket would be about two seconds away, and this would still be waiting.
  sockets.at(-1)?.open()
  sockets.at(-1)?.deliver({ type: 'ready', clientId: 'c', host: 'h' })
  await parsed()
  expect(seen.ready).toBe(1)
  sockets.at(-1)?.drop()
  await tick(900)
  expect(sockets.length).toBeGreaterThan(established)
  dispose()
})

it('is already shut when it says why it ended, so a subscriber cannot re-enter it', () => {
  const { carrier, sockets } = fakeCarrier()
  const seen = recorder()
  let reported = 0
  const dispose = subscribeRoster(carrier, {
    ...seen.sinks,
    onLost: (reason: string) => {
      reported += 1
      // Being told the host is gone is exactly when a surface tears down what
      // it had, and a teardown can touch the socket. Reporting before latching
      // would let that come straight back in here and report the same loss
      // again, so the host would read as lost twice from one drop.
      sockets[0]?.dispatchEvent(new Event('error'))
      seen.sinks.onLost(reason)
    },
  })
  sockets[0]?.open()
  sockets[0]?.deliver({ type: 'ready', clientId: 'c', host: 'h' })
  sockets[0]?.drop()
  expect(reported).toBe(1)
  dispose()
})
