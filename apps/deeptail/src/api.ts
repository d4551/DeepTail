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
  readonly details: Readonly<Record<string, unknown>>

  /**
   * @param code - the host's failure code.
   * @param message - the host's message.
   * @param details - the host's failure context, when it sent any.
   */
  constructor(code: string, message: string, details: Readonly<Record<string, unknown>> = {}) {
    super(message)
    this.name = 'RemoteError'
    this.code = code
    this.details = details
  }
}

/** One session as the roster lists it. */
export interface SessionSummary {
  readonly sessionId: string
  readonly updatedAt: number
  readonly running: boolean
  readonly blank: boolean
  readonly cwd?: string
  readonly parentSessionId?: string
  readonly projections?: { readonly values?: { readonly title?: string } }
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
  createSession(input: { cwd?: string; agentPreset?: string }): Promise<string>
}

/** Minimal shape of a `server-response` envelope. */
interface ServerResponse {
  readonly result?: {
    readonly ok?: boolean
    readonly value?: unknown
    readonly error?: { code?: string; message?: string; details?: Record<string, unknown> }
  }
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
  const call = async (namespace: string, method: string, args: Readonly<Record<string, unknown>>): Promise<unknown> => {
    correlation += 1
    const endpoint = `${namespace}/${method}`
    const envelope = await post(carrier, endpoint, `deeptail-${String(correlation)}`, args)
    return unwrap(envelope, endpoint)
  }

  return {
    async listSessions() {
      const value = (await call('session', 'list', {})) as { items?: readonly SessionSummary[] }
      return value.items ?? []
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
      const value = (await call('session', 'create', input)) as { sessionId?: string }
      if (value.sessionId === undefined) {
        throw new RemoteError(PROTOCOL, 'session/create returned no id', {
          endpoint: 'session/create',
          detail: 'no id',
        })
      }
      return value.sessionId
    },
  }
}

/**
 * Send one `client-request` envelope and read the reply.
 * @param carrier - the transport reaching one paired host.
 * @param endpoint - `<namespace>/<method>`.
 * @param rpcId - what the reply is correlated by.
 * @param args - the method's arguments.
 * @returns the `server-response` envelope the host sent back.
 */
async function post(
  carrier: CarrierHooks,
  endpoint: string,
  rpcId: string,
  args: Readonly<Record<string, unknown>>,
): Promise<ServerResponse> {
  const response = await carrier.fetch(new URL(`/api/${endpoint}`, 'http://dsh.internal'), {
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
  return (await response.json()) as ServerResponse
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
  const details = { endpoint, status }
  if (status === 401) return new RemoteError(UNAUTHORIZED, message, details)
  if (status === 403) return new RemoteError(FORBIDDEN, message, details)
  return new RemoteError(TRANSPORT, message, details)
}

/**
 * Read a reply, raising the host's own failure when it carries one so its code
 * and details reach the caller intact.
 * @param envelope - the reply.
 * @param endpoint - `<namespace>/<method>`.
 * @returns whatever the method returned.
 */
function unwrap(envelope: ServerResponse, endpoint: string): unknown {
  const result = envelope.result
  if (result === undefined) {
    throw new RemoteError(PROTOCOL, `${endpoint} returned no result`, { endpoint, detail: 'no result' })
  }
  if (result.ok !== true) {
    throw new RemoteError(result.error?.code ?? 'internal', result.error?.message ?? `${endpoint} failed`, {
      endpoint,
      ...result.error?.details,
    })
  }
  return result.value
}
