/**
 * Fleet state: what DeepTail knows about every paired host at once.
 *
 * Framework-free. Consumers subscribe and re-render; the store never touches
 * the DOM.
 *
 * @module
 */

import type { HostApi, SessionSummary } from './api.ts'
import type { HostRecord } from './host.ts'
import type { HostState, Phase } from './ui/states.ts'

/** Everything known about one host. */
export interface HostEntry {
  readonly host: HostRecord
  readonly phase: Phase
  readonly state: HostState
  readonly sessions: readonly SessionSummary[]
}

/** The whole fleet. */
export interface FleetState {
  readonly entries: readonly HostEntry[]
}

/** What the store needs from the outside world. */
export interface FleetPorts {
  /** The Remote surface for one host. */
  apiFor(host: HostRecord): HostApi
}

/** A live fleet, with the actions that mutate it. */
export interface FleetStore {
  getState(): FleetState
  subscribe(listener: () => void): () => void
  /** Read one host's roster. Safe to call repeatedly; the newest read wins. */
  refresh(hostId: string): Promise<void>
  /** Apply one forwarded roster event from a host. */
  applyEvent(hostId: string, event: string, args: readonly unknown[]): void
  /** Record a host's reachability, as reported by the connection attempt. */
  setHostState(hostId: string, state: HostState): void
}

/**
 * Create the fleet store.
 * @param hosts - every paired host.
 * @param ports - how to reach each one.
 * @returns the store.
 */
export function createFleetStore(hosts: readonly HostRecord[], ports: FleetPorts): FleetStore {
  const entries = new Map<string, HostEntry>(
    hosts.map((host) => [host.id, { host, phase: { kind: 'pending' }, state: 'unknown', sessions: [] }]),
  )
  const listeners = new Set<() => void>()
  // Only the newest read for a host may publish: an earlier, slower one would
  // otherwise overwrite it with stale rows.
  const generations = new Map<string, number>()

  const publish = (): void => {
    for (const listener of new Set(listeners)) listener()
  }

  const patch = (hostId: string, next: Partial<HostEntry>): void => {
    const current = entries.get(hostId)
    if (current === undefined) return
    entries.set(hostId, { ...current, ...next })
    publish()
  }

  const store: FleetStore = {
    getState() {
      return { entries: [...entries.values()] }
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    async refresh(hostId) {
      const entry = entries.get(hostId)
      if (entry === undefined) return
      const generation = (generations.get(hostId) ?? 0) + 1
      generations.set(hostId, generation)
      patch(hostId, { phase: { kind: 'pending' } })
      try {
        const sessions = await ports.apiFor(entry.host).listSessions()
        if (generations.get(hostId) !== generation) return
        patch(hostId, { phase: { kind: 'ready' }, sessions: sortByActivity(sessions) })
      } catch (reason) {
        if (generations.get(hostId) !== generation) return
        const message = reason instanceof Error ? reason.message : String(reason)
        patch(hostId, { phase: { kind: 'failed', message } })
      }
    },
    applyEvent(hostId, event, args) {
      const entry = entries.get(hostId)
      if (entry === undefined) return
      switch (event) {
        case 'api-session/added': {
          const added = args[0]
          if (!isSummary(added)) return
          patch(hostId, {
            sessions: sortByActivity([...entry.sessions.filter((s) => s.sessionId !== added.sessionId), added]),
          })
          return
        }
        case 'api-session/removed': {
          const removed = args[0]
          if (typeof removed !== 'string') return
          patch(hostId, { sessions: entry.sessions.filter((session) => session.sessionId !== removed) })
          return
        }
        case 'api-session/activity': {
          const [sessionId, time] = args
          if (typeof sessionId !== 'string' || typeof time !== 'number') return
          patch(hostId, {
            sessions: sortByActivity(
              entry.sessions.map((session) =>
                session.sessionId === sessionId ? { ...session, updatedAt: time } : session,
              ),
            ),
          })
          return
        }
        case 'api-session/status':
        case 'api-session/error':
          // These two are keyed by AGENT id, not session id, and a summary
          // carries no agent id — so the row cannot be identified from the
          // payload. Re-reading the host's list is the only correct response;
          // it is unary, cheap, and activates no agent.
          void store.refresh(hostId)
          return
        default:
          return
      }
    },
    setHostState(hostId, state) {
      patch(hostId, { state })
    },
  }
  return store
}

/** Newest activity first, which is the order every roster in this product uses. */
function sortByActivity(sessions: readonly SessionSummary[]): readonly SessionSummary[] {
  return sessions.toSorted((left, right) => right.updatedAt - left.updatedAt)
}

/** Whether a forwarded payload is a session summary we can place in the roster. */
function isSummary(value: unknown): value is SessionSummary {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record.sessionId === 'string' && typeof record.updatedAt === 'number'
}
