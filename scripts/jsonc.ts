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
 * Whether a JSON value is an object, narrowed for callers that need its keys.
 * @param value - the JSON value to test; a missing member reads as undefined.
 * @returns true when the value is a JSON object.
 */
export function isJsonObject(value: Json | undefined): value is { [key: string]: Json } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Bring a parsed value onto the closed Json model, or give up when a shape
 * appears the model does not name.
 *
 * The parser hands back a value of no declared shape, so every member is
 * proven here rather than claimed: each branch narrows on a test the runtime
 * performs, and a value carrying a shape the model does not name reads as no
 * value at all rather than as itself.
 * @param value - whatever the parser produced.
 * @returns the same value on the Json model, or undefined for a foreign shape.
 */
export function asJson(value: unknown): Json | undefined {
  if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') return value
  if (typeof value !== 'object') return undefined
  if (value === null) return null
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
  if (!isJsonObject(parsed)) throw new Error('expected a JSON object at the root')
  return parsed
}
