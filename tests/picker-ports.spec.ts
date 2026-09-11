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
import { type HostRecord, isHostRecord } from '../apps/deeptail/src/host.ts'
import type { Invoke } from '../apps/deeptail/src/native-call.ts'
import { nativePorts, probeState, type Reach, settled } from '../apps/deeptail/src/picker-ports.ts'
import { messageOf } from '../apps/deeptail/src/reason.ts'
import type { JsonValue, WireValue } from '../apps/deeptail/src/wire.ts'
import { recorder } from './invoke-double.ts'

/** One paired host, as the registry sends one. */
const HOST: HostRecord = { id: 'a', label: 'Alpha', origin: 'https://alpha.ts.net' }

/** The same host as the wire carries it. */
const SENT: { [field: string]: JsonValue } = { id: 'a', label: 'Alpha', origin: 'https://alpha.ts.net' }

/** A native call that refuses every command, as one with no token stored does. */
const refusing: Invoke = () => Promise.reject(new Error('no token'))

/** A reach that answers as told, and records that it was asked. */
function reacher(answer: ReturnType<Reach>): { reach: Reach; reached: string[] } {
  const reached: string[] = []
  return {
    reach: (host) => {
      reached.push(host.id)
      return answer
    },
    reached,
  }
}

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
    // pairing on a laptop that is asleep. The absent code is named through a
    // list so the case reads as a value the probe is handed, not as a binding
    // that was never given one.
    const absent: readonly (string | undefined)[] = [undefined]
    expect(probeState(absent[0])).toBe('offline')
    expect(probeState('session-not-found')).toBe('offline')
    expect(probeState('')).toBe('offline')
  })
})

/**
 * What the listing did with one answer the registry sent.
 * @param answer - what the command answered with.
 * @returns the refusal's own words, or `read` when the answer was accepted.
 */
async function listing(answer: WireValue): Promise<string> {
  const [outcome] = await Promise.allSettled([nativePorts(recorder([answer]).call).listHosts()])
  return outcome.status === 'rejected' ? messageOf(outcome.reason) : 'read'
}

/**
 * What pairing did with one answer the registry sent.
 * @param answer - what the command answered with.
 * @returns the refusal's own words, or `read` when the answer was accepted.
 */
async function pairing(answer: WireValue): Promise<string> {
  const [outcome] = await Promise.allSettled([nativePorts(recorder([answer]).call).pairHost('link', 'label')])
  return outcome.status === 'rejected' ? messageOf(outcome.reason) : 'read'
}

/**
 * The host record with one of its fields left out.
 * @param field - the field to leave out.
 * @returns the record, short one field.
 */
function shortOf(field: string): { [name: string]: JsonValue } {
  return Object.fromEntries(Object.entries(SENT).filter(([name]) => name !== field))
}

describe('the commands the registry is read through', () => {
  it('lists the paired hosts, and reads each record by field', async () => {
    const { call, asked } = recorder([[SENT]])
    expect(await nativePorts(call).listHosts()).toEqual([HOST])
    expect(asked).toEqual([{ command: 'list_hosts' }])
  })

  it('pairs with the link and the label it was given, and reads the record back', async () => {
    const { call, asked } = recorder([SENT])
    expect(await nativePorts(call).pairHost('https://box.ts.net/?token=abc', 'Box')).toEqual(HOST)
    expect(asked).toEqual([{ command: 'pair_host', args: { link: 'https://box.ts.net/?token=abc', label: 'Box' } }])
  })

  it('refuses a record the registry should not have sent, and names the command', async () => {
    // Another process wrote it. A record with no origin would reach the picker
    // as a host nothing can be paired against, and a refusal that does not say
    // which command answered is one nobody can trace.
    const refused: readonly WireValue[] = [SENT, [{ id: 'a', label: 'Alpha' }], [7], 'a string']
    const outcomes = await Promise.all(refused.map(async (answer) => await listing(answer)))
    expect(outcomes).toEqual(refused.map(() => 'list_hosts answered outside the protocol'))
    const paired = await pairing('not a record')
    expect(paired).toBe('pair_host answered outside the protocol')
  })

  it('refuses each record missing any field the picker reads', async () => {
    const outcomes = await Promise.all(['id', 'label', 'origin'].map(async (field) => await listing([shortOf(field)])))
    expect(outcomes).toEqual(['id', 'label', 'origin'].map(() => 'list_hosts answered outside the protocol'))
    expect(await listing([SENT])).toBe('read')
  })
})

describe('what the roster’s dot is drawn from', () => {
  it('asks the registry for a token before it asks the host anything', async () => {
    const { call, asked } = recorder([undefined])
    const { reach, reached } = reacher(Promise.resolve([]))
    expect(await nativePorts(call, reach).hostState(HOST)).toBe('online')
    expect(asked).toEqual([{ command: 'select_host', args: { host: 'a' } }])
    expect(reached).toEqual(['a'])
  })

  it('draws a host with no token as unauthorised, without reaching it at all', async () => {
    const { reach, reached } = reacher(Promise.resolve([]))
    expect(await nativePorts(refusing, reach).hostState(HOST)).toBe('unauthorized')
    expect(reached).toEqual([])
  })

  it('reaches a host through the carrier when it is given no other way', async () => {
    // The default is the whole of how a host is asked whether it answers. In
    // this process there is no carrier to answer through, so the host is drawn
    // as one that did not answer — and a default that asked nothing at all
    // would draw every host as online.
    expect(await nativePorts(recorder([undefined]).call).hostState(HOST)).toBe('offline')
  })

  it('draws a host that did not answer by what the failure said', async () => {
    const outcomes = await Promise.all(
      [new RemoteError(UNAUTHORIZED, 'no'), new RemoteError(FORBIDDEN, 'no'), new Error('down')].map(async (reason) => {
        const { reach } = reacher(Promise.reject(reason))
        return await nativePorts(recorder([undefined]).call, reach).hostState(HOST)
      }),
    )
    expect(outcomes).toEqual(['unauthorized', 'forbidden', 'offline'])
  })
})

describe('the reader for one host record', () => {
  it('admits a record carrying every field, and refuses one carrying anything else', () => {
    // Field by field: a conjunction the wire can satisfy by halves is one that
    // lets a record through with a field the picker then reads as empty.
    expect(isHostRecord(SENT)).toBe(true)
    for (const field of ['id', 'label', 'origin']) {
      expect([field, isHostRecord(shortOf(field))]).toEqual([field, false])
      expect([field, isHostRecord({ ...SENT, [field]: 7 })]).toEqual([field, false])
    }
    expect(isHostRecord([SENT])).toBe(false)
    expect(isHostRecord('a string')).toBe(false)
    expect(isHostRecord(null)).toBe(false)
  })
})
