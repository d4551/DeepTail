/**
 * The shapes a host may serialize into a Remote call, narrowed to what every
 * consumer can ask for without an `as`.
 *
 * A wire value is the JSON tree an answer carries: scalars, arrays, and nested
 * objects, each named. The narrower shapes the rest of the surface depends on
 * (`SessionSummary`, a call's answer) are checked against `isWireObject`
 * before any field is read, so a call that hands the surface a malformed value
 * raises a protocol failure instead of reading a field of the wrong shape.
 *
 * Every predicate takes its parameter generically, the way `messageOf` does:
 * a value fresh off the wire is nothing this product has narrowed yet, and a
 * caller that already holds a narrowed value keeps the same answer.
 *
 * @module
 */

import type { JsonValue } from '@deepseek-ai/dsh-util-values'
import type { SessionSummary } from './api.ts'

/**
 * The JSON values an envelope may carry, by the package that owns them, plus
 * the hole an argument list can carry where the host sent nothing.
 *
 * Restated as a name because this module is where a value stops being
 * arbitrary JSON and becomes an answer a predicate has read.
 */
export type WireValue = JsonValue | undefined

/** The object branch of {@link WireValue}, given to fields by index. */
export interface WireObject {
  readonly [field: string]: JsonValue
}

/** Whether a value names a serialised object.
 * @param value - any value the host may have sent.
 * @returns whether the value can be read by field.
 */
export function isWireObject<T>(value: T | WireValue): value is WireObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * The narrowest shape that can be placed in the roster.
 *
 * Validation is by field rather than by cast, so extra fields the host sends
 * travel with the row, and a row that names nothing we recognise cannot land
 * here. The answer carries the index signature it was validated through, so
 * what a caller reads off it is what the predicate actually checked: the id,
 * the activity stamp, and the two booleans the host's own `SessionSummary`
 * declares.
 * @param value - any value the host may have sent.
 * @returns whether the value is a row the roster can hold.
 */
export function isSessionSummary<T>(value: T | WireValue): value is SessionSummary {
  return (
    isWireObject(value) &&
    typeof value.sessionId === 'string' &&
    typeof value.updatedAt === 'number' &&
    typeof value.running === 'boolean' &&
    typeof value.blank === 'boolean'
  )
}
