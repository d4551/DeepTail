/**
 * The host record, as the native registry reports it. One home, because both
 * the picker and the boot sequence address hosts by it.
 *
 * @module
 */

/** One paired harness host. */
export interface HostRecord {
  /** Stable local identity; also the secret-store account name. */
  readonly id: string
  /** Human-readable label shown in the picker. */
  readonly label: string
  /** Canonical origin: scheme and authority, no path. */
  readonly origin: string
  /** Epoch milliseconds of the last successful connection, absent until one succeeds. */
  readonly lastSeen?: number
}
