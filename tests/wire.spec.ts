/**
 * The wire predicates every consumer reads a host answer through.
 *
 * A value fresh off the wire is nothing this product has narrowed yet, so the
 * predicates are the only place a field read is safe. What they admit and what
 * they refuse is therefore a contract of its own: a predicate that admitted a
 * list, a string, or a row missing a field would put the refusal one step
 * further out, where it reads as a different defect.
 */

import { describe, expect, it } from 'bun:test'
import { isSessionSummary, isWireObject } from '../apps/deeptail/src/wire.ts'

describe('whether a value names a serialised object', () => {
  it('admits an object, by whatever name it arrived', () => {
    expect(isWireObject({})).toBe(true)
    expect(isWireObject({ sessionId: 's-1' })).toBe(true)
  })

  it('refuses an array, which indexes by position rather than by field', () => {
    expect(isWireObject([])).toBe(false)
    expect(isWireObject(['s-1'])).toBe(false)
  })

  it('refuses null, which typeof calls an object', () => {
    expect(isWireObject(null)).toBe(false)
  })

  it('refuses every scalar the wire carries, including an absent value', () => {
    const scalars: readonly WireValue[] = ['s-1', 12, true, undefined]
    expect(scalars.map((value) => isWireObject(value))).toEqual(scalars.map(() => false))
  })
})

describe('whether a value is a row the roster can hold', () => {
  /** One row carrying every field the predicate reads. */
  const full: Record<string, string | number | boolean> = {
    sessionId: 's-1',
    updatedAt: 12,
    running: true,
    blank: false,
  }

  it('admits a row carrying every field, and keeps the fields it does not read', () => {
    expect(isSessionSummary({ ...full, cwd: '/srv/work' })).toBe(true)
  })

  it('refuses a row missing any one of the fields it reads', () => {
    const missing: Record<string, string | number | boolean>[] = []
    for (const field of ['sessionId', 'updatedAt', 'running', 'blank']) {
      const row = { ...full }
      delete row[field]
      missing.push(row)
    }
    expect(missing.map((row) => isSessionSummary(row))).toEqual(missing.map(() => false))
  })

  it('refuses a row whose fields hold the wrong types', () => {
    expect(isSessionSummary({ ...full, sessionId: 7 })).toBe(false)
    expect(isSessionSummary({ ...full, updatedAt: '12' })).toBe(false)
    expect(isSessionSummary({ ...full, running: 'yes' })).toBe(false)
    expect(isSessionSummary({ ...full, blank: null })).toBe(false)
  })

  it('refuses everything that is not an object at all, including an absent value', () => {
    const notRows: readonly WireValue[] = [null, 's-1', [full], undefined]
    expect(notRows.map((value) => isSessionSummary(value))).toEqual(notRows.map(() => false))
  })
})
