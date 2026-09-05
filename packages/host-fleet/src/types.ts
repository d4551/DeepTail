/**
 * Wire and log vocabulary owned by the fleet orchestrator: the durable routing
 * event and the value shapes its tools return. Types only — a Client
 * compilation face reads exactly the signature the Host emits.
 *
 * @module @deeptail/host-fleet/types
 */

import type { SessionController } from '@deepseek-ai/dsh-api-session-controller'
import type { InvariantRegistry } from '@deepseek-ai/dsh-invariants'
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
 * `sessionController` narrows to the pick above, and the effect face narrows to
 * what registration needs: install this now, under this label. The full host
 * effect returns lifecycle disposals the tools never read, and its overloaded
 * signature is part of the host's own fiber — the real context is adapted to
 * this face in `index.ts`, where the host lives.
 */
export type FleetContext = {
  readonly sessionController: FleetController
  readonly tools: Pick<ToolRuntime, 'register'>
  readonly effect: (install: () => ReturnType<ToolRuntime['register']>, label: string) => null
}

/**
 * The context members the package invariant reads, and all it reads.
 *
 * Both faces narrow to the single member each: the invariant registry's
 * registration returns a plain disposer, so a test double implements it
 * directly; the real registry satisfies the pick by construction.
 * @see FleetContext for why the effect face is not narrowed the same way.
 */
export type InvariantContext = {
  readonly tools: Pick<ToolRuntime, 'get'>
  readonly invariants: Pick<InvariantRegistry, 'register'>
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
