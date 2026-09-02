/**
 * How one forwarded event changes a host's rows.
 *
 * This is the whole of the roster's reasoning, kept apart from the store that
 * holds the rows so it can be read against every payload a host actually sends
 * — including the malformed ones, which a live host is exactly as free to send
 * as the well-formed ones.
 */

import { describe, expect, it } from 'bun:test'
import type { SessionSummary } from '../apps/deeptail/src/api.ts'
import { readRosterEvent, sortByActivity } from '../apps/deeptail/src/roster.ts'

/**
 * One row.
 * @param sessionId - the row's id.
 * @param updatedAt - its activity stamp.
 * @param running - whether an agent is live on it.
 * @returns the summary.
 */
function row(sessionId: string, updatedAt: number, running = false): SessionSummary {
  return { sessionId, updatedAt, running, blank: false } as SessionSummary
}

/** Two rows, newest first, as the store holds them. */
const HELD = [row('b', 20), row('a', 10)]

/**
 * The ids a reading publishes, or what it asked for instead.
 * @param sessions - the rows currently held.
 * @param event - the event name.
 * @param args - its arguments.
 * @returns the published ids, or the update's kind.
 */
function reading(sessions: readonly SessionSummary[], event: string, args: readonly unknown[]): string[] | string {
  const update = readRosterEvent(sessions, { event, args })
  return update.kind === 'sessions' ? update.sessions.map((session) => session.sessionId) : update.kind
}

describe('a session the host announces', () => {
  it('is placed by its activity rather than appended', () => {
    expect(reading(HELD, 'api-session/added', [row('c', 15)])).toEqual(['b', 'c', 'a'])
  })

  it('replaces the row it already has rather than doubling it', () => {
    // Hosts re-announce; without the replacement the roster grows a duplicate
    // id, which breaks the row keyed on it and every ARIA reference to it.
    expect(reading(HELD, 'api-session/added', [row('a', 30)])).toEqual(['a', 'b'])
  })

  it('is ignored when the payload is not a summary', () => {
    for (const payload of [undefined, null, 'a', 42, {}, { sessionId: 'x' }, { updatedAt: 1 }]) {
      expect(reading(HELD, 'api-session/added', [payload])).toBe('ignore')
    }
  })
})

describe('a session the host retires', () => {
  it('is dropped, leaving the rest in order', () => {
    expect(reading(HELD, 'api-session/removed', ['b'])).toEqual(['a'])
  })

  it('is ignored when the payload names no session', () => {
    expect(reading(HELD, 'api-session/removed', [{ sessionId: 'b' }])).toBe('ignore')
  })
})

describe('activity on a session', () => {
  it('restamps the row and moves it to the front', () => {
    expect(reading(HELD, 'api-session/activity', ['a', 99])).toEqual(['a', 'b'])
  })

  it('is ignored when either half of the payload is missing', () => {
    expect(reading(HELD, 'api-session/activity', ['a'])).toBe('ignore')
    expect(reading(HELD, 'api-session/activity', [42, 99])).toBe('ignore')
    expect(reading(HELD, 'api-session/activity', ['a', '99'])).toBe('ignore')
  })
})

describe('a change of running status', () => {
  it('is applied in place when the id names a row we hold', () => {
    const update = readRosterEvent(HELD, { event: 'api-session/status', args: ['a', true] })
    expect(update.kind === 'sessions' && update.sessions.map((s) => [s.sessionId, s.running])).toEqual([
      ['b', false],
      ['a', true],
    ])
  })

  it('asks for a re-read when the id names no row we hold', () => {
    // The host emits an agent id at one of its two emit sites, and a summary
    // carries no agent id. Guessing would mark the wrong session running.
    expect(reading(HELD, 'api-session/status', ['agent-7', true])).toBe('reread')
  })

  it('is ignored when the payload is malformed', () => {
    expect(reading(HELD, 'api-session/status', ['a', 'yes'])).toBe('ignore')
    expect(reading(HELD, 'api-session/status', [true, true])).toBe('ignore')
  })
})

describe('anything else the host forwards', () => {
  it('asks for a re-read when a session reports an error, which no row records', () => {
    expect(reading(HELD, 'api-session/error', ['a', 'boom'])).toBe('reread')
  })

  it('is ignored', () => {
    for (const event of ['api-session/unknown', 'agent/step', '', 'api-session/addedx']) {
      expect([event, reading(HELD, event, [row('c', 1)])]).toEqual([event, 'ignore'])
    }
  })
})

describe('the roster order', () => {
  it('is newest activity first, and leaves the rows it was given alone', () => {
    const given = [row('a', 1), row('c', 3), row('b', 2)]
    expect(sortByActivity(given).map((session) => session.sessionId)).toEqual(['c', 'b', 'a'])
    expect(given.map((session) => session.sessionId)).toEqual(['a', 'c', 'b'])
  })
})
