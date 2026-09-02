/**
 * The fleet store's read and event bookkeeping.
 *
 * Two rules carry the roster's correctness and neither is visible from the DOM:
 * only the newest read for a host may publish, and an event that arrives while
 * a read is in flight describes a world newer than that read, so it is held and
 * replayed rather than overwritten. Both are exercised here against the store
 * directly, because a browser suite can only observe what survived them.
 */

import { expect, it } from 'bun:test'
import type { HostApi, SessionSummary } from '../apps/deeptail/src/api.ts'
import type { HostRecord } from '../apps/deeptail/src/host.ts'
import { createFleetStore, type FleetStore } from '../apps/deeptail/src/store.ts'

const HOSTS: readonly HostRecord[] = [{ id: 'dev-1', label: 'Workstation', origin: 'https://harness.local:3080' }]

/**
 * One session summary.
 * @param sessionId - the session's identity.
 * @param updatedAt - its last activity.
 * @returns the summary.
 */
function session(sessionId: string, updatedAt = 1): SessionSummary {
  return { sessionId, updatedAt, running: false, blank: false }
}

/** A roster read whose outcome the test decides, after the test decides. */
interface Deferred {
  readonly api: HostApi
  settle: (sessions: readonly SessionSummary[]) => void
  fail: (reason: Error) => void
}

/**
 * A host whose `session.list` does not answer until the test says so.
 * @returns the api, and the controls that settle it.
 */
function deferredHost(): Deferred {
  const pending = Promise.withResolvers<readonly SessionSummary[]>()
  const api = {
    listSessions: () => pending.promise,
    prompt: () => Promise.resolve(),
    cancel: () => Promise.resolve(),
    createSession: () => Promise.resolve('s-new'),
  } satisfies HostApi
  return { api, settle: pending.resolve, fail: pending.reject }
}

/**
 * The sessions a store holds for the one host under test.
 * @param store - the store to read.
 * @returns the session ids, in display order.
 */
function rows(store: FleetStore): string[] {
  return (store.getState().entries[0]?.sessions ?? []).map((row) => row.sessionId)
}

it('holds an event that arrives mid-read and replays it once the read lands', async () => {
  const host = deferredHost()
  const store = createFleetStore(HOSTS, { apiFor: () => host.api })
  const read = store.refresh('dev-1')
  store.applyEvent('dev-1', 'api-session/added', [session('s-live', 2)])
  // The read's snapshot predates the event, so applying it first would let the
  // older snapshot overwrite the newer row.
  expect(rows(store)).toEqual([])
  host.settle([session('s-old', 1)])
  await read
  expect(rows(store)).toEqual(['s-live', 's-old'])
})

it('replays a held event even when the read it waited on failed', async () => {
  const host = deferredHost()
  const store = createFleetStore(HOSTS, { apiFor: () => host.api })
  const read = store.refresh('dev-1')
  store.applyEvent('dev-1', 'api-session/added', [session('s-live', 2)])
  host.fail(new Error('roster unavailable'))
  await read
  // The rows stay as they were, and the event is newer than those rows.
  expect(rows(store)).toEqual(['s-live'])
  expect(store.getState().entries[0]?.phase.kind).toBe('failed')
})

it('lets only the newest read publish', async () => {
  const first = deferredHost()
  const second = deferredHost()
  let next = first
  const store = createFleetStore(HOSTS, { apiFor: () => next.api })
  const stale = store.refresh('dev-1')
  next = second
  const fresh = store.refresh('dev-1')
  second.settle([session('s-new', 2)])
  await fresh
  first.settle([session('s-stale', 1)])
  await stale
  expect(rows(store)).toEqual(['s-new'])
})

it('does not let a failed stale read tear down the newest read’s buffer', async () => {
  const first = deferredHost()
  const second = deferredHost()
  let next = first
  const store = createFleetStore(HOSTS, { apiFor: () => next.api })
  const stale = store.refresh('dev-1')
  next = second
  const fresh = store.refresh('dev-1')
  // The event belongs to the read still in flight, so the stale read settling
  // must not consume the buffer holding it.
  store.applyEvent('dev-1', 'api-session/added', [session('s-live', 3)])
  first.fail(new Error('stale read failed'))
  await stale
  second.settle([session('s-old', 1)])
  await fresh
  expect(rows(store)).toEqual(['s-live', 's-old'])
})

it('removes a row on a forwarded removal and reports the running flag', async () => {
  const host = deferredHost()
  const store = createFleetStore(HOSTS, { apiFor: () => host.api })
  const read = store.refresh('dev-1')
  host.settle([session('s-a', 2), session('s-b', 1)])
  await read
  store.applyEvent('dev-1', 'api-session/removed', ['s-b'])
  expect(rows(store)).toEqual(['s-a'])
  store.applyEvent('dev-1', 'api-session/status', ['s-a', true])
  expect(store.getState().entries[0]?.sessions[0]?.running).toBe(true)
})

it('notifies the subscribers it had, not the ones a notification adds', () => {
  const host = deferredHost()
  const store = createFleetStore(HOSTS, { apiFor: () => host.api })
  // Re-subscribing from inside a notification is what a surface that rebuilds
  // on every change does. Iterating the live set would hand the same round to
  // each listener the round itself adds, so a surface that resubscribes every
  // time is never finished being told about one change. The ceiling is only so
  // that a store which does that ends the test rather than the process.
  let calls = 0
  const holder = { drop: (): void => {} }
  const rebuild = (): void => {
    holder.drop = store.subscribe(() => {
      calls += 1
      holder.drop()
      if (calls < 20) rebuild()
    })
  }
  rebuild()
  store.setHostState('dev-1', 'online')
  expect(calls).toBe(1)
})

it('ignores a change addressed to a host it does not hold', () => {
  const host = deferredHost()
  const store = createFleetStore(HOSTS, { apiFor: () => host.api })
  let told = 0
  store.subscribe(() => {
    told += 1
  })
  // Events arrive on a mux that outlives an unpairing, so a row that is gone
  // must be a no-op rather than a row conjured back with no host on it.
  store.setHostState('gone-9', 'online')
  store.applyEvent('gone-9', 'api-session/added', [session('s-1')])
  expect(store.getState().entries.map((entry) => entry.host.id)).toEqual(['dev-1'])
  expect(told).toBe(0)
})

it('re-reads the roster when an event cannot be applied honestly', async () => {
  let reads = 0
  const answers: SessionSummary[][] = [[session('s-1')], [session('s-1'), session('s-2', 5)]]
  const api = {
    listSessions: () => {
      const answer = answers[Math.min(reads, answers.length - 1)] ?? []
      reads += 1
      return Promise.resolve(answer)
    },
    prompt: () => Promise.resolve(),
    cancel: () => Promise.resolve(),
    createSession: () => Promise.resolve('s-new'),
  } satisfies HostApi
  const store = createFleetStore(HOSTS, { apiFor: () => api })
  await store.refresh('dev-1')
  expect([reads, rows(store)]).toEqual([1, ['s-1']])
  // A status for an id the roster does not hold cannot be applied — the host
  // emits an agent id at one of its emit sites — so the rows are read again
  // rather than guessed at.
  store.applyEvent('dev-1', 'api-session/status', ['agent-7', true])
  await Promise.resolve()
  await Promise.resolve()
  expect(reads).toBe(2)
  expect(rows(store)).toEqual(['s-2', 's-1'])
})
