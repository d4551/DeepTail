/**
 * The JSONC reader every gate shares, driven both ways.
 *
 * A second copy of this parser lived in `tests/jsonc.ts` and nothing imported
 * it, so the suites could not tell the shipped reader from a fork that had
 * drifted. These cases hit `scripts/jsonc.ts` — the one the gates actually call.
 */

import { describe, expect, it } from 'bun:test'
import { isJsonObject, readJsonc } from '../scripts/jsonc.ts'

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
    expect(isJsonObject(undefined)).toBe(false)
    expect(isJsonObject([])).toBe(false)
  })
})
