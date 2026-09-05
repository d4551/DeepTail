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

import { CAPABILITIES, type CapabilityId, isCapabilityId } from '../actions/registry.ts'
import { isWireObject, type WireObject, type WireValue } from '../wire.ts'

/** The identity a grant belongs to: one host, or this device as a whole. */
export type GrantSubject = { readonly kind: 'device' } | { readonly kind: 'host'; readonly hostId: string }

/** One live grant. */
export interface Grant {
  readonly capability: CapabilityId
  readonly subject: GrantSubject
  readonly revision: number
  /** Epoch milliseconds after which the grant is no longer spendable. */
  readonly expiresAt: number
}

/** Why a grant was not spent. */
export type DenialReason =
  | 'no-grant'
  | 'expired'
  | 'stale-revision'
  | 'subject-mismatch'
  | 'context-changed'
  | 'malformed-hydration'
  | 'not-issued-natively'

/** The outcome of asking to spend a capability. */
export type SpendResult =
  | { readonly ok: true; readonly grant: Grant }
  | { readonly ok: false; readonly reason: DenialReason }

/** What the ledger reports when its contents change. */
export interface LedgerChange {
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
 * The key one grant is held under: capability and identity together, so a grant
 * issued for one host is never read for another.
 * @param capability - what it pays for.
 * @param subject - whose authority it carries.
 * @returns the key.
 */
function keyOf(capability: CapabilityId, subject: GrantSubject): string {
  return `${capability} ${subject.kind === 'host' ? subject.hostId : 'device'}`
}

/**
 * Read one grant off the wire, refusing anything that is not one.
 *
 * The capability must be one the registry declared, and its subject must be the
 * subject the registry declared for it: a host-scoped capability arriving with
 * a device subject is a snapshot asking the page to treat one host's authority
 * as every host's.
 * @param value - the entry the snapshot carried.
 * @returns the grant, or undefined when the entry is not a grant.
 */
function readGrant<T>(value: T | WireValue): Grant | undefined {
  if (!isWireObject(value)) return undefined
  const row: WireObject = value
  const capability = row.capability
  const revision = row.revision
  const expiresAt = row.expiresAt
  if (typeof capability !== 'string' || !isCapabilityId(capability)) return undefined
  if (typeof revision !== 'number' || !Number.isInteger(revision) || revision < 0) return undefined
  if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) return undefined
  const declared = CAPABILITIES[capability]
  if (declared.subject === 'host') {
    if (typeof row.subject !== 'string' || row.subject === '') return undefined
    return { capability, subject: { kind: 'host', hostId: row.subject }, revision, expiresAt }
  }
  if (row.subject !== 'device') return undefined
  return { capability, subject: { kind: 'device' }, revision, expiresAt }
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
    const change: LedgerChange = { reason, live: count() }
    for (const listener of [...listeners]) listener(change)
    return change
  }

  /** How many grants are live at this instant. */
  function count(): number {
    let live = 0
    for (const grant of grants.values()) if (grant.expiresAt > now()) live += 1
    return live
  }

  return {
    hydrate<T>(raw: T | WireValue): LedgerChange {
      if (!isWireObject(raw)) {
        grants.clear()
        return announce('malformed-hydration')
      }
      const snapshot: WireObject = raw
      if (typeof snapshot.issuer !== 'string' || typeof snapshot.context !== 'string' || snapshot.context === '') {
        grants.clear()
        return announce('malformed-hydration')
      }
      if (!Array.isArray(snapshot.grants)) {
        grants.clear()
        return announce('malformed-hydration')
      }
      if (snapshot.issuer !== 'native') {
        grants.clear()
        return announce('not-issued-natively')
      }
      const read = snapshot.grants.map(readGrant)
      if (read.some((grant) => grant === undefined)) {
        grants.clear()
        return announce('malformed-hydration')
      }
      if (snapshot.context !== issuedUnder) {
        // A different context is a different authority: a new pairing, a
        // re-pair, a forgotten host. Nothing issued under the old one survives.
        grants.clear()
        issuedUnder = snapshot.context
      }
      for (const grant of read) {
        if (grant === undefined) continue
        const key = keyOf(grant.capability, grant.subject)
        const held = grants.get(key)
        // A revision behind the one held is a replay of an older snapshot. The
        // newer grant stays, because the newer grant is what the authority said
        // last, and the page says so rather than pretending it applied it.
        if (held !== undefined && held.revision > grant.revision) continue
        grants.set(key, grant)
      }
      return announce('hydrated')
    },
    context: () => issuedUnder,
    spend(capability, subject) {
      const grant = grants.get(keyOf(capability, subject))
      if (grant !== undefined) {
        return grant.expiresAt <= now() ? { ok: false, reason: 'expired' } : { ok: true, grant }
      }
      // Nothing under this exact subject. The two reasons the operator can be
      // told differ, and so does what they do next: a capability held under
      // another host is a wrong target, and a capability never issued is a
      // missing grant. Saying "different host" for both sends them to re-pair
      // a host that was never the problem.
      const declared = CAPABILITIES[capability].subject
      if (declared === 'host' ? subject.kind !== 'host' : subject.kind !== 'device') {
        return { ok: false, reason: 'subject-mismatch' }
      }
      const heldUnderAnotherSubject = [...grants.values()].some((held) => held.capability === capability)
      return { ok: false, reason: heldUnderAnotherSubject ? 'subject-mismatch' : 'no-grant' }
    },
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
    live: count,
  }
}
