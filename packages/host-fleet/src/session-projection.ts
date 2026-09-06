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
type TextBlock = {
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
    .filter((block): block is TextBlock => isObject(block) && block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join(' ')
  const collapsed = text.replaceAll(/\s+/gu, ' ').trim()
  return collapsed.length > 160 ? `${collapsed.slice(0, 157)}...` : collapsed
}

/**
 * The content array of a logged message payload, from either shape.
 *
 * `user/message` carries its content directly and `assistant/message` nests it
 * under `message`; the direct shape is read first, so a payload carrying both
 * is read as the direct one. Anything else — a payload that is not an object, a
 * `content` that is not an array, a `message` that is not an object — carries
 * no content, and that is one answer written once rather than three.
 *
 * Exported because it is a contract of its own: the absent answer is an empty
 * list, and nothing observes the difference between that and a list of
 * something unreadable once the block filter has run.
 * @param data - the event payload.
 * @returns the content blocks, or an empty list when the payload carries none.
 */
export function messageContent(data: JsonValue): readonly JsonValue[] {
  const direct = isObject(data) ? data.content : undefined
  if (Array.isArray(direct)) return direct
  const nested = isObject(data) && isObject(data.message) ? data.message.content : undefined
  return Array.isArray(nested) ? nested : []
}

/**
 * Whether a JSON value is an object with string keys rather than an array.
 *
 * All three clauses carry weight and none is observable through the projections
 * alone: a string passes the other two, and reading a key off it answers
 * `undefined` rather than failing, so a payload or a block that is a string
 * would be admitted here and rejected one step later — silently, and for the
 * wrong reason. Exported so the predicate is checked where it is decided.
 *
 * An absent key answers here rather than at each call: a reader that had to
 * check for `undefined` before asking would be stating the same thing twice,
 * in as many places as it reads a key.
 * @param value - the value to test, or nothing where a key was absent.
 * @returns true when the value can be indexed by key.
 */
export function isObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
