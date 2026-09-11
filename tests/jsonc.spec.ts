/**
 * The JSONC reader every gate shares, driven both ways.
 *
 * These cases hit `scripts/jsonc.ts` — the one the gates actually call.
 *
 * The conversion onto the closed model is driven directly as well as through
 * the reader. Through the reader alone it can only ever be handed what a JSON
 * parser produces, so every branch that gives up on a shape the model does not
 * name is unreachable from there, and a reader that stopped refusing those
 * shapes would read the same on every document this repository holds.
 */

import { describe, expect, it } from 'bun:test'
import { asJson, isJsonObject, readJsonc } from '../scripts/jsonc.ts'

/** A value no JSON document can hold, of each kind the runtime has. */
const FOREIGN: readonly unknown[] = [undefined, () => 1, Symbol('foreign'), 10n]

describe('the jsonc reader', () => {
  it('reads comments and trailing commas, which tsconfig files carry', () => {
    const document = readJsonc('{ /* note */ "strict": true, }')
    expect(document.strict).toBe(true)
  })

  it('refuses a document the parser reports errors on', () => {
    expect(() => readJsonc('{ "strict": true')).toThrow(/jsonc parse errors/u)
  })

  it('refuses a root that is not an object', () => {
    expect(() => readJsonc('[]')).toThrow(/JSON object/u)
    expect(() => readJsonc('"a string"')).toThrow(/JSON object/u)
  })

  it('narrows an object and rejects a missing member as not one', () => {
    expect(isJsonObject({ strict: true })).toBe(true)
    expect(isJsonObject(readJsonc('{}').missing)).toBe(false)
    expect(isJsonObject([])).toBe(false)
  })
})

describe('the conversion onto the closed model', () => {
  it('reads each value the model names as itself', () => {
    expect(asJson('text')).toBe('text')
    expect(asJson(true)).toBe(true)
    expect(asJson(false)).toBe(false)
    expect(asJson(0)).toBe(0)
    expect(asJson(-1.5)).toBe(-1.5)
    expect(asJson(null)).toBeNull()
  })

  it('gives up on every value the model does not name', () => {
    // A shape the model cannot hold is no value rather than itself: read as
    // itself it would travel on into a document typed as JSON and be nothing
    // of the kind.
    for (const value of FOREIGN) {
      expect(asJson(value)).toBeUndefined()
    }
  })

  it('reads a list as a list and a mapping as a mapping', () => {
    // The two are one type to `typeof`, and a list read as a mapping arrives
    // with its indices as keys — a document nothing downstream can index.
    expect(asJson([1, 'two', null])).toEqual([1, 'two', null])
    expect(asJson({ a: 1, b: 'two' })).toEqual({ a: 1, b: 'two' })
    expect(asJson([])).toEqual([])
    expect(asJson({})).toEqual({})
  })

  it('reads a document to its full depth', () => {
    expect(asJson({ a: [{ b: [null, false] }] })).toEqual({ a: [{ b: [null, false] }] })
  })

  it('gives up on a list or a mapping carrying a value the model does not name', () => {
    // One member the model cannot hold makes the whole document one it cannot
    // hold; kept, it would sit inside a value every caller has been told is JSON.
    for (const value of FOREIGN) {
      expect(asJson([value])).toBeUndefined()
      expect(asJson({ member: value })).toBeUndefined()
      expect(asJson([[{ deep: value }]])).toBeUndefined()
    }
  })
})
