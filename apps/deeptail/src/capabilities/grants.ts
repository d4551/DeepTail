/**
 * The capability grants the page holds, and what it may spend them on.
 *
 * The native half is the authority: it issues grants, and the page mirrors them
 * so a control can say what it is about to do before the operator asks for it.
 * The mirror is not an authority of its own. This module exposes no way to mint
 * a grant — the only way one enters the ledger is a snapshot the native
 * authority issued, validated field by field on the way in. A page that could
 * write its own grants would be a page with no capability model at all, only a
 * formality it could sign past.
 *
 * A grant is bound to three things at once: the identity it belongs to, the
 * revision it was issued at, and the instant it stops being spendable. Any one
 * of the three moving invalidates the copy the page holds, which is what makes
 * revocation, replay and expiry one check rather than three.
 *
 * @module
 */

import type { CapabilityId } from '../actions/registry.ts'
import type { WireValue } from '../wire.ts'
import {
  type DenialReason,
  type Grant,
  type GrantSubject,
  keyOf,
  readSnapshot,
  type SpendResult,
  spendFrom,
} from './grant-wire.ts'

/** What the ledger reports when its contents change. */
interface LedgerChange {
  /** Why the contents moved: a fresh snapshot, or a clear and its reason. */
  readonly reason: 'hydrated' | DenialReason
  /** How many grants are live now. */
  readonly live: number
}

/** The ledger the page paints from and spends against. */
export interface GrantLedger {
  /**
   * Replace what the ledger holds with a snapshot from the native authority.
   *
   * A snapshot that is malformed, or that does not say it came from the native
   * half, clears the ledger rather than being partly believed: half a grant
   * table is a table that says one thing and does another.
   * @param raw - whatever the native call returned.
   * @returns why the ledger now holds what it holds.
   */
  hydrate<T>(raw: T | WireValue): LedgerChange
  /** The context the current grants were issued under. */
  context(): string
  /**
   * Ask to spend one capability for one identity, right now.
   * @param capability - what the action costs.
   * @param subject - whose authority the action runs on.
   * @returns the grant, or why it was refused.
   */
  spend(capability: CapabilityId, subject: GrantSubject): SpendResult
  /**
   * Drop every grant, because the context they were issued under is gone.
   * @param reason - what ended them, which the surfaces report.
   * @returns the change to report.
   */
  invalidate(reason: DenialReason): LedgerChange
  /**
   * Follow the ledger's contents.
   * @param listener - called with every change.
   * @returns a disposer.
   */
  subscribe(listener: (change: LedgerChange) => void): () => void
  /** How many grants are live at this instant. */
  live(): number
}

/**
 * Write a snapshot's grants over what the ledger holds.
 *
 * A revision behind the one held is a replay of an older snapshot. The newer
 * grant stays, because the newer grant is what the authority said last, and
 * the page says so rather than pretending it applied the older one.
 * @param grants - what the ledger holds, written in place.
 * @param arriving - what the snapshot carried.
 */
function applyGrants(grants: Map<string, Grant>, arriving: readonly Grant[]): void {
  for (const grant of arriving) {
    const key = keyOf(grant.capability, grant.subject)
    const held = grants.get(key)
    if (held !== undefined && held.revision > grant.revision) continue
    grants.set(key, grant)
  }
}

/**
 * How many of a ledger's grants are live at one instant.
 * @param grants - what the ledger holds.
 * @param at - the instant to judge expiry against.
 * @returns the count.
 */
function liveCount(grants: ReadonlyMap<string, Grant>, at: number): number {
  let live = 0
  for (const grant of grants.values()) if (grant.expiresAt > at) live += 1
  return live
}

/**
 * Take a snapshot into a ledger's state.
 *
 * A context the ledger has not seen is a different authority — a new pairing, a
 * re-pair, a forgotten host — and nothing issued under the old one survives it.
 * @param grants - what the ledger holds, written in place.
 * @param issuedUnder - the context the held grants were issued under.
 * @param raw - whatever arrived over the wire.
 * @returns the reason to announce, and the context now in force.
 */
function hydrateInto<T>(
  grants: Map<string, Grant>,
  issuedUnder: string,
  raw: T | WireValue,
): { readonly reason: LedgerChange['reason']; readonly context: string } {
  const snapshot = readSnapshot(raw)
  if (typeof snapshot === 'string') {
    grants.clear()
    return { reason: snapshot, context: issuedUnder }
  }
  if (snapshot.context !== issuedUnder) grants.clear()
  applyGrants(grants, snapshot.grants)
  return { reason: 'hydrated', context: snapshot.context }
}

/**
 * Build a ledger.
 * @param now - the clock, so a suite can move time without waiting for it.
 * @returns the ledger.
 */
export function createGrantLedger(now: () => number = () => Date.now()): GrantLedger {
  const grants = new Map<string, Grant>()
  const listeners = new Set<(change: LedgerChange) => void>()
  let issuedUnder = 'unissued'

  /**
   * Tell every listener what the ledger now holds.
   * @param reason - why the contents moved.
   * @returns the change, for the caller to hand back as its own result.
   */
  function announce(reason: LedgerChange['reason']): LedgerChange {
    const change: LedgerChange = { reason, live: liveCount(grants, now()) }
    // A snapshot, not the set: a listener that unsubscribes as it is called
    // would otherwise mutate the collection being walked.
    const called = [...listeners]
    for (const listener of called) listener(change)
    return change
  }

  return {
    hydrate<T>(raw: T | WireValue): LedgerChange {
      const taken = hydrateInto(grants, issuedUnder, raw)
      issuedUnder = taken.context
      return announce(taken.reason)
    },
    context: () => issuedUnder,
    spend: (capability, subject) => spendFrom(grants, capability, subject, now()),
    invalidate(reason) {
      grants.clear()
      issuedUnder = 'unissued'
      return announce(reason)
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    live: () => liveCount(grants, now()),
  }
}
