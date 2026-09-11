/**
 * The host record, as the native registry reports it. One home, because both
 * the picker and the boot sequence address hosts by it.
 *
 * @module
 */

import { isWireObject, stringFieldOf, type WireValue } from './wire.ts'

/** One paired harness host. */
export interface HostRecord {
  /** Stable local identity; also the secret-store account name. */
  readonly id: string
  /** Human-readable label shown in the picker. */
  readonly label: string
  /** Canonical origin: scheme and authority, no path. */
  readonly origin: string
}

/**
 * Whether a value the native registry sent is a host record.
 *
 * Read by field rather than claimed: the registry is another process, and a
 * record with a missing origin would reach the picker as a host nothing can
 * be paired against.
 * @param value - any value the native side may have sent.
 * @returns whether the value is a record the picker can hold.
 */
export function isHostRecord(value: HostRecord | WireValue): value is HostRecord {
  return (
    isWireObject(value) &&
    stringFieldOf(value, 'id') !== undefined &&
    stringFieldOf(value, 'label') !== undefined &&
    stringFieldOf(value, 'origin') !== undefined
  )
}
