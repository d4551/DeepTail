/**
 * Wire and log vocabulary owned by the fleet orchestrator: the durable routing
 * event and the value shapes its tools return. Types only — a Client
 * compilation face reads exactly the signature the Host emits.
 *
 * @module @deeptail/host-fleet/types
 */

import type { SessionId } from '@deepseek-ai/dsh-session/types'

/** Why the orchestrator directed work at one session. */
export type FleetRouteReason = 'spawned' | 'delegated' | 'resumed' | 'user-request'

/**
 * One session the orchestrator can see, projected from the controller's
 * `SessionSummary`. Title is not a field on that row — it arrives through the
 * `title` projection hint, which is absent until the cache holds one, so this
 * view reports it as optional rather than inventing a placeholder.
 */
export interface FleetSessionSummary {
  readonly sessionId: SessionId
  /** Whether an Agent is live for this session right now. */
  readonly running: boolean
  /** Whether the session has no committed turn yet. */
  readonly blank: boolean
  /** Epoch milliseconds of the last committed session event. */
  readonly updatedAt: number
  /** Working directory from the session header; absent when the session recorded none. */
  readonly cwd?: string
  /** Projected session title when the projection cache already holds one. */
  readonly title?: string
  /** Parent session when this row is a delegated child. */
  readonly parentSessionId?: SessionId
}

/** Outcome of directing a prompt at another session. */
export interface FleetSendResult {
  readonly sessionId: SessionId
  /** How the prompt was admitted: appended to the queue, or steered into the live turn. */
  readonly mode: 'queue' | 'steer'
  /** Caller-visible correlation for the admitted prompt. */
  readonly requestId: string
}

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /**
     * The orchestrator directed work at another session. Logged because the
     * routing decision is model-visible on replay: without it a resumed
     * transcript cannot explain why a child session exists. Whole-value
     * append; there is no fold.
     */
    'fleet/route': {
      readonly target: SessionId
      readonly reason: FleetRouteReason
      /** The prompt text as admitted, already trimmed to the tool's limit. */
      readonly prompt: string
    }
  }
}
