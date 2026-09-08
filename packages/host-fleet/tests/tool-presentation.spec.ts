/**
 * What the five tools show a person: the text each result renders to, and the
 * card each call presents before it runs.
 *
 * Split from `tool-surface.spec.ts` when it outgrew the size the linter allows
 * a file. The declarations the model reads live there; what an operator reads
 * lives here, and neither was covered before: both renderers could have been
 * emptied with every suite still green, and that text is the only account of
 * what a tool did.
 */

import { describe, expect, it } from 'bun:test'
import type { GenericCallView } from '@deepseek-ai/dsh-tools'
import type { JsonValue } from '@deepseek-ai/dsh-util-values'
import type { FleetTool } from '../src/types.ts'
import { registerTools, script } from './controller-double.ts'

/** Every tool, registered once for the whole suite. */
const tools = registerTools(script())

/**
 * One registered tool.
 * @param name - the tool's name.
 * @returns its definition.
 */
function tool(name: string): FleetTool {
  const found = tools.get(name)
  if (found === undefined) throw new Error(`${name} was never registered`)
  return found
}

/**
 * What a tool's renderer produces for one value.
 *
 * The block's type is read as well as its text: a block typed as something the
 * surface does not draw carries its text nowhere, and reading the text alone
 * cannot tell the two apart.
 * @param name - the tool's name.
 * @param value - the value the execution returned.
 * @param args - the arguments the call was made with.
 * @returns the rendered text.
 */
function rendered(name: string, value: JsonValue, args: JsonValue = {}): string {
  const produced = tool(name).output.render(args, value)
  expect(produced.map((block) => block.type)).toEqual(produced.map(() => 'text'))
  expect(produced.length).toBeGreaterThan(0)
  return produced.map((block) => (block.type === 'text' ? block.text : '')).join('')
}

/**
 * The call card a tool presents for one set of arguments.
 *
 * A card is a tagged union, and only the generic arm carries the category and
 * the salient input these tools declare; a tool that presented a terminal or a
 * diff card refuses here rather than reading as a generic one with both absent.
 * @param name - the tool's name.
 * @param args - the arguments the call was made with.
 * @returns the card.
 */
function card(name: string, args: JsonValue): GenericCallView {
  const present = tool(name).presentCall
  if (present === undefined) throw new Error(`${name} presents no call card`)
  const view = present(args)
  if (view === undefined) throw new Error(`${name} presents no card for those arguments`)
  if (view.card !== 'generic') throw new Error(`${name} presents a ${view.card} card, not a generic one`)
  return view
}

describe('every tool renders its result for a person', () => {
  it('renders a session list one line per session, with the marker and the title', () => {
    expect(
      rendered('sessions_list', {
        total: 3,
        sessions: [
          { sessionId: 's-1', running: true, title: 'Fleet work' },
          { sessionId: 's-2', running: false },
        ],
      }),
    ).toBe('2 of 3 sessions:\n  s-1 [running] — Fleet work\n  s-2')
  })

  it('says so plainly when the host has no sessions at all', () => {
    expect(rendered('sessions_list', { total: 0, sessions: [] })).toBe('No sessions on this host.')
  })

  it('renders a followed session at its cut, with the window beneath it', () => {
    expect(
      rendered('sessions_follow', {
        sessionId: 's-1',
        cursor: 7,
        hasMore: true,
        records: 2,
        recent: ['user: ping', 'assistant: pong'],
      }),
    ).toBe('Session s-1 at seq 7 (2 records, more before this window).\nRecent:\n  user: ping\n  assistant: pong')
  })

  it('says nothing about a window that surfaced no message, and nothing about records before it', () => {
    expect(rendered('sessions_follow', { sessionId: 's-1', cursor: 0, hasMore: false, records: 0, recent: [] })).toBe(
      'Session s-1 at seq 0 (0 records).',
    )
  })

  it('renders what each acting tool did', () => {
    expect(rendered('sessions_spawn', { sessionId: 's-9' })).toBe('Spawned session s-9.')
    expect(rendered('sessions_send', { sessionId: 's-9', mode: 'steer' })).toBe('Delivered to s-9 (steer).')
    expect(rendered('sessions_cancel', { cancelled: true })).toBe('Cancellation requested.')
    expect(rendered('sessions_cancel', { cancelled: false })).toBe('Nothing to cancel.')
  })
})

describe('every tool presents its call before it runs', () => {
  it('titles a list by whether it was filtered', () => {
    expect(card('sessions_list', {})).toEqual({ card: 'generic', title: 'List sessions', kind: 'other' })
    expect(card('sessions_list', { runningOnly: true })).toEqual({
      card: 'generic',
      title: 'List running sessions',
      kind: 'other',
    })
    // Only `true` filters, so only `true` may retitle the card.
    expect(card('sessions_list', { runningOnly: false }).title).toBe('List sessions')
  })

  it('shows the text an acting call carries, so the operator reads it before it lands', () => {
    expect(card('sessions_spawn', { task: 'audit the tree' })).toEqual({
      card: 'generic',
      title: 'Spawn session',
      kind: 'other',
      rawInput: 'audit the tree',
    })
    expect(card('sessions_send', { sessionId: 's-2', message: 'stop' })).toEqual({
      card: 'generic',
      title: 'Message s-2',
      kind: 'other',
      rawInput: 'stop',
    })
  })

  it('names the session a reading or stopping call is about', () => {
    expect(card('sessions_cancel', { sessionId: 's-3' })).toEqual({
      card: 'generic',
      title: 'Cancel s-3',
      kind: 'other',
    })
    expect(card('sessions_follow', { sessionId: 's-4' })).toEqual({
      card: 'generic',
      title: 'Follow s-4',
      kind: 'other',
    })
  })
})
