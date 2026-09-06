/**
 * The two tools that read: what `sessions_list` reports and in what order, and
 * what one snapshot of a followed session carries back.
 */

import { expect, it } from 'bun:test'
import { registerTools, run, script } from './controller-double.ts'

it('lists rows newest first, honours the running filter, and refuses a limit of zero', async () => {
  const recorded = script()
  recorded.listed = [
    { sessionId: 's-idle', running: false, blank: false, updatedAt: 1 },
    { sessionId: 's-running', running: true, blank: false, updatedAt: 2 },
  ]
  const tools = registerTools(recorded)
  const all = (await run(tools, 'sessions_list', {})) as { sessions: { sessionId: string }[]; total: number }
  // The fixture is deliberately stored oldest first, so a tool that merely
  // passes the store's order through fails here rather than reading as correct.
  expect(all.sessions.map((row) => row.sessionId)).toEqual(['s-running', 's-idle'])
  expect(all.total).toBe(2)
  const running = (await run(tools, 'sessions_list', { runningOnly: true })) as {
    sessions: { sessionId: string }[]
    total: number
  }
  expect(running.sessions.map((row) => row.sessionId)).toEqual(['s-running'])
  expect(running.total).toBe(1)
  await expect(run(tools, 'sessions_list', { limit: 0 })).rejects.toThrow('must be a positive number')
})

it('caps the listed rows at the limit it was given', async () => {
  const recorded = script()
  recorded.listed = Array.from({ length: 4 }, (_unused, index) => ({
    sessionId: `s-${String(index)}`,
    running: false,
    blank: false,
    updatedAt: index,
  }))
  const capped = (await run(registerTools(recorded), 'sessions_list', { limit: 2 })) as {
    sessions: { sessionId: string }[]
    total: number
  }
  // The total reports what the host has; the rows report what was asked for.
  expect([capped.sessions.length, capped.total]).toEqual([2, 4])
  // And they are the two newest. Applying the budget before the ordering would
  // answer with two arbitrary rows while still counting to two.
  expect(capped.sessions.map((row) => row.sessionId)).toEqual(['s-3', 's-2'])
})

it('reads one snapshot from a followed session and leaves no stream behind', async () => {
  const recorded = script()
  recorded.frames = [
    { type: 'other' },
    {
      type: 'snapshot',
      cursor: 7,
      hasMore: true,
      records: [{ type: 'event', event: { type: 'user/message', seq: 1, time: 0, data: { content: [] } } }],
    },
  ]
  recorded.frames = [
    { type: 'other' },
    {
      type: 'snapshot',
      cursor: 7,
      hasMore: true,
      records: [
        {
          type: 'event',
          event: { type: 'user/message', seq: 1, time: 0, data: { content: [{ type: 'text', text: 'ping' }] } },
        },
      ],
    },
    { type: 'never-read' },
  ]
  const followed = (await run(registerTools(recorded), 'sessions_follow', { sessionId: 'other' })) as {
    sessionId: string
    cursor: number
    hasMore: boolean
    records: number
    recent: string[]
  }
  expect([followed.sessionId, followed.cursor, followed.hasMore, followed.records]).toEqual(['other', 7, true, 1])
  // The window the model actually reads, rather than only its size.
  expect(followed.recent).toEqual(['user: ping'])
  // It stopped at the opening snapshot and closed the stream rather than
  // draining it: the frame after the snapshot was never consumed.
  expect(recorded.closed).toBe(true)
})

it('refuses a followed session that never opens a snapshot', async () => {
  const recorded = script()
  recorded.frames = [{ type: 'other' }]
  await expect(run(registerTools(recorded), 'sessions_follow', { sessionId: 'other' })).rejects.toThrow(
    'produced no opening snapshot',
  )
})

