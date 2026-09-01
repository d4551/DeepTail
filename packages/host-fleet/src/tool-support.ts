/**
 * Shared plumbing for the `sessions_*` tool definitions: session-id
 * admission, row projection, prompt delivery, and the follow-window preview.
 * Pure support code — every tool definition lives in its own module.
 *
 * @module @deeptail/host-fleet/tool-support
 */

import type { Context } from '@deepseek-ai/cordis'
import type {
  SessionHistoryRecord,
  SessionProjectionValue,
  SessionRequestId,
  SessionSummary,
} from '@deepseek-ai/dsh-api-session-controller/types'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { SessionId as SessionIdType } from '@deepseek-ai/dsh-session/types'
import type { FleetSendResult, FleetSessionSummary } from './types.ts'

/** The controller surface the fleet tools drive. */
export type FleetController = Context['sessionController']

/** Prompt delivery over the controller, guarded by the configured timeout. */
export type PromptSender = (sessionId: SessionIdType, text: string, mode: 'queue' | 'steer') => Promise<FleetSendResult>

/** The JSON value shape event payloads carry, spelled once by the controller. */
type WireValue = SessionProjectionValue

/** The JSON object member of {@link WireValue}; arrays and scalars are excluded. */
type JsonObject = Extract<WireValue, Record<string, WireValue>>

/**
 * Brand one freshly minted correlation id as a prompt identity. The controller
 * requires a client-minted `SessionRequestId`; the orchestrator is that client.
 * @param id - a fresh UUID.
 * @returns the same string with the prompt-identity brand.
 */
export function requestId(id: string): SessionRequestId {
  return id as SessionRequestId
}

/**
 * Project one controller row onto the orchestrator's reported view.
 * @param row - one `SessionSummary` from `sessionController.list`.
 * @returns the fields this package reports to the model.
 */
export function summarize(row: SessionSummary): FleetSessionSummary {
  const title = row.projections?.values.title
  return {
    sessionId: row.sessionId,
    running: row.running,
    blank: row.blank,
    updatedAt: row.updatedAt,
    ...(row.cwd === undefined ? {} : { cwd: row.cwd }),
    ...(typeof title === 'string' ? { title } : {}),
    ...(row.parentSessionId === undefined ? {} : { parentSessionId: row.parentSessionId }),
  }
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
 * Build the prompt sender the spawn and send tools share.
 * @param controller - the session controller to address.
 * @param timeoutMs - how long a delivered prompt may take to be admitted.
 * @returns a function admitting one prompt into a target session.
 */
export function createPromptSender(controller: FleetController, timeoutMs: number): PromptSender {
  return async (sessionId, text, mode) => {
    const id = requestId(crypto.randomUUID())
    await controller.prompt(
      {
        requestId: id,
        sessionId,
        mode,
        content: [{ type: 'text', text }],
      },
      AbortSignal.timeout(timeoutMs),
    )
    return { sessionId, mode, requestId: id }
  }
}

/**
 * Render the tail of a snapshot window as one line per surfaced message.
 * Pure and log-only: this runs on replay as well as live, so it reads nothing
 * but the records it was handed.
 * @param records - the snapshot window, oldest first.
 * @returns at most five trailing lines, each already truncated.
 */
export function recentLines(records: readonly SessionHistoryRecord[]): string[] {
  const lines: string[] = []
  for (const record of records) {
    const event = record.event
    if (event.type !== 'user/message' && event.type !== 'assistant/message') continue
    const role = event.type === 'user/message' ? 'user' : 'assistant'
    lines.push(`${role}: ${previewOf(event.data)}`)
  }
  return lines.slice(-5)
}

/**
 * One-line preview of a logged message.
 *
 * Reads the `text` of every `TextBlock` in the message content — `user/message`
 * carries its content directly, `assistant/message` nests it under `message` —
 * and joins them. Reasoning, images, and tool blocks are deliberately skipped:
 * this is the line a person scans in a session list.
 * @param data - the `user/message` or `assistant/message` event payload.
 * @returns a trimmed single-line preview, empty when the message carries no text.
 */
function previewOf(data: WireValue): string {
  const text = messageContent(data)
    .filter(isTextBlock)
    .map((block) => block.text)
    .join(' ')
  const collapsed = text.replaceAll(/\s+/gu, ' ').trim()
  return collapsed.length > 160 ? `${collapsed.slice(0, 157)}...` : collapsed
}

/**
 * The content array of a logged message payload, from either shape.
 * @param data - the event payload.
 * @returns the content blocks, or an empty list when the payload carries none.
 */
function messageContent(data: WireValue): readonly WireValue[] {
  if (!isJsonObject(data)) return []
  const direct = data.content
  if (Array.isArray(direct)) return direct
  const nested = data.message
  if (nested !== undefined && isJsonObject(nested) && Array.isArray(nested.content)) return nested.content
  return []
}

/** Whether a block is a text block carrying a string. */
function isTextBlock(block: WireValue): block is { type: 'text'; text: string } {
  return isJsonObject(block) && block.type === 'text' && typeof block.text === 'string'
}

/**
 * Whether a value is a plain object with JSON values, as opposed to an array
 * or a scalar.
 * @param value - the value to test.
 * @returns true when the value can be indexed by key.
 */
function isJsonObject(value: WireValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
