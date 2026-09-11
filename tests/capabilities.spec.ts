/**
 * The denial audit and the grant ledger's hydration, read as their own faces.
 *
 * The dispatcher spends from these, and its own refusals are held in
 * `dispatcher.spec.ts`. This is the record and the ledger themselves: what the
 * audit keeps and tells, and what the ledger refuses at the moment a snapshot
 * is read field by field.
 */

import { describe, expect, it } from 'bun:test'
import { createDenialAudit, type DenialAudit } from '../apps/deeptail/src/capabilities/audit.ts'
import { createGrantLedger } from '../apps/deeptail/src/capabilities/grants.ts'
import { deviceGrant, hostGrant, snapshot } from './grant-fixture.ts'

/** One refusal to record, named by the action it refused. */
function refusal(action: string): Parameters<DenialAudit['record']>[0] {
  return {
    traceId: `trace-${action}`,
    action,
    capability: 'shell.navigate',
    subject: 'device',
    reason: 'no-grant',
    revision: undefined,
    at: 1_000_000,
  }
}

describe('the denial audit record', () => {
  it('keeps the newest sixty-four refusals, oldest first, and drops the oldest', () => {
    const audit = createDenialAudit()
    for (let index = 0; index < 65; index += 1) audit.record(refusal(`action-${String(index)}`))
    const kept = audit.recent()
    expect(kept.length).toBe(64)
    expect(kept[0]?.action).toBe('action-1')
    expect(kept[63]?.action).toBe('action-64')
  })

  it('does not call a subscriber again after it unsubscribes, however it unsubscribes', () => {
    const audit = createDenialAudit()
    const seen: string[] = []
    // One listener unsubscribes as it is called, one between records: the walk
    // is over a snapshot, so each later refusal sees who is gone.
    const stopSelf: ReturnType<DenialAudit['subscribe']> = audit.subscribe((event) => {
      seen.push(`self:${event.action}`)
      stopSelf()
    })
    const stopOther = audit.subscribe((event) => seen.push(`other:${event.action}`))
    audit.record(refusal('first'))
    stopOther()
    audit.record(refusal('second'))
    expect(seen).toEqual(['self:first', 'other:first'])
  })
})

describe('a snapshot the ledger reads field by field', () => {
  it('refuses what it cannot read, and an identity no grant of the capability names', () => {
    const ledger = createGrantLedger(() => 1_000_000)
    const valid = snapshot([deviceGrant('host.read')])
    ledger.hydrate(valid)
    const emptied = ledger.hydrate({ ...valid, context: '' })
    expect([emptied.reason, ledger.live(), ledger.context()]).toEqual(['malformed-hydration', 0, 'ctx-1'])
    ledger.hydrate(valid)
    const unnamed = ledger.hydrate({ issuer: 'native', revision: 1, grants: [] })
    expect([unnamed.reason, ledger.live()]).toEqual(['malformed-hydration', 0])
    ledger.hydrate(snapshot([deviceGrant('host.read'), hostGrant('session.read', 'host-a')]))
    const asHost = ledger.spend('host.read', { kind: 'host', hostId: 'host-a' })
    const asDevice = ledger.spend('session.read', { kind: 'device' })
    const reasons = [!asHost.ok && asHost.reason, !asDevice.ok && asDevice.reason]
    expect(reasons).toEqual(['subject-mismatch', 'subject-mismatch'])
  })
})
