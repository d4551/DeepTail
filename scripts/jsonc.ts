/**
 * The closed model of what a JSON document can be, and the parser that brings
 * text onto it.
 *
 * Every tool that reads a configuration file — the generators, the gates, and
 * the suites that assert on their output — reads it through this one model, so a
 * document cannot be one shape in the generator and another in the test that
 * checks the generator. Nothing here touches the filesystem.
 *
 * @module
 */

import { type ParseError, parse as parseJsonc } from 'jsonc-parser'

/** Every shape a JSON document can hold, closed and named so nothing widens. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

/** The empty object every optional section falls back to. */
export const EMPTY_SECTION: { [key: string]: Json } = {}

/**
 * One member of a document, read by a key the caller supplies.
 *
 * The key travels as a value rather than as a written property, which is what
 * keeps a read honest about the document being a map at that point: it has not
 * been proven to carry the member at all. It is also the spelling the compiler
 * requires — `noPropertyAccessFromIndexSignature` refuses the property form —
 * and the one the linter accepts, which a written literal index is not.
 *
 * Three modules had written this out apiece before it lived here.
 * @param document - the decoded document.
 * @param key - the member to read.
 * @returns the member, or undefined when the document has none.
 */
export function member(document: { [key: string]: Json }, key: string): Json | undefined {
  return document[key]
}

/**
 * Whether a JSON value is an object, narrowed for callers that need its keys.
 * @param value - the JSON value to test; a missing member reads as undefined.
 * @returns true when the value is a JSON object.
 */
export function isJsonObject(value: Json | undefined): value is { [key: string]: Json } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Bring a parsed document onto the closed Json model, or give up when a shape
 * appears that the model does not name. The generic keeps the library's own
 * return type out of the annotations: the conversion is runtime-checked, so no
 * cast ever claims a shape the data was not proven to have.
 * @param value - whatever the parser produced.
 * @returns the same document as a Json value, or undefined for foreign shapes.
 */
function asJson<T>(value: T): Json | undefined {
  // Null is answered on its own rather than beside the primitives, which is
  // what the narrowing needs: while the three shared one test, the branch's
  // type was the union of all of them and an assertion was written to pick a
  // member back out of it. Tested apart, each test narrows to what it names.
  if (value === null) return null
  if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') return value
  if (typeof value !== 'object') return undefined
  return Array.isArray(value) ? asJsonArray(value) : asJsonObject(value)
}

/**
 * Bring every item of an array onto the model.
 * @param value - the array the parser produced.
 * @returns the items, or undefined when any item is a shape the model does not
 * name — a foreign item makes the whole document foreign.
 */
function asJsonArray<T>(value: readonly T[]): Json[] | undefined {
  const items: Json[] = []
  for (const item of value) {
    const converted = asJson(item)
    if (converted === undefined) return undefined
    items.push(converted)
  }
  return items
}

/**
 * Bring every member of an object onto the model.
 * @param value - the object the parser produced.
 * @returns the members, or undefined when any member is a shape the model does
 * not name.
 */
function asJsonObject<T extends object>(value: T): { [key: string]: Json } | undefined {
  const members: { [key: string]: Json } = {}
  for (const [key, entry] of Object.entries(value)) {
    const converted = asJson(entry)
    if (converted === undefined) return undefined
    members[key] = converted
  }
  return members
}

/**
 * Parse JSON with comments onto the closed Json model, with the root proven to
 * be an object. A document the parser reports errors on is refused rather than
 * half-read.
 * @param text - the file contents.
 * @returns the parsed object.
 */
export function readJsonc(text: string): { [key: string]: Json } {
  const errors: ParseError[] = []
  const parsed = asJson(parseJsonc(text, errors, { allowTrailingComma: true }))
  if (errors.length > 0) throw new Error(`jsonc parse errors: ${String(errors.length)}`)
  if (parsed === undefined || !isJsonObject(parsed)) throw new Error('expected a JSON object at the root')
  return parsed
}
