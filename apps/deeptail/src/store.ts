/**
 * Fleet state: what DeepTail knows about every paired host at once.
 *
 * Framework-free. Consumers subscribe and re-render; the store never touches
 * the DOM. What a roster event means is `./roster.ts`; this module owns the
 * tables every host's row lives in, and the bookkeeping that decides which
 * answer is allowed to publish.
 *
 * @module
 */

import { type HostApi, RemoteError, type SessionSummary, UNAUTHORIZED } from './api.ts'
import type { HostRecord } from './host.ts'
import { messageOf } from './reason.ts'
import { type HeldEvent, readRosterEvent, sortByActivity } from './roster.ts'
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

/** The tables one fleet store keeps. */
interface FleetTables {
  /** Every host's row, keyed by host id. */
  readonly entries: Map<string, HostEntry>
  /** Everyone to tell once a row has changed. */
  readonly listeners: Set<() => void>
  /** The newest read per host; an earlier, slower one may not publish. */
  readonly generations: Map<string, number>
  /** Events held per host for as long as that host's read is in flight. */
  readonly buffered: Map<string, HeldEvent[]>
}

/**
 * Create the fleet store.
 * @param hosts - every paired host.
 * @param ports - how to reach each one.
 * @returns the store.
 */
export function createFleetStore(hosts: readonly HostRecord[], ports: FleetPorts): FleetStore {
  const tables: FleetTables = {
    entries: new Map<string, HostEntry>(
      hosts.map((host) => [host.id, { host, phase: { kind: 'pending' }, state: 'unknown', sessions: [] }]),
    ),
    listeners: new Set<() => void>(),
    generations: new Map<string, number>(),
    buffered: new Map<string, HeldEvent[]>(),
  }

  const store: FleetStore = {
    getState() {
      return { entries: [...tables.entries.values()] }
    },
    subscribe(listener) {
      tables.listeners.add(listener)
      return () => {
        tables.listeners.delete(listener)
      }
    },
    refresh(hostId) {
      return readRoster(tables, ports, hostId, (held) => {
        store.applyEvent(hostId, held.event, held.args)
      })
    },
    applyEvent(hostId, event, args) {
      applyRosterEvent(tables, hostId, { event, args }, () => {
        void store.refresh(hostId)
      })
    },
    setHostState(hostId, state) {
      patchEntry(tables, hostId, { state })
    },
  }
  return store
}

/**
 * Tell every subscriber that the fleet changed.
 * @param listeners - the store's subscribers.
 * @returns nothing.
 */
function publish(listeners: ReadonlySet<() => void>): void {
  for (const listener of new Set(listeners)) listener()
}

/**
 * Merge a change into one host's row and announce it.
 * @param tables - the store's tables.
 * @param hostId - the host whose row changes.
 * @param next - the fields to overwrite.
 * @returns nothing.
 */
function patchEntry(tables: FleetTables, hostId: string, next: Partial<HostEntry>): void {
  const current = tables.entries.get(hostId)
  if (current === undefined) return
  tables.entries.set(hostId, { ...current, ...next })
  publish(tables.listeners)
}

/**
 * Read one host's roster and publish it.
 *
 * The read claims a generation before it starts and abandons its result if a
 * later read has claimed one since, so a slow answer can never overwrite a
 * fresher one. Events forwarded while it is in flight describe a world newer
 * than the read does, so applying them first would let the read's older
 * snapshot overwrite them: they are held and replayed once it lands.
 *
 * @param tables - the store's tables.
 * @param ports - how to reach the host.
 * @param hostId - the host to read.
 * @param replay - how to apply one event that was held during the read.
 * @returns nothing, once the read has settled.
 */
async function readRoster(
  tables: FleetTables,
  ports: FleetPorts,
  hostId: string,
  replay: (held: HeldEvent) => void,
): Promise<void> {
  const entry = tables.entries.get(hostId)
  if (entry === undefined) return
  const generation = (tables.generations.get(hostId) ?? 0) + 1
  tables.generations.set(hostId, generation)
  patchEntry(tables, hostId, { phase: { kind: 'pending' } })
  tables.buffered.set(hostId, [])
  try {
    const sessions = await ports.apiFor(entry.host).listSessions()
    if (tables.generations.get(hostId) !== generation) return
    const held = tables.buffered.get(hostId) ?? []
    tables.buffered.delete(hostId)
    patchEntry(tables, hostId, { phase: { kind: 'ready' }, sessions: sortByActivity(sessions) })
    for (const event of held) replay(event)
  } catch (reason) {
    if (tables.generations.get(hostId) !== generation) return
    const held = tables.buffered.get(hostId) ?? []
    tables.buffered.delete(hostId)
    patchEntry(tables, hostId, failedRead(reason))
    // The read failed, so the rows stay as they were; the events that arrived
    // while it ran are newer than those rows and still apply to them.
    for (const event of held) replay(event)
  }
}

/**
 * How a failed roster read is recorded.
 *
 * A revoked token and an unreachable host look alike in a roster read, but only
 * one of them has a way out, so they are recorded apart.
 *
 * @param reason - whatever the read rejected with.
 * @returns the phase and reachability to write to the host's row.
 */
function failedRead(reason: unknown): Partial<HostEntry> {
  const message = messageOf(reason)
  const unauthorized = reason instanceof RemoteError && reason.code === UNAUTHORIZED
  return { phase: { kind: 'failed', message }, state: unauthorized ? 'unauthorized' : 'offline' }
}

/**
 * Apply one forwarded roster event to a host's row.
 * @param tables - the store's tables.
 * @param hostId - the host that forwarded it.
 * @param held - the event and its arguments.
 * @param reread - how to re-read the roster when the event cannot be applied.
 * @returns nothing.
 */
function applyRosterEvent(tables: FleetTables, hostId: string, held: HeldEvent, reread: () => void): void {
  const entry = tables.entries.get(hostId)
  if (entry === undefined) return
  const holding = tables.buffered.get(hostId)
  if (holding !== undefined) {
    holding.push(held)
    return
  }
  const update = readRosterEvent(entry.sessions, held)
  if (update.kind === 'sessions') patchEntry(tables, hostId, { sessions: update.sessions })
  if (update.kind === 'reread') reread()
}
