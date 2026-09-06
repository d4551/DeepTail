/**
 * Unit coverage for the pure projections the fleet tools report: one listed
 * session row and the tail of a followed session's snapshot window.
 */

import { expect, it } from 'bun:test'
import type { SessionHistoryRecord, SessionSummary } from '@deepseek-ai/dsh-api-session-controller/types'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { JsonValue } from '@deepseek-ai/dsh-util-values'
import { isObject, messageContent, recentLines, summarize } from '../src/session-projection.ts'

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

it('skips a block that carries text under another type', () => {
  // Reasoning is deliberately not surfaced: the preview is the line a person
  // scans, and a filter that read every block would put a model's private
  // working into it.
  const records = [
    record('assistant/message', {
      message: {
        content: [
          { type: 'reasoning', text: 'private working' },
          { type: 'text', text: 'the answer' },
        ],
      },
    }),
  ]
  expect(recentLines(records)).toEqual(['assistant: the answer'])
})

it('skips a block that is not an object, and one whose text is not a string', () => {
  const records = [
    record('user/message', {
      content: ['loose string', 42, null, { type: 'text', text: 7 }, { type: 'text', text: 'kept' }],
    }),
  ]
  expect(recentLines(records)).toEqual(['user: kept'])
})

it('joins two text blocks with a space rather than running them together', () => {
  const records = [
    record('user/message', {
      content: [
        { type: 'text', text: 'one' },
        { type: 'text', text: 'two' },
      ],
    }),
  ]
  expect(recentLines(records)).toEqual(['user: one two'])
})

it('collapses a run of whitespace to one space and trims the ends', () => {
  const records = [record('user/message', { content: [{ type: 'text', text: '  a  \t b  ' }] })]
  expect(recentLines(records)).toEqual(['user: a b'])
})

it('truncates at the character after the limit, not at the limit itself', () => {
  // The boundary is where an off-by-one lives: 160 characters is a preview
  // that fits, and 161 is the first that does not.
  const fits = 'x'.repeat(160)
  expect(recentLines([record('user/message', { content: [{ type: 'text', text: fits }] })])).toEqual([`user: ${fits}`])
  const over = recentLines([record('user/message', { content: [{ type: 'text', text: 'x'.repeat(161) }] })])
  expect(over).toEqual([`user: ${'x'.repeat(157)}...`])
})

it('reads no content out of a payload that carries none', () => {
  const payloads: JsonValue[] = [
    null,
    'a string payload',
    42,
    ['an array payload'],
    {},
    { content: 'not an array' },
    { message: 'not an object' },
    { message: null },
    { message: { content: 'not an array' } },
    { message: {} },
  ]
  const lines = payloads.map((data) => recentLines([record('user/message', data)]))
  expect(lines).toEqual(payloads.map(() => ['user: ']))
})

it('reads the nested shape only when the direct one is absent', () => {
  // A payload carrying both is the assistant shape wrapped around a direct
  // one; the direct content wins, which is what the reader's order says.
  const both = record('assistant/message', {
    content: [{ type: 'text', text: 'direct' }],
    message: { content: [{ type: 'text', text: 'nested' }] },
  })
  expect(recentLines([both])).toEqual(['assistant: direct'])
})

it('reads the content array out of either payload shape, and nothing out of any other', () => {
  const blocks = [{ type: 'text', text: 'x' }]
  expect(messageContent({ content: blocks })).toEqual(blocks)
  expect(messageContent({ message: { content: blocks } })).toEqual(blocks)
  // The direct shape wins where a payload carries both.
  expect(messageContent({ content: blocks, message: { content: [{ type: 'text', text: 'y' }] } })).toEqual(blocks)
})

it('answers an empty list for every payload that carries no content array', () => {
  // Stated here rather than only through the preview: once the block filter has
  // run, an empty list and a list of something unreadable look alike, so this
  // is the only place the absent answer is observable.
  const carriesNone: JsonValue[] = [
    null,
    'a string payload',
    42,
    true,
    ['an array payload'],
    {},
    { content: 'not an array' },
    { content: null },
    { message: 'not an object' },
    { message: null },
    { message: ['an array message'] },
    { message: { content: 'not an array' } },
    { message: {} },
  ]
  expect(carriesNone.map((data) => messageContent(data))).toEqual(carriesNone.map(() => []))
})

it('admits only a value that can be indexed by key', () => {
  // The typeof clause is what keeps a string out: it passes the other two, and
  // reading a key off it answers undefined rather than failing, so without it a
  // string would be admitted here and rejected a step later for the wrong
  // reason.
  expect([{}, { a: 1 }, { type: 'text' }].map((value) => isObject(value))).toEqual([true, true, true])
  const notObjects: (JsonValue | undefined)[] = ['', 'text', 42, 0, true, false, null, [], [1], undefined]
  expect(notObjects.map((value) => isObject(value))).toEqual(notObjects.map(() => false))
})
