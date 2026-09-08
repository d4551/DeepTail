/**
 * The native surface the picker calls, and what its answers mean.
 *
 * Two decisions live here and nothing else does. Reading a promise as data is
 * what lets every caller branch on an outcome instead of catching; and what a
 * failed probe says about a host is what the roster's dot draws. Before the
 * probe existed, every unreachable host — a sleeping laptop, a dropped network
 * — was drawn as needing to be re-paired, which spends a working pairing on a
 * host that is simply down.
 */

import { describe, expect, it } from 'bun:test'
import { FORBIDDEN, RemoteError, UNAUTHORIZED } from '../apps/deeptail/src/api.ts'
import { probeState, settled } from '../apps/deeptail/src/picker-ports.ts'

describe('a promise read as data', () => {
  it('keeps the value when the work lands', async () => {
    expect(await settled(Promise.resolve(7))).toEqual({ ok: true, value: 7 })
  })

  it('keeps the message when the work fails, and the code when the host sent one', async () => {
    expect(await settled(Promise.reject(new RemoteError(FORBIDDEN, 'not yours')))).toEqual({
      ok: false,
      message: 'not yours',
      code: FORBIDDEN,
    })
  })

  it('carries no code for a failure that is not the host’s', async () => {
    // A code is the host's own account of a refusal. Inventing one for a
    // network failure would draw a reachable host as an unauthorised one.
    expect(await settled(Promise.reject(new Error('connection reset')))).toEqual({
      ok: false,
      message: 'connection reset',
      code: undefined,
    })
  })
})

describe('what a failed probe says about a host', () => {
  it('reads the host’s own refusals as what they are', () => {
    expect(probeState(UNAUTHORIZED)).toBe('unauthorized')
    expect(probeState(FORBIDDEN)).toBe('forbidden')
  })

  it('reads every other failure as unreachable rather than unpaired', () => {
    // The dot claims to report reachability. A host that did not answer is
    // down, not un-paired, and drawing it as un-paired spends a working
    // pairing on a laptop that is asleep.
    const absent: string | undefined = undefined
    expect(probeState(absent)).toBe('offline')
    expect(probeState('session-not-found')).toBe('offline')
    expect(probeState('')).toBe('offline')
  })
})
