/**
 * The typed calls to a host's Remote surface, driven through a carrier double.
 *
 * Every method here is one envelope out and one envelope back, so the whole
 * surface is reachable without a host: the double answers with the envelope a
 * host would, and the assertions read what was sent and what was raised. The
 * failure paths are the point — a malformed reply, an HTTP rejection and a
 * host-reported failure each reach the caller as a different error, and only
 * the code and details tell them apart.
 */

import { describe, expect, it } from 'bun:test'
import { createHostApi, FORBIDDEN, PROTOCOL, RemoteError, TRANSPORT, UNAUTHORIZED } from '../apps/deeptail/src/api.ts'
import type { CarrierHooks } from '../apps/deeptail/src/transport.ts'
import type { WireValue } from '../apps/deeptail/src/wire.ts'

/** The `client-request` envelope the surface posts, as this double reads it back. */
interface RequestEnvelope {
  readonly type: string
  readonly rpcId: string
  readonly method: string
  readonly payload: { readonly args: Record<string, WireValue> }
}

/** The `server-response` envelope a host answers with, as this double builds it. */
interface ReplyEnvelope {
  readonly type: string
  readonly rpcId: string
  readonly result:
    | { readonly ok: true; readonly value?: WireValue }
    | {
        readonly ok: false
        readonly error?: {
          readonly code: string
          readonly message: string
          readonly details: Record<string, WireValue>
        }
      }
}

/** What the double recorded of one send. */
interface Sent {
  /** The path the envelope was posted to. */
  readonly path: string
  /** The envelope body, read back into the shape the surface writes. */
  readonly body: RequestEnvelope
}

/** What the double's mux socket recorded of its own short life. */
interface MuxRecord {
  sent: string[]
  closed: number
}

/**
 * A carrier that answers every send with the envelope given, recording what
 * was posted.
 * @param status - the status to answer with.
 * @param reply - the reply body.
 * @returns the hooks, what was sent so far, and the mux socket's record.
 */
function carrierDouble(status: number, reply: ReplyEnvelope): { hooks: CarrierHooks; sent: Sent[]; mux: MuxRecord } {
  const sent: Sent[] = []
  const mux: MuxRecord = { sent: [], closed: 0 }
  const hooks: CarrierHooks = {
    send: (input, init) => {
      const body: RequestEnvelope = JSON.parse(String(init.body))
      sent.push({ path: input.pathname, body })
      return Promise.resolve(
        new Response(JSON.stringify(reply), { status, headers: { 'content-type': 'application/json' } }),
      )
    },
    loadBundle: () => Promise.resolve(),
    openMuxSocket: () =>
      Object.assign(new EventTarget(), {
        readyState: 0,
        send: (data: string) => {
          mux.sent.push(data)
        },
        close: () => {
          mux.closed += 1
        },
      }),
    suspendMuxSocket: () => {
      mux.closed += 1
    },
  }
  return { hooks, sent, mux }
}

/**
 * The envelope a host answers a successful call with.
 * @param result - the result field, absent for a method that returns nothing.
 * @returns the reply body.
 */
function ok(result?: WireValue): ReplyEnvelope {
  return { type: 'server-response', rpcId: '0', result: { ok: true, value: result } }
}

/**
 * The envelope a host answers a failed call with.
 * @param code - the failure code.
 * @param message - the failure message.
 * @param details - anything else the host included.
 * @returns the reply body.
 */
function failed(code: string, message: string, details: Record<string, WireValue> = {}): ReplyEnvelope {
  return { type: 'server-response', rpcId: '0', result: { ok: false, error: { code, message, details } } }
}

/**
 * Read one call's outcome as data: the RemoteError it failed with.
 * @param call - the call expected to fail.
 * @returns the failure, or undefined when the call answered instead.
 */
async function refusalOf<T>(call: Promise<T>): Promise<RemoteError | undefined> {
  const [outcome] = await Promise.allSettled([call])
  return outcome.status === 'rejected' && outcome.reason instanceof RemoteError ? outcome.reason : undefined
}

/** One roster row with every field the summary reads. */
const ROW = {
  sessionId: 's-1',
  updatedAt: 12,
  running: true,
  blank: false,
  projections: { values: { title: 'Fleet work' } },
}

