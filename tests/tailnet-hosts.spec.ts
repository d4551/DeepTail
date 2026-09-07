/**
 * The tailnet listing, read rather than asserted.
 *
 * `invoke<TailnetHost[]>('tailscale_devices')` named a shape nothing had
 * checked. The picker draws every field — the label and the operating system
 * as text, the two booleans as the states that decide whether a machine can be
 * paired at all — and `origin` is what the pairing link is composed against.
 */

import { describe, expect, it } from 'bun:test'
import { readTailnetHosts } from '../apps/deeptail/src/tailscale.ts'

/** A machine carrying every field the picker draws it by. */
const WHOLE = {
  id: 'n-1',
  label: 'laptop',
  origin: 'https://laptop.tailnet.ts.net',
  os: 'macOS',
  lastSeen: '2026-09-08T00:00:00Z',
  tags: ['tag:dev'],
  authorized: true,
  paired: false,
}

describe('one tailnet machine', () => {
  it('reads a machine carrying every field the picker draws', () => {
    expect(readTailnetHosts([WHOLE])).toEqual([WHOLE])
  })

  it('reads a machine with no tags, which is a machine nobody has tagged', () => {
    expect(readTailnetHosts([{ ...WHOLE, tags: [] }])?.[0]?.tags).toEqual([])
  })

  it('reads an empty label, which is a machine the tailnet has not named', () => {
    expect(readTailnetHosts([{ ...WHOLE, label: '' }])?.length).toBe(1)
  })

  it('refuses an empty origin, which the pairing link would compose against the page', () => {
    expect(readTailnetHosts([{ ...WHOLE, origin: '' }])).toBeUndefined()
    expect(readTailnetHosts([{ ...WHOLE, origin: 7 }])).toBeUndefined()
  })

  it('refuses an empty id, which is what the picker addresses a machine by', () => {
    expect(readTailnetHosts([{ ...WHOLE, id: '' }])).toBeUndefined()
  })

  it('refuses a state that is not a boolean, because the picker acts on both', () => {
    // `authorized` gates whether pairing is offered at all; `paired` decides
    // whether the row opens the form or reports the host is already known. A
    // truthy string would read as true for both.
    expect(readTailnetHosts([{ ...WHOLE, authorized: 'yes' }])).toBeUndefined()
    expect(readTailnetHosts([{ ...WHOLE, paired: 1 }])).toBeUndefined()
  })

  it('refuses tags that are not all text, rather than drawing one of them', () => {
    expect(readTailnetHosts([{ ...WHOLE, tags: ['tag:dev', 7] }])).toBeUndefined()
    expect(readTailnetHosts([{ ...WHOLE, tags: 'tag:dev' }])).toBeUndefined()
  })

  it('refuses a machine missing the text the picker draws', () => {
    expect(readTailnetHosts([{ ...WHOLE, os: undefined }])).toBeUndefined()
    expect(readTailnetHosts([{ ...WHOLE, lastSeen: null }])).toBeUndefined()
  })
})

describe('the tailnet listing read whole', () => {
  it('reads an empty tailnet as an empty listing', () => {
    expect(readTailnetHosts([])).toEqual([])
  })

  it('refuses an answer that is not a listing', () => {
    expect(readTailnetHosts(WHOLE)).toBeUndefined()
    expect(readTailnetHosts(null)).toBeUndefined()
    expect(readTailnetHosts('laptop')).toBeUndefined()
  })

  it('refuses the whole listing when one machine is malformed', () => {
    // A tailnet silently short one machine is a machine an operator can see in
    // the Tailscale admin and not here, which reads as a machine that is gone.
    expect(readTailnetHosts([WHOLE, { ...WHOLE, id: 'n-2', authorized: 'yes' }])).toBeUndefined()
  })

  it('answers tags the caller holds separately from the ones it was handed', () => {
    // The shape is built rather than claimed, so a caller cannot reach back
    // into the answer the native side sent.
    const tags = ['tag:dev']
    const machines = readTailnetHosts([{ ...WHOLE, tags }])
    tags.push('tag:added')
    expect(machines?.[0]?.tags).toEqual(['tag:dev'])
  })
})
