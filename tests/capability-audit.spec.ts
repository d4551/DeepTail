/**
 * The denial audit: what the page refused, kept long enough to explain.
 *
 * A refusal that leaves no trace is indistinguishable from a control that was
 * never there, so every denial the dispatcher renders is recorded with the
 * trace identity the copy on screen names. The record is bounded and in
 * memory: these cases are that contract — the ordering, the bound, the
 * followers, and the snapshot a follower is handed rather than the live set.
 */

import { describe, expect, it } from 'bun:test'
import { createDenialAudit, newTraceId } from '../apps/deeptail/src/capabilities/audit.ts'
import type { DenialReason } from '../apps/deeptail/src/capabilities/grants.ts'

/** How many refusals the record keeps, read as the contract states it. */
const CAPACITY = 64

/**
 * One refusal, with the fields a record carries.
 * @param at - the instant of the refusal, which orders the record.
 * @returns the event.
 */
function denial(at: number) {
  const reason: DenialReason = 'no-grant'
  return {
    traceId: newTraceId(),
    action: 'session.cancel',
    capability: 'session.cancel',
    subject: 'host-a',
    reason,
    revision: 1,
    at,
  }
}

describe('the denial audit', () => {
  it('records a refusal and reads it back oldest first', () => {
    const audit = createDenialAudit()
    audit.record(denial(2))
    audit.record(denial(1))
    expect(audit.recent().map((event) => event.at)).toEqual([2, 1])
  })

  it('hands back a copy, so what a reader holds cannot move the record', () => {
    const audit = createDenialAudit()
    audit.record(denial(1))
    const held = audit.recent()
    audit.record(denial(2))
    expect(held.length).toBe(1)
    expect(audit.recent().length).toBe(2)
  })

  it('keeps only the newest refusals the capacity holds', () => {
    const audit = createDenialAudit()
    for (let at = 0; at < CAPACITY + 1; at += 1) audit.record(denial(at))
    const held = audit.recent()
    expect(held.length).toBe(CAPACITY)
    expect(held[0]?.at).toBe(1)
    expect(held[CAPACITY - 1]?.at).toBe(CAPACITY)
  })

  it('tells a follower each refusal as it lands', () => {
    const audit = createDenialAudit()
    const seen: number[] = []
    audit.subscribe((event) => seen.push(event.at))
    audit.record(denial(1))
    audit.record(denial(2))
    expect(seen).toEqual([1, 2])
  })

  it('stops telling a follower that walked away', () => {
    const audit = createDenialAudit()
    const seen: number[] = []
    const unsubscribe = audit.subscribe((event) => seen.push(event.at))
    audit.record(denial(1))
    unsubscribe()
    audit.record(denial(2))
    expect(seen).toEqual([1])
  })
})

describe('the denial audit subscription', () => {
  it('hands a follower a snapshot, so unsubscribing mid-delivery is safe', () => {
    // A listener that unsubscribes as it is called would otherwise mutate the
    // collection being walked: the record walks a copy, so the listener that
    // leaves during its own delivery is called once and never again.
    const audit = createDenialAudit()
    const seen: number[] = []
    const unsubscribe = audit.subscribe((event) => {
      seen.push(event.at)
      unsubscribe()
    })
    audit.record(denial(1))
    audit.record(denial(2))
    expect(seen).toEqual([1])
  })

  it('mints a trace id a refusal can be quoted back by', () => {
    const first = newTraceId()
    const second = newTraceId()
    expect(first).not.toBe(second)
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u)
  })
})
