/**
 * The primitive reads every registry row is built from.
 *
 * The registry is generated source: a row read wrongly becomes a shipped
 * declaration that says something nobody wrote. Each reader refuses exactly one
 * thing and names where it found it, and a message that stops naming the row is
 * a stale registry nobody can locate.
 */

import { describe, expect, it } from 'bun:test'
import {
  asArray,
  asObject,
  asOneOf,
  asOptionalString,
  asPositiveInt,
  asString,
  refuse,
  refuseUnknownKeys,
} from '../scripts/registry-readers.ts'

describe('the refusal', () => {
  it('names the document it is about, so a message can be traced to it', () => {
    expect(() => refuse('something is wrong')).toThrow('actions.bao: something is wrong')
  })
})

describe('the object reader', () => {
  it('reads an object, and refuses everything that is not one', () => {
    expect(asObject({ a: 1 }, 'row')).toEqual({ a: 1 })
    expect(asObject({}, 'row')).toEqual({})
    for (const value of [[], 'text', 1, true, null, undefined]) {
      expect(() => asObject(value, 'row')).toThrow('actions.bao: row is not an object')
    }
  })
})

describe('the array reader', () => {
  it('reads an array, and refuses everything that is not one', () => {
    expect(asArray([1, 2], 'rows')).toEqual([1, 2])
    expect(asArray([], 'rows')).toEqual([])
    for (const value of [{}, 'text', 1, true, null, undefined]) {
      expect(() => asArray(value, 'rows')).toThrow('actions.bao: rows is not an array')
    }
  })
})

describe('the string reader', () => {
  it('reads a non-empty string, and refuses everything else including an empty one', () => {
    expect(asString('value', 'row.id')).toBe('value')
    for (const value of ['', [], {}, 1, 0, true, false, null, undefined]) {
      expect(() => asString(value, 'row.id')).toThrow('actions.bao: row.id is not a non-empty string')
    }
  })

  it('treats an absent optional string as no value, and reads a present one', () => {
    expect(asOptionalString(undefined, 'row.note')).toBeUndefined()
    expect(asOptionalString('value', 'row.note')).toBe('value')
    // Present but empty is a row that wrote the key and left it blank, which is
    // not the same as leaving it out.
    expect(() => asOptionalString('', 'row.note')).toThrow('actions.bao: row.note is not a non-empty string')
    expect(() => asOptionalString(null, 'row.note')).toThrow('actions.bao: row.note is not a non-empty string')
  })
})

describe('the positive-integer reader', () => {
  it('reads a positive integer, and refuses every other number and every non-number', () => {
    expect(asPositiveInt(1, 'row.ttl')).toBe(1)
    expect(asPositiveInt(3600, 'row.ttl')).toBe(3600)
    for (const value of [0, -1, 1.5, Number.NaN, '1', true, null, undefined, [], {}]) {
      expect(() => asPositiveInt(value, 'row.ttl')).toThrow('actions.bao: row.ttl is not a positive integer')
    }
  })
})

describe('the closed-set reader', () => {
  it('reads a member of the set', () => {
    expect(asOneOf('host', 'row.subject', ['device', 'host'])).toBe('host')
    expect(asOneOf('device', 'row.subject', ['device', 'host'])).toBe('device')
  })

  it('refuses a value the set does not name, and says what the set is', () => {
    expect(() => asOneOf('other', 'row.subject', ['device', 'host'])).toThrow(
      'actions.bao: row.subject is "other", not one of device, host',
    )
  })

  it('refuses a value that is not a string at all, before it looks in the set', () => {
    expect(() => asOneOf(1, 'row.subject', ['device', 'host'])).toThrow(
      'actions.bao: row.subject is not a non-empty string',
    )
  })

  it('refuses everything when the set names nothing', () => {
    expect(() => asOneOf('host', 'row.subject', [])).toThrow('actions.bao: row.subject is "host", not one of ')
  })
})

describe('the unknown-key refusal', () => {
  it('admits a row carrying only keys the schema names, and fewer', () => {
    expect(() => refuseUnknownKeys({ id: 'a', lane: 'b' }, 'row', ['id', 'lane'])).not.toThrow()
    expect(() => refuseUnknownKeys({ id: 'a' }, 'row', ['id', 'lane'])).not.toThrow()
    expect(() => refuseUnknownKeys({}, 'row', ['id'])).not.toThrow()
  })

  it('refuses a key the schema does not name, and says which', () => {
    // A key that is silently ignored is a rule its author believed they wrote.
    expect(() => refuseUnknownKeys({ id: 'a', typo: 'b' }, 'row', ['id'])).toThrow(
      'actions.bao: row declares "typo", which the schema does not name',
    )
  })

  it('refuses the first unknown key it meets, rather than the last', () => {
    expect(() => refuseUnknownKeys({ first: 1, second: 2 }, 'row', [])).toThrow(
      'actions.bao: row declares "first", which the schema does not name',
    )
  })
})
