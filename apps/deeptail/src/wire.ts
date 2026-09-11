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
 * The JSON model itself, re-named here.
 *
 * This module is where a value stops being arbitrary JSON and becomes an
 * answer a predicate has read, so it is also where a caller that has to build
 * one — a suite standing in for the other side of a boundary — names the model
 * it is building on.
 */
export type { JsonValue }

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

/**
 * Read one field of a wire object, by name.
 *
 * Every field read off the wire goes through a reader here rather than through
 * property access at the call site: the field is named where it is read, and
 * the read is one lookup this module owns.
 * @param value - the object to read.
 * @param field - the field's name.
 * @returns the field's value, or undefined when it was absent.
 */
export function fieldOf(value: WireObject, field: string): WireValue {
  return value[field]
}

/**
 * Read one field that must be a string.
 * @param value - the object to read.
 * @param field - the field's name.
 * @returns the string, or undefined when the field was absent or another type.
 */
export function stringFieldOf(value: WireObject, field: string): string | undefined {
  const read = fieldOf(value, field)
  return typeof read === 'string' ? read : undefined
}

/**
 * Read one field that must be a number.
 * @param value - the object to read.
 * @param field - the field's name.
 * @returns the number, or undefined when the field was absent or another type.
 */
export function numberFieldOf(value: WireObject, field: string): number | undefined {
  const read = fieldOf(value, field)
  return typeof read === 'number' ? read : undefined
}

/**
 * Read one field that must be a boolean.
 * @param value - the object to read.
 * @param field - the field's name.
 * @returns the boolean, or undefined when the field was absent or another type.
 */
export function booleanFieldOf(value: WireObject, field: string): boolean | undefined {
  const read = fieldOf(value, field)
  return typeof read === 'boolean' ? read : undefined
}

/**
 * Read one field that must be a list.
 * @param value - the object to read.
 * @param field - the field's name.
 * @returns the list, or undefined when the field was absent or not a list.
 */
export function arrayFieldOf(value: WireObject, field: string): readonly JsonValue[] | undefined {
  const read = fieldOf(value, field)
  return Array.isArray(read) ? read : undefined
}

/**
 * Read one field that must be an object.
 * @param value - the object to read.
 * @param field - the field's name.
 * @returns the object, or undefined when the field was absent or not an object.
 */
export function objectFieldOf(value: WireObject, field: string): WireObject | undefined {
  const read = fieldOf(value, field)
  return isWireObject(read) ? read : undefined
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
    stringFieldOf(value, 'sessionId') !== undefined &&
    numberFieldOf(value, 'updatedAt') !== undefined &&
    booleanFieldOf(value, 'running') !== undefined &&
    booleanFieldOf(value, 'blank') !== undefined
  )
}
