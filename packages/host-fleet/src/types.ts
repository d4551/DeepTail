/**
 * Wire and log vocabulary owned by the fleet orchestrator: the durable routing
 * event and the value shapes its tools return. Types only — a Client
 * compilation face reads exactly the signature the Host emits.
 *
 * @module @deeptail/host-fleet/types
 */

import type { Context } from '@deepseek-ai/cordis'
import type { SessionController } from '@deepseek-ai/dsh-api-session-controller'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ToolRuntime } from '@deepseek-ai/dsh-tools'

/**
 * The session-controller members the fleet tools drive, and all they drive.
 *
 * A pick of the host's own controller type, so the real service satisfies it by
 * construction and a test double implements exactly the surface the tools can
 * reach — no wider, and no conversion across it.
 */
export type FleetController = Pick<SessionController, 'list' | 'follow' | 'create' | 'prompt' | 'cancel'>

/**
 * The context members the fleet tools read, and all they read.
 *
 * `sessionController` is narrowed from the host's full controller to the pick
 * above; the registry and effect surfaces travel as the host declares them, so
 * the real context satisfies this by construction and the suites implement it
 * directly.
 */
export type FleetContext = Pick<Context, 'effect'> & {
  readonly sessionController: FleetController
  readonly tools: Pick<ToolRuntime, 'register'>
}

/**
 * The context members the package invariant reads, and all it reads.
 *
 * @see FleetContext for why the registry travels as the host declares it while
 * the tools narrow to the one lookup the check performs.
 */
export type InvariantContext = Pick<Context, 'invariants'> & {
  readonly tools: Pick<ToolRuntime, 'get'>
}

/**
 * One session the orchestrator can see, projected from the controller's
 * `SessionSummary`. Title is not a field on that row — it arrives through the
 * `title` projection hint, which is absent until the cache holds one, so this
 * view carries it as optional.
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