describe('listing sessions', () => {
  it('returns the rows the host sent, dropping any that name no session', async () => {
    const { hooks } = carrierDouble(200, ok({ items: [ROW, { sessionId: 7 }, 'noise', null] }))
    const api = createHostApi(hooks)
    expect(await api.listSessions()).toEqual([ROW])
  })

  it('refuses a reply that carries no items list, naming the endpoint', async () => {
    const { hooks } = carrierDouble(200, ok({}))
    const failure = await refusalOf(createHostApi(hooks).listSessions())
    expect(failure?.code).toBe(PROTOCOL)
    expect(failure?.details['endpoint']).toBe('session/list')
    expect(failure?.details['detail']).toBe('no items')
  })

  it('refuses a reply that is no envelope at all', async () => {
    const { hooks } = carrierDouble(200, { type: 'server-response', rpcId: '0', result: { ok: true, value: null } })
    const failure = await refusalOf(createHostApi(hooks).listSessions())
    expect(failure?.code).toBe(PROTOCOL)
  })
})

describe('directing a session', () => {
  it('sends a prompt as the content list the host reads, with a fresh correlation', async () => {
    const { hooks, sent } = carrierDouble(200, ok())
    await createHostApi(hooks).prompt('s-1', 'please rerun the tests', 'queue')
    expect(sent.length).toBe(1)
    expect(sent[0]?.path).toBe('/api/session/prompt')
    expect(sent[0]?.body.payload.args['sessionId']).toBe('s-1')
    expect(sent[0]?.body.payload.args['mode']).toBe('queue')
    expect(sent[0]?.body.payload.args['content']).toEqual([{ type: 'text', text: 'please rerun the tests' }])
    expect(typeof sent[0]?.body.payload.args['requestId']).toBe('string')
  })

  it('correlates each call with a fresh id, so two prompts never share one', async () => {
    const { hooks, sent } = carrierDouble(200, ok())
    const api = createHostApi(hooks)
    await api.prompt('s-1', 'first', 'queue')
    await api.prompt('s-1', 'second', 'steer')
    expect(sent[0]?.body.payload.args['requestId']).not.toBe(sent[1]?.body.payload.args['requestId'])
  })

  it('sends a cancellation naming the session alone', async () => {
    const { hooks, sent } = carrierDouble(200, ok())
    await createHostApi(hooks).cancel('s-1')
    expect(sent[0]?.path).toBe('/api/session/cancel')
    expect(sent[0]?.body.payload.args).toEqual({ sessionId: 's-1' })
  })

  it('returns the id a created session carries', async () => {
    const { hooks } = carrierDouble(200, ok({ sessionId: 's-new' }))
    expect(await createHostApi(hooks).createSession({ cwd: '/srv/work', agentPreset: 'ptc' })).toBe('s-new')
  })

  it('refuses a creation reply that names no id', async () => {
    const { hooks } = carrierDouble(200, ok({}))
    const failure = await refusalOf(createHostApi(hooks).createSession({}))
    expect(failure?.code).toBe(PROTOCOL)
    expect(failure?.details['endpoint']).toBe('session/create')
  })
})

describe('what an HTTP rejection is reported as', () => {
  it('reports a revoked token as unauthorized, the one failure re-pairing answers', async () => {
    const { hooks } = carrierDouble(401, ok())
    const failure = await refusalOf(createHostApi(hooks).listSessions())
    expect(failure?.code).toBe(UNAUTHORIZED)
    expect(failure?.message).toBe('session/list returned HTTP 401')
  })

  it('reports a refused request as forbidden, which re-pairing does not answer', async () => {
    const { hooks } = carrierDouble(403, ok())
    const failure = await refusalOf(createHostApi(hooks).listSessions())
    expect(failure?.code).toBe(FORBIDDEN)
  })

  it('reports every other status as a transport failure, with the status named', async () => {
    const { hooks } = carrierDouble(503, ok())
    const failure = await refusalOf(createHostApi(hooks).listSessions())
    expect(failure?.code).toBe(TRANSPORT)
    expect(failure?.details['status']).toBe(503)
  })
})

describe('what a host-reported failure carries', () => {
  it('raises the host’s own code, message and details intact', async () => {
    const { hooks } = carrierDouble(
      200,
      failed('agent-preset-not-found', 'no such preset', { available: ['standard'] }),
    )
    const failure = await refusalOf(createHostApi(hooks).createSession({ agentPreset: 'nope' }))
    expect(failure?.code).toBe('agent-preset-not-found')
    expect(failure?.message).toBe('no such preset')
    expect(failure?.details['available']).toEqual(['standard'])
  })

  it('fills the protocol defaults in for a failure that names neither code nor message', async () => {
    const { hooks } = carrierDouble(200, { type: 'server-response', rpcId: '0', result: { ok: false } })
    const failure = await refusalOf(createHostApi(hooks).listSessions())
    expect(failure?.code).toBe('internal')
    expect(failure?.message).toBe('session/list failed')
    // The endpoint is the one detail the transport can supply itself.
    expect(failure?.details['endpoint']).toBe('session/list')
  })
})
