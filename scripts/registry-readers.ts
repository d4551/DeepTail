/**
 * The primitive reads every registry row is built from.
 *
 * One refusal shape, one place: a row that is the wrong type, missing, empty,
 * out of a fixed set, or carrying a key the schema does not name is refused
 * here with the path it was found at, so every message a stale registry
 * produces names the row and the reason the same way.
 *
 * Split from `action-registry.ts` when it outgrew the size a source file here
 * may reach.
 *
 * @module
 */

import { isJsonObject, type Json } from './jsonc.ts'

/**
 * Refuse a registry that is not what this module can emit from.
 * @param why - what the document got wrong.
 * @returns nothing; it always throws.
 */
export function refuse(why: string): never {
  throw new Error(`actions.bao: ${why}`)
}

/**
 * Read an object, refusing anything else.
 * @param value - the value to read.
 * @param where - what it was found under, for the message.
 * @returns the object.
 */
export function asObject(value: Json | undefined, where: string): { [key: string]: Json } {
  if (!isJsonObject(value)) refuse(`${where} is not an object`)
  return value
}

/**
 * Read an array, refusing anything else.
 * @param value - the value to read.
 * @param where - what it was found under.
 * @returns the array.
 */
export function asArray(value: Json | undefined, where: string): readonly Json[] {
  if (!Array.isArray(value)) refuse(`${where} is not an array`)
  return value
}

/**
 * Read a string, refusing anything else.
 * @param value - the value to read.
 * @param where - what it was found under.
 * @returns the string.
 */
export function asString(value: Json | undefined, where: string): string {
  if (typeof value !== 'string' || value === '') refuse(`${where} is not a non-empty string`)
  return value
}

/**
 * Read an optional string, treating an absent one as no value.
 * @param value - the value to read.
 * @param where - what it was found under.
 * @returns the string, or undefined.
 */
export function asOptionalString(value: Json | undefined, where: string): string | undefined {
  return value === undefined ? undefined : asString(value, where)
}

/**
 * Whether a value is a whole number, narrowed for callers that need one.
 *
 * `Number.isInteger` is false for every value that is not a number, so this is
 * the type test as well as the value test.
 * @param value - the value to test.
 * @returns true when the value is a whole number.
 */
function isWholeNumber(value: Json | undefined): value is number {
  return Number.isInteger(value)
}

/**
 * Read a positive integer, refusing anything else.
 * @param value - the value to read.
 * @param where - what it was found under.
 * @returns the number.
 */
export function asPositiveInt(value: Json | undefined, where: string): number {
  if (!isWholeNumber(value) || value <= 0) refuse(`${where} is not a positive integer`)
  return value
}

/**
 * Read one member of a closed set, refusing anything the set does not name.
 * @param value - the value to read.
 * @param where - what it was found under.
 * @param allowed - the members the field may carry.
 * @returns the member.
 */
export function asOneOf<T extends string>(value: Json | undefined, where: string, allowed: readonly T[]): T {
  const read = asString(value, where)
  for (const member of allowed) {
    if (member === read) return member
  }
  refuse(`${where} is "${read}", not one of ${allowed.join(', ')}`)
}

/**
 * Refuse a row that carries a key the schema does not declare: a key that is
 * silently ignored is a rule its author believed they had written.
 * @param row - the parsed row.
 * @param where - what it was found under.
 * @param declared - the keys the row may carry.
 */
export function refuseUnknownKeys(row: { [key: string]: Json }, where: string, declared: readonly string[]): void {
  for (const key of Object.keys(row)) {
    if (!declared.includes(key)) refuse(`${where} declares "${key}", which the schema does not name`)
  }
}
