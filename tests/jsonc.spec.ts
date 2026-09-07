/**
 * The JSONC reader every gate shares, driven both ways.
 *
 * These cases hit `scripts/jsonc.ts` — the one the gates actually call.
 */

import { describe, expect, it } from 'bun:test'
import { isJsonObject, readJsonc } from '../scripts/jsonc.ts'

/** A member name this suite reads by, held as data because that is what it is. */
const MEMBER = 'strict'

/** A member name no fixture here declares. */
const ABSENT = 'missing'

describe('the jsonc reader', () => {
  it('reads comments and trailing commas, which tsconfig files carry', () => {
    // The whole document rather than one member: a reader that dropped the
    // trailing comma's entry, or invented one, would answer this case's single
    // member correctly and still be wrong about the file.
    expect(Object.entries(readJsonc('{ /* note */ "strict": true, }'))).toEqual([[MEMBER, true]])
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
    expect(isJsonObject(readJsonc('{}')[ABSENT])).toBe(false)
    expect(isJsonObject([])).toBe(false)
  })
})
