/**
 * Typed calls to a host's Typert Remote surface, carried by Rust.
 *
 * The wire is the harness's own: a unary call is `POST /api/<namespace>/<method>`
 * carrying a `client-request` envelope whose payload is `{ args }`, and the
 * reply is a `server-response` envelope holding `{ ok, value }` or `{ ok, error }`.
 *
 * @module
 */

import type { CarrierHooks } from './transport.ts'
import { isSessionSummary, isWireObject, type WireObject, type WireValue } from './wire.ts'

/** The failure code a revoked or expired device token arrives with. */
export const UNAUTHORIZED = 'unauthorized'

/**
 * The failure code an authenticated request the host refuses arrives with.
 *
 * Separate from `UNAUTHORIZED` because the remedies differ and only one of them
 * exists: re-pairing replaces a token the host no longer accepts, and does
 * nothing at all for a token the host accepts but does not permit this of.
 */
export const FORBIDDEN = 'forbidden'

/** The failure code a reply that left the protocol arrives with. */
export const PROTOCOL = 'protocol'

/** The failure code a request that never reached the host arrives with. */
export const TRANSPORT = 'transport'

/** A failure the host reported, as opposed to one the transport produced. */
export class RemoteError extends Error {
  /** Host-supplied failure code, such as `session-not-found`. */
  readonly code: string

  /**
   * Host-supplied context. An unknown agent preset carries the ids the host
   * does have under `available`, which is the only place that list is published.
   */
  readonly details: WireObject

  /**
   * @param failureCode - the host's failure code.
   * @param failureMessage - the host's message.
   * @param failureDetails - the host's failure context, when it sent any.
   */
  constructor(failureCode: string, failureMessage: string, failureDetails: WireObject = {}) {
    super(failureMessage)
    this.name = 'RemoteError'
    this.code = failureCode
    this.details = failureDetails
  }
}

/**
 * One session as the roster lists it.
 *
 * A type alias rather than an interface: an alias carries the implicit index
 * signature that lets a row travel as a wire value without a cast.
 */
export type SessionSummary = {
  readonly sessionId: string
  readonly updatedAt: number
  readonly running: boolean
  readonly blank: boolean
  readonly cwd?: string
  readonly parentSessionId?: string
  readonly projections?: { readonly values?: { readonly title?: string } }
}

/** The arguments `session/create` carries. */
type CreateSessionInput = {
  readonly cwd?: string
  readonly agentPreset?: string
}

/**
 * The subset of a host's Remote surface DeepTail drives.
 *
 * Every method here is unary, which is why the control plane works over the
 * plain HTTP carrier. Reading a conversation needs `session.follow`, a stream,
 * and belongs to the harness's own client.
 */
export interface HostApi {
  listSessions(): Promise<readonly SessionSummary[]>
  prompt(sessionId: string, text: string, mode: 'queue' | 'steer'): Promise<void>
  cancel(sessionId: string): Promise<void>
  createSession(input: CreateSessionInput): Promise<string>
}

/**
 * Build a host API over a carrier.
 * @param carrier - the transport reaching one paired host.
 * @returns the callable Remote surface.
 */
export function createHostApi(carrier: CarrierHooks): HostApi {
  let correlation = 0

  /**
   * Perform one unary call, correlated within this host's surface so a reply
   * can be matched to the request that produced it.
   * @param namespace - the Remote namespace, such as `session`.
   * @param method - the method on it.
   * @param args - the method's arguments.
   * @returns whatever the method returned.
   */
  const call = async (
    namespace: string,
    method: string,
    args: Readonly<Record<string, WireValue>>,
  ): Promise<WireValue | undefined> => {
    correlation += 1
    const endpoint = `${namespace}/${method}`
    const envelope = await post(carrier, endpoint, `deeptail-${String(correlation)}`, args)
    return unwrap(envelope, endpoint)
  }

  return {
    async listSessions() {
      const value = await call('session', 'list', {})
      if (!isWireObject(value) || !Array.isArray(value.items)) {
        throw malformed('session/list', 'no items')
      }
      return value.items.filter(isSessionSummary)
    },
    async prompt(sessionId, text, mode) {
      await call('session', 'prompt', {
        requestId: crypto.randomUUID(),
        sessionId,
        mode,
        content: [{ type: 'text', text }],
      })
    },
    async cancel(sessionId) {
      await call('session', 'cancel', { sessionId })
    },
    async createSession(input) {
      const value = await call('session', 'create', { ...input })
      if (!isWireObject(value) || typeof value.sessionId !== 'string') {
        throw malformed('session/create', 'no id')
      }
      return value.sessionId
    },
  }
}

/**
 * The failure a reply that names nothing the method promises is reported as.
 * @param endpoint - `<namespace>/<method>`.
 * @param detail - what the answer lacked.
 * @returns the failure to raise.
 */
function malformed(endpoint: string, detail: string): RemoteError {
  return new RemoteError(PROTOCOL, `${endpoint} returned no usable answer`, { endpoint, detail })
}

/**
 * Send one `client-request` envelope and read the reply's result field.
 * @param carrier - the transport reaching one paired host.
 * @param endpoint - `<namespace>/<method>`.
 * @param rpcId - what the reply is correlated by.
 * @param args - the method's arguments.
 * @returns the `result` field of the `server-response` envelope.
 */
async function post(
  carrier: CarrierHooks,
  endpoint: string,
  rpcId: string,
  args: Readonly<Record<string, WireValue>>,
): Promise<WireObject> {
  const response = await carrier.send(new URL(`/api/${endpoint}`, 'http://dsh.internal'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'client-request',
      rpcId,
      method: endpoint,
      payload: { args },
    }),
  })
  if (!response.ok) throw transportFailure(endpoint, response.status)
  const envelope: WireValue = await response.json()
  if (!isWireObject(envelope) || !isWireObject(envelope.result)) throw malformed(endpoint, 'no result')
  return envelope.result
}

/**
 * The failure an HTTP-level rejection is reported as.
 *
 * A revoked or expired device token is the one failure the operator can act on,
 * so it is reported apart from a plain outage.
 * @param endpoint - `<namespace>/<method>`.
 * @param status - the status the host answered with.
 * @returns the failure to raise.
 */
function transportFailure(endpoint: string, status: number): RemoteError {
  const message = `${endpoint} returned HTTP ${String(status)}`
  const details: WireObject = { endpoint, status }
  if (status === 401) return new RemoteError(UNAUTHORIZED, message, details)
  if (status === 403) return new RemoteError(FORBIDDEN, message, details)
  return new RemoteError(TRANSPORT, message, details)
}

/**
 * Read a reply, raising the host's own failure when it carries one so its code
 * and details reach the caller intact.
 * @param result - the envelope's `result` field.
 * @param endpoint - `<namespace>/<method>`.
 * @returns whatever the method returned.
 */
function unwrap(result: WireObject, endpoint: string): WireValue | undefined {
  if (result.ok !== true) {
    const error = isWireObject(result.error) ? result.error : {}
    const code = typeof error.code === 'string' ? error.code : 'internal'
    const message = typeof error.message === 'string' ? error.message : `${endpoint} failed`
    throw new RemoteError(code, message, isWireObject(error.details) ? error.details : { endpoint })
  }
  return result.value
}
