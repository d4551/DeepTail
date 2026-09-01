/**
 * Unit coverage for the pure projections the fleet tools report: one listed
 * session row and the tail of a followed session's snapshot window.
 */

import { expect, it } from 'bun:test'
import type { SessionHistoryRecord, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/types'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { JsonValue } from '@deepseek-ai/dsh-util-values'
import { recentLines, summarize } from '../src/session-projection.ts'

/** One event record whose payload is already JSON. */
function record(type: string, data: JsonValue): SessionHistoryRecord {
  return { type: 'event', event: { type, seq: 0, time: 0, data } }
}

/** A full row with every optional field present. */
const fullRow: SessionSummary = {
  sessionId: SessionId('s-1'),
  running: true,
  blank: false,
  updatedAt: 12,
  cwd: '/tmp',
  parentSessionId: SessionId('root'),
  projections: { asOfSeq: 3, values: { title: 'Fleet work' } },
}

/** A row whose optional fields are all absent. */
const leanRow: SessionSummary = {
  sessionId: SessionId('s-2'),
  running: false,
  blank: true,
  updatedAt: 0,
}

it('projects a controller row, keeping only present optional fields', () => {
  expect(summarize(fullRow)).toEqual({
    sessionId: SessionId('s-1'),
    running: true,
    blank: false,
    updatedAt: 12,
    cwd: '/tmp',
    title: 'Fleet work',
    parentSessionId: SessionId('root'),
  })
})

it('omits every optional field the row leaves unset', () => {
  const summary = summarize(leanRow)
  expect(summary).toEqual({
    sessionId: SessionId('s-2'),
    running: false,
    blank: true,
    updatedAt: 0,
  })
  expect('cwd' in summary).toBe(false)
  expect('title' in summary).toBe(false)
  expect('parentSessionId' in summary).toBe(false)
})

it('renders user content directly and assistant content nested under message', () => {
  const records = [
    record('user/message', { content: [{ type: 'text', text: 'hello' }] }),
    record('assistant/message', { message: { content: [{ type: 'text', text: 'hi back' }] } }),
  ]
  expect(recentLines(records)).toEqual(['user: hello', 'assistant: hi back'])
})

it('skips non-text blocks and non-message events entirely', () => {
  const records = [
    record('tool/message', {}),
    record('user/message', {
      content: [
        { type: 'image', mediaType: 'image/png', data: 'eHl6' },
        { type: 'text', text: 'see this' },
      ],
    }),
  ]
  expect(recentLines(records)).toEqual(['user: see this'])
})

it('collapses whitespace and truncates a long preview with an ellipsis', () => {
  const long = `a\n${'b'.repeat(200)}   c`
  const lines = recentLines([record('user/message', { content: [{ type: 'text', text: long }] })])
  const line = lines[0] ?? ''
  expect(line.startsWith('user: a b')).toBe(true)
  expect(line.endsWith('...')).toBe(true)
  expect(line.length).toBe('user: '.length + 160)
})

it('keeps only the five most recent message lines', () => {
  const records = Array.from({ length: 7 }, (_, index) =>
    record('user/message', { content: [{ type: 'text', text: `m${String(index)}` }] }),
  )
  expect(recentLines(records)).toEqual(['user: m2', 'user: m3', 'user: m4', 'user: m5', 'user: m6'])
})

it('yields no lines for an empty or message-less window', () => {
  expect(recentLines([])).toEqual([])
  expect(recentLines([record('tool/message', {})])).toEqual([])
})
