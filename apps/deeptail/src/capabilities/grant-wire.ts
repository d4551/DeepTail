/**
 * The wire half of the capability grants: reading one grant, and one snapshot,
 * off what the native authority sent.
 *
 * The reader refuses rather than repairs. A grant that is not field-for-field
 * what the registry declared is not a grant the page can hold, and a snapshot
 * that is malformed, or that does not say it came from the native half, is a
 * refusal rather than a table partly believed.
 *
 * @module
 */

import type { JsonValue } from '@deepseek-ai/dsh-util-values'
import { CAPABILITIES, type CapabilityId, isCapabilityId } from '../actions/registry.ts'
import { isWireObject, type WireObject, type WireValue } from '../wire.ts'

/** The fields one grant entry carries, as the wire object they are read from. */
interface GrantWire extends WireObject {
  readonly capability?: JsonValue
  readonly revision?: JsonValue
  readonly expiresAt?: JsonValue
  readonly subject?: JsonValue
}

/** The fields a hydration snapshot carries, as the wire object they are read from. */
interface SnapshotWire extends WireObject {
  readonly issuer?: JsonValue
  readonly context?: JsonValue
  readonly grants?: JsonValue
}

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

/**
 * The key one grant is held under: capability and identity together, so a grant
 * issued for one host is never read for another.
 * @param capability - what it pays for.
 * @param subject - whose authority it carries.
 * @returns the key.
 */
export function keyOf(capability: CapabilityId, subject: GrantSubject): string {
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
  const row: GrantWire = value
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
 * What a hydration snapshot said, or the reason it could not be read.
 *
 * A refusal is returned rather than thrown so the ledger has exactly one place
 * that clears itself and announces, whatever the snapshot was wrong about.
 * @param raw - whatever arrived over the wire.
 * @returns the context and grants, or the change to announce instead.
 */
export function readSnapshot<T>(
  raw: T | WireValue,
): { readonly context: string; readonly grants: readonly Grant[] } | 'malformed-hydration' | 'not-issued-natively' {
  if (!isWireObject(raw)) return 'malformed-hydration'
  const snapshot: SnapshotWire = raw
  if (typeof snapshot.issuer !== 'string' || typeof snapshot.context !== 'string' || snapshot.context === '') {
    return 'malformed-hydration'
  }
  if (!Array.isArray(snapshot.grants)) return 'malformed-hydration'
  if (snapshot.issuer !== 'native') return 'not-issued-natively'
  const read = snapshot.grants.map((grant) => readGrant(grant))
  const grants: Grant[] = []
  for (const grant of read) {
    if (grant === undefined) return 'malformed-hydration'
    grants.push(grant)
  }
  return { context: snapshot.context, grants }
}

/**
 * Whether one capability may be spent under one subject, right now.
 * @param grants - what the ledger holds.
 * @param capability - the capability the action costs.
 * @param subject - the identity the grant must be bound to.
 * @param at - the instant to judge expiry against.
 * @returns the grant, or why it may not be spent.
 */
export function spendFrom(
  grants: ReadonlyMap<string, Grant>,
  capability: CapabilityId,
  subject: GrantSubject,
  at: number,
): SpendResult {
  const grant = grants.get(keyOf(capability, subject))
  if (grant !== undefined) {
    return grant.expiresAt <= at ? { ok: false, reason: 'expired' } : { ok: true, grant }
  }
  // Nothing under this exact subject. The two reasons the operator can be told
  // differ, and so does what they do next: a capability held under another host
  // is a wrong target, and a capability never issued is a missing grant. Saying
  // "different host" for both sends them to re-pair a host that was never the
  // problem.
  const declared = CAPABILITIES[capability].subject
  if (declared === 'host' ? subject.kind !== 'host' : subject.kind !== 'device') {
    return { ok: false, reason: 'subject-mismatch' }
  }
  const heldUnderAnotherSubject = [...grants.values()].some((held) => held.capability === capability)
  return { ok: false, reason: heldUnderAnotherSubject ? 'subject-mismatch' : 'no-grant' }
}
