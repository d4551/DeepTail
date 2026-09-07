/**
 * The host record, as the native registry reports it. One home, because both
 * the picker and the boot sequence address hosts by it.
 *
 * The registry's answers are read rather than asserted. Naming this type as
 * `invoke`'s type argument claimed a shape nothing had checked, and the three
 * fields are not decoration: `origin` is where every credentialed request is
 * sent, and `id` is the account name the secret store is asked for. A record
 * missing either reached the carrier as `undefined` in a URL and the store as
 * a lookup for the string it stringifies to.
 *
 * @module
 */

import type { JsonValue } from '@deepseek-ai/dsh-util-values'
import { isWireObject, type WireObject, type WireValue } from './wire.ts'

/**
 * One paired harness host.
 *
 * A type alias rather than an interface, for the reason `SessionSummary` is
 * one: an alias carries the implicit index signature that lets a record travel
 * as a wire value, so the predicate below can answer about it without a
 * narrowing assertion.
 */
export type HostRecord = {
  /** Stable local identity; also the secret-store account name. */
  readonly id: string
  /** Human-readable label shown in the picker. */
  readonly label: string
  /** Canonical origin: scheme and authority, no path. */
  readonly origin: string
}

/** The fields a host record must carry, as the wire object they are read from. */
interface HostRecordWire extends WireObject {
  readonly id?: JsonValue
  readonly label?: JsonValue
  readonly origin?: JsonValue
}

/**
 * Whether a value is a host record the picker and the carrier can address.
 *
 * Validation is by field rather than by cast, in the shape `wire.ts` uses for
 * every other answer. Empty strings are refused along with absent ones: an
 * origin of `''` resolves against the page's own URL, which would point a
 * host's traffic back at the application itself.
 * @param value - any value the native registry may have sent.
 * @returns whether the value is a record this product can use.
 */
export function isHostRecord<T>(value: T | WireValue): value is HostRecord {
  if (!isWireObject(value)) return false
  const row: HostRecordWire = value
  return (
    typeof row.id === 'string' &&
    row.id.length > 0 &&
    typeof row.label === 'string' &&
    typeof row.origin === 'string' &&
    row.origin.length > 0
  )
}

/**
 * The registry a host answered with, or nothing when it answered one this
 * product cannot address.
 *
 * The whole list is refused rather than the offending record dropped: a
 * registry silently short one host is a host the operator paired and cannot
 * see, which looks exactly like one that was never paired.
 * @param value - whatever the native registry answered with.
 * @returns the records, or undefined when the answer is not a list of them.
 */
export function readHostRecords<T>(value: T | WireValue): readonly HostRecord[] | undefined {
  if (!Array.isArray(value)) return undefined
  const records: HostRecord[] = []
  for (const record of value) {
    if (!isHostRecord(record)) return undefined
    records.push(record)
  }
  return records
}
