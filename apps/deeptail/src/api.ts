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

/** A failure the host reported, as opposed to one the transport produced. */
class RemoteError extends Error {
  /** Host-supplied failure code, such as `session-not-found`. */
  readonly code: string

  /**
   * @param code - the host's failure code.
   * @param message - the host's message.
   */
  constructor(code: string, message: string) {
    super(message)
    this.name = 'RemoteError'
    this.code = code
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

/** One agent preset a new session may be composed from. */
export interface AgentPreset {
  readonly id: string
  readonly name: string
  readonly description?: string
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
  listPresets(): Promise<readonly AgentPreset[]>
  prompt(sessionId: string, text: string, mode: 'queue' | 'steer'): Promise<void>
  cancel(sessionId: string): Promise<void>
  createSession(input: { cwd?: string; agentPreset?: string }): Promise<string>
}

/** Minimal shape of a `server-response` envelope. */
interface ServerResponse {
  readonly result?: {
    readonly ok?: boolean
    readonly value?: unknown
    readonly error?: { code?: string; message?: string }
  }
}

/**
 * Build a host API over a carrier.
 * @param carrier - the transport reaching one paired host.
 * @returns the callable Remote surface.
 */
export function createHostApi(carrier: CarrierHooks): HostApi {
  let correlation = 0

  const call = async (namespace: string, method: string, args: Readonly<Record<string, unknown>>): Promise<unknown> => {
    correlation += 1
    const endpoint = `${namespace}/${method}`
    const response = await carrier.fetch(new URL(`/api/${endpoint}`, 'http://dsh.internal'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'client-request',
        rpcId: `deeptail-${String(correlation)}`,
        method: endpoint,
        payload: { args },
      }),
    })
    if (!response.ok) throw new RemoteError('transport', `${endpoint} returned HTTP ${String(response.status)}`)
    const envelope = (await response.json()) as ServerResponse
    const result = envelope.result
    if (result === undefined) throw new RemoteError('protocol', `${endpoint} returned no result`)
    if (result.ok !== true) {
      throw new RemoteError(result.error?.code ?? 'internal', result.error?.message ?? `${endpoint} failed`)
    }
    return result.value
  }

  return {
    async listSessions() {
      const value = (await call('session', 'list', {})) as { items?: readonly SessionSummary[] }
      return value.items ?? []
    },
    async listPresets() {
      const value = (await call('agentPresets', 'list', {})) as { items?: readonly AgentPreset[] }
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
      if (value.sessionId === undefined) throw new RemoteError('protocol', 'session/create returned no id')
      return value.sessionId
    },
  }
}
