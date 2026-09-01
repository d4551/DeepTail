/**
 * Pure projections from controller data onto the values the fleet tools report:
 * one listed session row, and the tail of a followed session's snapshot window.
 *
 * @module @deeptail/host-fleet/session-projection
 */

import type { SessionHistoryRecord, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/types'
import type { JsonValue } from '@deepseek-ai/dsh-util-values'
import type { FleetSessionSummary } from './types.ts'

/** A JSON object as it can appear inside a logged event payload. */
type JsonObject = { readonly [key: string]: JsonValue }

/** A content block carrying text, as narrowed from the JSON wire form. */
interface TextBlock {
  readonly type: 'text'
  readonly text: string
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
function previewOf(data: JsonValue): string {
  const content = messageContent(data)
  const text = content
    .filter(
      (block): block is TextBlock =>
        isObject(block) && block.type === 'text' && typeof block.text === 'string',
    )
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
function messageContent(data: JsonValue): readonly JsonValue[] {
  if (!isObject(data)) return []
  const direct = data.content
  if (Array.isArray(direct)) return direct
  const nested = data.message
  if (isObject(nested) && Array.isArray(nested.content)) return nested.content
  return []
}

/**
 * Whether a JSON value is an object with string keys rather than an array.
 * @param value - the value to test.
 * @returns true when the value can be indexed by key.
 */
function isObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
