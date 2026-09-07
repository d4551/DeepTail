/**
 * The host registry's answers, read rather than asserted.
 *
 * `invoke<HostRecord[]>('list_hosts')` named a shape nothing had checked, and
 * the three fields are not decoration: `origin` is where every credentialed
 * request is sent, and `id` is the account name the secret store is asked for.
 * A record short either reached a URL and a keychain lookup as the string a
 * missing value stringifies to, silently, from a value nothing had read.
 */

import { describe, expect, it } from 'bun:test'
import { isHostRecord, readHostRecords } from '../apps/deeptail/src/host.ts'

/** A record with every field the picker and the carrier address it by. */
const WHOLE = { id: 'dev-1', label: 'Laptop', origin: 'https://dev-1.tailnet.ts.net' }

describe('one host record', () => {
  it('accepts a record carrying every field it is addressed by', () => {
    expect(isHostRecord(WHOLE)).toBe(true)
  })

  it('accepts an empty label, which is a host the operator has not named', () => {
    // A blank label draws an unnamed row; a blank origin has nowhere to send.
    expect(isHostRecord({ ...WHOLE, label: '' })).toBe(true)
  })

  it('refuses a record with no origin, which is where its traffic would go', () => {
    expect(isHostRecord({ id: 'dev-1', label: 'Laptop' })).toBe(false)
  })

  it('refuses an empty origin, which resolves against the application itself', () => {
    // `new URL('/api/x', '')` throws, and a relative fetch would point a host's
    // credentialed traffic back at the page that holds the credential.
    expect(isHostRecord({ ...WHOLE, origin: '' })).toBe(false)
  })

  it('refuses a record with no id, which is the account the secret store holds', () => {
    expect(isHostRecord({ label: 'Laptop', origin: 'https://dev-1.example' })).toBe(false)
    expect(isHostRecord({ ...WHOLE, id: '' })).toBe(false)
  })

  it('refuses a field of the wrong kind, however present it is', () => {
    expect(isHostRecord({ ...WHOLE, id: 7 })).toBe(false)
    expect(isHostRecord({ ...WHOLE, origin: null })).toBe(false)
    expect(isHostRecord({ ...WHOLE, label: ['Laptop'] })).toBe(false)
  })

  it('refuses a value that is not a record at all', () => {
    expect(isHostRecord('dev-1')).toBe(false)
    expect(isHostRecord(null)).toBe(false)
    expect(isHostRecord([WHOLE])).toBe(false)
  })
})

describe('the registry read whole', () => {
  it('reads a list of records, and an empty registry as an empty one', () => {
    expect(readHostRecords([WHOLE])).toEqual([WHOLE])
    expect(readHostRecords([])).toEqual([])
  })

  it('refuses an answer that is not a list', () => {
    expect(readHostRecords(WHOLE)).toBeUndefined()
    expect(readHostRecords(null)).toBeUndefined()
  })

  it('refuses the whole registry when one record is malformed', () => {
    // A registry silently short one host is a host the operator paired and
    // cannot see, which looks exactly like one that was never paired.
    expect(readHostRecords([WHOLE, { id: 'dev-2', label: 'Desktop' }])).toBeUndefined()
  })
})
