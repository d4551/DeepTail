/**
 * The guarded path from a model-supplied argument to `ctx.sessionController`:
 * what a tool must admit before it may address another session, and how a
 * prompt reaches that session once it has.
 *
 * @module @deeptail/host-fleet/session-access
 */

import type { SessionRequestId } from '@deepseek-ai/dsh-api-session-controller/types'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { SessionId as SessionIdType } from '@deepseek-ai/dsh-session/types'
import type { FleetController, FleetSendResult } from './types.ts'

/** One prompt this orchestrator is delivering to another session. */
interface FleetPrompt {
  /** Target session. */
  readonly sessionId: SessionIdType
  /** Already-trimmed prompt text. */
  readonly text: string
  /** Queue after the current work, or steer into the live turn. */
  readonly mode: 'queue' | 'steer'
}

/**
 * Brand one freshly minted correlation id as a prompt identity. The controller
 * requires a client-minted `SessionRequestId`; the orchestrator is that client.
 * @param id - a fresh UUID.
 * @returns the same string with the prompt-identity brand.
 */
function requestId(id: string): SessionRequestId {
  return id as SessionRequestId
}

/**
 * Admit a model-supplied session id.
 *
 * The harness treats a session id as opaque, so this validates what a tool
 * boundary can: a non-empty single-line token. Rejecting here keeps a malformed
 * argument from reaching the controller as a branded value it will trust.
 * @param raw - the `sessionId` argument exactly as the model supplied it.
 * @param tool - the calling tool, named in the failure message.
 * @returns the branded session id.
 */
export function admitSessionId(raw: string, tool: string): SessionIdType {
  const trimmed = raw.trim()
  if (trimmed === '' || /\s/u.test(trimmed)) {
    throw new Error(`${tool}: ${JSON.stringify(raw)} is not a session id`)
  }
  return SessionId(trimmed)
}

/**
 * Admit one text prompt into a target session.
 * @param controller - host session API that owns prompt admission.
 * @param prompt - the target, the text, and how it should be admitted.
 * @param timeoutMs - how long admission may take before the delivery is abandoned.
 * @returns the correlation the controller accepted.
 */
export async function sendPrompt(
  controller: FleetController,
  prompt: FleetPrompt,
  timeoutMs: number,
): Promise<FleetSendResult> {
  const id = requestId(crypto.randomUUID())
  await controller.prompt(
    {
      requestId: id,
      sessionId: prompt.sessionId,
      mode: prompt.mode,
      content: [{ type: 'text', text: prompt.text }],
    },
    AbortSignal.timeout(timeoutMs),
  )
  return { sessionId: prompt.sessionId, mode: prompt.mode, requestId: id }
}