it('refuses a session id the host would not admit, on every tool that takes one', async () => {
  const tools = registerTools(script())
  // The message has to name the guard rather than merely the tool: every other
  // failure in these tools names the tool too, so asserting the tool's name
  // alone would pass with the guard removed.
  const refusals = ['   ', '', 'two words', 'has\ttab', 'has\nnewline'].flatMap((raw) => [
    run(tools, 'sessions_follow', { sessionId: raw }),
    run(tools, 'sessions_send', { sessionId: raw, message: 'hi' }),
    run(tools, 'sessions_cancel', { sessionId: raw }),
  ])
  const outcomes = await Promise.allSettled(refusals)
  expect(
    outcomes.filter(
      (outcome) => outcome.status !== 'rejected' || !String(outcome.reason).includes('is not a session id'),
    ),
  ).toEqual([])
  // And it names the tool that refused, so an agent reading the failure knows
  // which of three calls it came from. The guard is told which tool it is
  // guarding, and a guard told nothing reports a message that starts with a
  // bare colon.
  const named = ['sessions_follow', 'sessions_send', 'sessions_cancel'].map(async (tool) => {
    const args = tool === 'sessions_send' ? { sessionId: ' ', message: 'hi' } : { sessionId: ' ' }
    return await run(tools, tool, args).then(() => '', String)
  })
  expect((await Promise.all(named)).map((message) => message.includes('Error: sessions_'))).toEqual([true, true, true])
  // Surrounding space is trimmed rather than refused, so a pasted id still works.
  const recorded = script()
  await run(registerTools(recorded), 'sessions_cancel', { sessionId: '  other  ' })
  expect(recorded.cancelled).toEqual(['other'])
})

it('forwards a message budget only when the caller set one', async () => {
  // The budget decides how much of the window the host builds, so a tool that
  // dropped it would answer with a different snapshot than the one asked for.
  const recorded = script()
  recorded.frames = [{ type: 'snapshot', cursor: 1, records: [] }]
  await run(registerTools(recorded), 'sessions_follow', { sessionId: 'other', maxMessages: 3 })
  expect(recorded.followed).toEqual([{ sessionId: 'other', maxMessages: 3 }])

  // And the key is left off entirely when the caller set none, rather than
  // named with nothing under it: a host that reads whether the budget was
  // asked for, not what it was, answers differently to the two.
  const bare = script()
  bare.frames = [{ type: 'snapshot', cursor: 1, records: [] }]
  await run(registerTools(bare), 'sessions_follow', { sessionId: 'other' })
  expect(bare.followed).toEqual([{ sessionId: 'other', maxMessages: 'absent' }])
})

it('answers with the cut a snapshot with nothing before it reports', async () => {
  const recorded = script()
  recorded.frames = [{ type: 'snapshot', cursor: 0, hasMore: false, records: [] }]
  expect(await run(registerTools(recorded), 'sessions_follow', { sessionId: 'other' })).toEqual({
    sessionId: 'other',
    cursor: 0,
    hasMore: false,
    records: 0,
    recent: [],
  })
})

it('reads the whole list when the caller sets no budget of their own', async () => {
  // The double's configured budget is five, so a sixth row is what says the
  // default was read from the limits rather than left unbounded.
  const recorded = script()
  recorded.listed = Array.from({ length: 6 }, (_unused, index) => ({
    sessionId: `s-${String(index)}`,
    running: false,
    blank: false,
    updatedAt: index,
  }))
  const listed = (await run(registerTools(recorded), 'sessions_list', {})) as {
    sessions: { sessionId: string }[]
    total: number
  }
  expect([listed.sessions.length, listed.total]).toEqual([5, 6])
})

it('refuses a negative row budget as it refuses zero', async () => {
  await expect(run(registerTools(script()), 'sessions_list', { limit: -1 })).rejects.toThrow(
    'sessions_list: limit must be a positive number',
  )
})

it('reports a host with no sessions as an empty list rather than a failure', async () => {
  const recorded = script()
  recorded.listed = []
  expect(await run(registerTools(recorded), 'sessions_list', {})).toEqual({ sessions: [], total: 0 })
})
