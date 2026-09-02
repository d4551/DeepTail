/**
 * The pure half of JSON-with-comments reading: a closed model of what a JSON
 * document can be, and the parser that brings text onto it. Everything here is
 * free of the filesystem, so the suites that read configuration as text share
 * it with the suites that read it from disk.
 *
 * @module
 */

import { type ParseError, parse as parseJsonc } from 'jsonc-parser'

/** Every shape a JSON document can hold, closed and named so nothing widens. */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

/** The empty object every optional manifest section falls back to. */
export const EMPTY_SECTION: { [key: string]: Json } = {}

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
 * return type out of the annotations: the conversion is runtime-checked, so
 * no cast ever claims a shape the data was not proven to have.
 * @param value - whatever the parser produced.
 * @returns the same document as a Json value, or undefined for foreign shapes.
 */
function asJson<T>(value: T): Json | undefined {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value === null ? null : (value as string | boolean)
  }
  if (typeof value === 'number') return value
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      const items: Json[] = []
      for (const item of value) {
        const converted = asJson(item)
        if (converted === undefined) return undefined
        items.push(converted)
      }
      return items
    }
    const members: { [key: string]: Json } = {}
    for (const [key, entry] of Object.entries(value)) {
      const converted = asJson(entry)
      if (converted === undefined) return undefined
      members[key] = converted
    }
    return members
  }
  return undefined
}

/**
 * Parse JSON with comments, as every tool that reads a tsconfig does, onto the
 * closed Json model with the root proven to be an object. A document the
 * parser reports errors on is refused rather than half-read.
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
