/**
 * One host's roster, and how a forwarded event changes it.
 *
 * Every arm here is a pure reading of an event against the rows currently held:
 * it answers with the rows to publish, with a re-read when the event cannot be
 * applied honestly, or with nothing at all when the payload is not what the
 * event claims. Deciding is kept apart from mutating, so the fleet store that
 * holds those rows stays a matter of bookkeeping.
 *
 * @module
 */

import type { SessionSummary } from './api.ts'
import { isSessionSummary, type WireValue } from './wire.ts'

/** One forwarded roster event, as the host named it. */
export interface HeldEvent {
  readonly event: string
  readonly args: readonly WireValue[]
}

/** What one roster event asks the store to do with a host's rows. */
type RosterUpdate =
  | { readonly kind: 'ignore' }
  | { readonly kind: 'sessions'; readonly sessions: readonly SessionSummary[] }
  | { readonly kind: 'reread' }

/** An event carrying nothing the roster can act on. */
const IGNORE: RosterUpdate = { kind: 'ignore' }

/**
 * Newest activity first, which is the order every roster in this product uses.
 * @param sessions - the rows to order.
 * @returns the same rows, most recently active first.
 */
export function sortByActivity(sessions: readonly SessionSummary[]): readonly SessionSummary[] {
  return sessions.toSorted((left, right) => right.updatedAt - left.updatedAt)
}

/**
 * Decide what one forwarded event does to a host's rows.
 * @param sessions - the rows currently held for that host.
 * @param held - the event and its arguments.
 * @returns the rows to publish, a re-read, or nothing.
 */
export function readRosterEvent(sessions: readonly SessionSummary[], held: HeldEvent): RosterUpdate {
  switch (held.event) {
    case 'api-session/added':
      return withAdded(sessions, held.args)
    case 'api-session/removed':
      return withRemoved(sessions, held.args)
    case 'api-session/activity':
      return withActivity(sessions, held.args)
    case 'api-session/status':
      return withStatus(sessions, held.args)
    case 'api-session/error':
      // The payload is (id, message), carrying the same id ambiguity the status
      // event does, and no field on a summary records an error, so the roster
      // is re-read rather than guessed at.
      return { kind: 'reread' }
    default:
      return IGNORE
  }
}

/**
 * Place a newly announced session among a host's rows.
 * @param sessions - the rows currently held.
 * @param args - the payload, whose first member is the summary.
 * @returns the rows to publish, or nothing when the payload is not a summary.
 */
function withAdded(sessions: readonly SessionSummary[], args: readonly WireValue[]): RosterUpdate {
  const added = args[0]
  if (!isSessionSummary(added)) return IGNORE
  return {
    kind: 'sessions',
    sessions: sortByActivity([...sessions.filter((s) => s.sessionId !== added.sessionId), added]),
  }
}

/**
 * Drop a session the host says is gone.
 * @param sessions - the rows currently held.
 * @param args - the payload, whose first member is the session id.
 * @returns the rows to publish, or nothing when the payload names no session.
 */
function withRemoved(sessions: readonly SessionSummary[], args: readonly WireValue[]): RosterUpdate {
  const removed = args[0]
  if (typeof removed !== 'string') return IGNORE
  return { kind: 'sessions', sessions: sessions.filter((session) => session.sessionId !== removed) }
}

/**
 * Record a session's newest activity, which is also what orders the roster.
 * @param sessions - the rows currently held.
 * @param args - the payload: a session id and a timestamp.
 * @returns the rows to publish, or nothing when the payload is malformed.
 */
function withActivity(sessions: readonly SessionSummary[], args: readonly WireValue[]): RosterUpdate {
  const [sessionId, time] = args
  if (typeof sessionId !== 'string' || typeof time !== 'number') return IGNORE
  return {
    kind: 'sessions',
    sessions: sortByActivity(
      sessions.map((session) => (session.sessionId === sessionId ? { ...session, updatedAt: time } : session)),
    ),
  }
}

/**
 * Record whether a session is running.
 *
 * Upstream declares this as (sessionId, running) and its own client reads it
 * that way, but the Host emits an AGENT id at one of the two emit sites, and a
 * summary carries no agent id. So the flag is applied directly when the id
 * names a row we hold, and only the unrecognised case pays for a re-read.
 * Answering every status event with a list read would put the whole fleet on a
 * refresh treadmill.
 *
 * @param sessions - the rows currently held.
 * @param args - the payload: an id and the running flag.
 * @returns the rows to publish, a re-read when the id names no row we hold, or
 *   nothing when the payload is malformed.
 */
function withStatus(sessions: readonly SessionSummary[], args: readonly WireValue[]): RosterUpdate {
  const [id, running] = args
  if (typeof id !== 'string' || typeof running !== 'boolean') return IGNORE
  if (!sessions.some((session) => session.sessionId === id)) return { kind: 'reread' }
  return {
    kind: 'sessions',
    sessions: sessions.map((session) => (session.sessionId === id ? { ...session, running } : session)),
  }
}
