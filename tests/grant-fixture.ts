/**
 * Grant snapshots the capability tests hand the page.
 *
 * The native authority's snapshot has one shape, and both the ledger's own
 * cases and the dispatcher's cases need it. Writing it twice is how a test
 * suite ends up proving a shape the product never sends.
 *
 * @module
 */

/** One grant as the native authority writes it. */
export interface GrantEntry {
  readonly capability: string
  readonly subject: string
  readonly revision: number
  readonly expiresAt: number
}

/** A snapshot the native authority would have issued. */
export interface Snapshot {
  readonly issuer: string
  readonly context: string
  readonly revision: number
  readonly grants: readonly GrantEntry[]
}

/**
 * A snapshot carrying these grants.
 * @param grants - what to hand the page.
 * @param context - the authority context the snapshot belongs to.
 * @returns the snapshot.
 */
export function snapshot(grants: readonly GrantEntry[], context = 'ctx-1'): Snapshot {
  return { issuer: 'native', context, revision: 1, grants }
}

/**
 * One host-scoped grant.
 * @param capability - what it authorises.
 * @param hostId - the host it is bound to.
 * @param revision - which issue of it this is.
 * @param expiresAt - the instant it stops being spendable.
 * @returns the entry.
 */
export function hostGrant(capability: string, hostId: string, revision = 1, expiresAt = 2_000_000): GrantEntry {
  return { capability, subject: hostId, revision, expiresAt }
}

/**
 * One device-scoped grant.
 * @param capability - what it authorises.
 * @param revision - which issue of it this is.
 * @param expiresAt - the instant it stops being spendable.
 * @returns the entry.
 */
export function deviceGrant(capability: string, revision = 1, expiresAt = 2_000_000): GrantEntry {
  return { capability, subject: 'device', revision, expiresAt }
}

/**
 * A clock a case moves by hand.
 * @returns the clock, and the means to advance it.
 */
export function clock(): { now(): number; advance(ms: number): void } {
  let at = 1_000_000
  return { now: () => at, advance: (ms) => (at += ms) }
}
