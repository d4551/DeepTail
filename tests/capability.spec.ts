/**
 * The capability ledger: what the page is allowed to spend, and for how long.
 *
 * The ledger is a mirror of grants the native layer issued. It is not an
 * authority of its own: a snapshot that did not come from the native layer, one
 * that cannot be read, or one belonging to a superseded context clears what it
 * holds rather than leaving the page holding something the operator no longer
 * has. These cases are that contract.
 */

import { describe, expect, it } from 'bun:test'
import { createGrantLedger } from '../apps/deeptail/src/capabilities/grants.ts'
import { clock, deviceGrant, hostGrant, snapshot } from './grant-fixture.ts'

describe('the capability ledger', () => {
  it('holds a grant the native authority issued', () => {
    const time = clock()
    const ledger = createGrantLedger(time.now)
    ledger.hydrate(snapshot([deviceGrant('host.read')]))
    expect(ledger.spend('host.read', { kind: 'device' }).ok).toBe(true)
  })

  it('clears everything when a snapshot cannot be read', () => {
    const time = clock()
    const ledger = createGrantLedger(time.now)
    ledger.hydrate(snapshot([deviceGrant('host.read')]))
    const change = ledger.hydrate({ issuer: 'native', context: 'ctx-1', revision: 1, grants: [{ capability: 'nope' }] })
    expect([change.reason, ledger.live()]).toEqual(['malformed-hydration', 0])
  })

  it('clears everything when the snapshot is not a snapshot at all', () => {
    const time = clock()
    const ledger = createGrantLedger(time.now)
    ledger.hydrate(snapshot([deviceGrant('host.read')]))
    const change = ledger.hydrate('a string where a snapshot was expected')
    expect([change.reason, ledger.live()]).toEqual(['malformed-hydration', 0])
  })

  it('refuses a snapshot that did not come from the native layer', () => {
    const time = clock()
    const ledger = createGrantLedger(time.now)
    ledger.hydrate(snapshot([deviceGrant('host.read')]))
    const change = ledger.hydrate({
      issuer: 'renderer',
      context: 'ctx-1',
      revision: 1,
      grants: [deviceGrant('host.read')],
    })
    expect([change.reason, ledger.live()]).toEqual(['not-issued-natively', 0])
  })

  it('drops what an earlier context issued', () => {
    const time = clock()
    const ledger = createGrantLedger(time.now)
    ledger.hydrate(snapshot([deviceGrant('host.read')], 'ctx-1'))
    ledger.hydrate(snapshot([deviceGrant('session.read')], 'ctx-2'))
    expect([ledger.context(), ledger.spend('host.read', { kind: 'device' }).ok]).toEqual(['ctx-2', false])
    expect(ledger.spend('session.read', { kind: 'device' }).ok).toBe(true)
  })

  it('keeps the newer revision when an older snapshot arrives', () => {
    const time = clock()
    const ledger = createGrantLedger(time.now)
    ledger.hydrate(snapshot([deviceGrant('host.read', 7)]))
    ledger.hydrate(snapshot([deviceGrant('host.read', 3)]))
    const spent = ledger.spend('host.read', { kind: 'device' })
    expect(spent.ok && spent.grant.revision).toBe(7)
  })

  it('refuses a grant once it has expired', () => {
    const time = clock()
    const ledger = createGrantLedger(time.now)
    ledger.hydrate(snapshot([deviceGrant('host.read', 1, 1_500_000)]))
    time.advance(600_000)
    const spent = ledger.spend('host.read', { kind: 'device' })
    expect(spent.ok).toBe(false)
    expect(!spent.ok && spent.reason).toBe('expired')
  })

  it('will not spend one host grant on another host', () => {
    const time = clock()
    const ledger = createGrantLedger(time.now)
    ledger.hydrate(snapshot([hostGrant('session.read', 'host-a')]))
    const spent = ledger.spend('session.read', { kind: 'host', hostId: 'host-b' })
    expect(!spent.ok && spent.reason).toBe('subject-mismatch')
  })

  it('spends a host grant on the host it names', () => {
    const time = clock()
    const ledger = createGrantLedger(time.now)
    ledger.hydrate(snapshot([hostGrant('session.read', 'host-a')]))
    expect(ledger.spend('session.read', { kind: 'host', hostId: 'host-a' }).ok).toBe(true)
  })

  it('empties itself when the context changes underneath it', () => {
    const time = clock()
    const ledger = createGrantLedger(time.now)
    ledger.hydrate(snapshot([deviceGrant('host.read')]))
    const change = ledger.invalidate('context-changed')
    expect([change.reason, ledger.live()]).toEqual(['context-changed', 0])
    expect(ledger.spend('host.read', { kind: 'device' }).ok).toBe(false)
  })

  it('tells a listener each time what may be spent changes', () => {
    const time = clock()
    const ledger = createGrantLedger(time.now)
    const seen: string[] = []
    const unsubscribe = ledger.subscribe((change) => seen.push(`${change.reason}:${String(change.live)}`))
    ledger.hydrate(snapshot([deviceGrant('host.read'), deviceGrant('session.read')]))
    ledger.invalidate('context-changed')
    unsubscribe()
    ledger.hydrate(snapshot([deviceGrant('host.read')]))
    expect(seen).toEqual(['hydrated:2', 'context-changed:0'])
  })
})
