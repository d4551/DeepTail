/**
 * The fleet tools' registration and their three mutating tools: what the spawn
 * budget admits, what the argument guards refuse, and what reaches the host.
 */

import { expect, it } from 'bun:test'
import { answeredMembers, sendAnswer, spawnAnswer } from './answers.ts'
import { registerTools, run, script } from './controller-double.ts'

it('registers every fleet tool', () => {
  expect([...registerTools(script()).keys()].toSorted((a, b) => a.localeCompare(b))).toEqual([
    'sessions_cancel',
    'sessions_follow',
    'sessions_list',
    'sessions_send',
    'sessions_spawn',
  ])
})

it('charges the spawn budget before creating, so two racing spawns cannot share a slot', async () => {
  const recorded = script()
  const tools = registerTools(recorded)
  // Both start before either finishes. With the budget charged after creation
  // they would both pass the same remaining slot.
  const outcomes = await Promise.allSettled([
    run(tools, 'sessions_spawn', { task: 'one' }),
    run(tools, 'sessions_spawn', { task: 'two' }),
  ])
  expect(outcomes.filter((outcome) => outcome.status === 'fulfilled').length).toBe(1)
  expect(recorded.created.length).toBe(1)
  const refused = outcomes.find((outcome) => outcome.status === 'rejected')
  expect(String(refused?.status === 'rejected' ? refused.reason : '')).toContain('maxSpawnsPerProcess')
})

it('returns the charge when the creation itself fails', async () => {
  const recorded = script()
  recorded.createFails = new Error('host refused')
  const tools = registerTools(recorded)
  await expect(run(tools, 'sessions_spawn', { task: 'one' })).rejects.toThrow('host refused')
  // The failed attempt spent nothing, so the one slot is still there.
  recorded.createFails = undefined
  await run(tools, 'sessions_spawn', { task: 'two' })
  expect(recorded.created.length).toBe(1)
})

it('composes the default preset when none is named', async () => {
  const recorded = script()
  await run(registerTools(recorded), 'sessions_spawn', { task: 'go' })
  expect(recorded.created[0]?.agentPreset).toBe('standard')
})

it('refuses an empty task, an empty message, and a message over the ceiling', async () => {
  const tools = registerTools(script())
  await expect(run(tools, 'sessions_spawn', { task: '   ' })).rejects.toThrow('must not be empty')
  await expect(run(tools, 'sessions_send', { sessionId: 'other', message: '  ' })).rejects.toThrow('must not be empty')
  await expect(run(tools, 'sessions_send', { sessionId: 'other', message: 'x'.repeat(9) })).rejects.toThrow(
    'exceeds the configured 8-character limit',
  )
})

it('refuses a session that addresses itself', async () => {
  const tools = registerTools(script())
  await expect(run(tools, 'sessions_send', { sessionId: 'caller', message: 'hi' })).rejects.toThrow(
    'cannot address itself',
  )
})

it('delivers a message and cancels by session id', async () => {
  const recorded = script()
  const tools = registerTools(recorded)
  const sent = sendAnswer(await run(tools, 'sessions_send', { sessionId: 'other', message: 'hi', mode: 'steer' }))
  // What reached the host, not merely that something did: the target, the mode
  // and the text the session will actually read.
  expect(recorded.prompted).toEqual([
    {
      sessionId: 'other',
      mode: 'steer',
      content: [{ type: 'text', text: 'hi' }],
      requestId: recorded.prompted[0]?.requestId ?? '',
    },
  ])
  // The correlation the tool answers with is the one it minted and spent, and
  // it is a real identity rather than an empty string.
  expect(sent).toEqual({ sessionId: 'other', mode: 'steer', requestId: recorded.prompted[0]?.requestId ?? '' })
  expect(sent.requestId).toMatch(/^[0-9a-f-]{36}$/u)
  // The tool answers with what the host accepted, which is the whole result a
  // caller reads: a cancel that reported nothing would render as one that had
  // nothing to cancel.
  expect(await run(tools, 'sessions_cancel', { sessionId: 'other' })).toEqual({ cancelled: true })
  expect(recorded.cancelled).toEqual(['other'])
})

it('queues by default, and queues anything that is not a steer', async () => {
  const recorded = script()
  const tools = registerTools(recorded)
  await run(tools, 'sessions_send', { sessionId: 'a', message: 'one' })
  await run(tools, 'sessions_send', { sessionId: 'b', message: 'two', mode: 'queue' })
  expect(recorded.prompted.map((one) => one.mode)).toEqual(['queue', 'queue'])
})

it('admits a message of exactly the configured ceiling', async () => {
  // The ceiling is the largest message that fits, not the first that does not:
  // an off-by-one here refuses a message the operator configured as allowed.
  const recorded = script()
  await run(registerTools(recorded), 'sessions_send', { sessionId: 'other', message: 'x'.repeat(8) })
  expect(recorded.prompted.map((one) => one.sessionId)).toEqual(['other'])
})

it('refuses a call no agent session owns, on both tools that address one', async () => {
  const tools = registerTools(script())
  await expect(run(tools, 'sessions_send', { sessionId: 'other', message: 'hi' }, null)).rejects.toThrow(
    'sessions_send requires an owning agent session',
  )
  await expect(run(tools, 'sessions_spawn', { task: 'go' }, null)).rejects.toThrow(
    'sessions_spawn requires an owning agent session',
  )
})

it('spends no spawn budget on a call it refuses before creating', async () => {
  // The budget is charged after the guards, so a refused call must leave the
  // one slot the double allows still there.
  const recorded = script()
  const tools = registerTools(recorded)
  await expect(run(tools, 'sessions_spawn', { task: '' }, null)).rejects.toThrow('must not be empty')
  await expect(run(tools, 'sessions_spawn', { task: 'go' }, null)).rejects.toThrow('owning agent')
  await run(tools, 'sessions_spawn', { task: 'go' })
  expect(recorded.created.length).toBe(1)
})

it('opens the session it created with the task, queued', async () => {
  const recorded = script()
  const spawned = spawnAnswer(await run(registerTools(recorded), 'sessions_spawn', { task: '  go  ' }))
  expect(recorded.prompted).toEqual([
    {
      sessionId: spawned.sessionId,
      mode: 'queue',
      content: [{ type: 'text', text: 'go' }],
      requestId: recorded.prompted[0]?.requestId ?? '',
    },
  ])
})

it('passes a working directory only when it was given one', async () => {
  const recorded = script()
  const tools = registerTools(recorded)
  await run(tools, 'sessions_spawn', { task: 'go', cwd: '/srv/work', agentPreset: 'reviewer' })
  expect(recorded.created).toEqual([{ agentPreset: 'reviewer', cwd: '/srv/work' }])
  const bare = script()
  await run(registerTools(bare), 'sessions_spawn', { task: 'go' })
  expect(bare.created).toEqual([{ agentPreset: 'standard' }])
  expect('cwd' in (bare.created[0] ?? {})).toBe(false)
})

it('reports the preset the host composed, and omits it when the host names none', async () => {
  const named = script()
  named.createdPreset = 'reviewer'
  expect(await run(registerTools(named), 'sessions_spawn', { task: 'go' })).toEqual({
    sessionId: 's-1',
    agentPreset: 'reviewer',
  })
  const silent = script()
  const spawned = await run(registerTools(silent), 'sessions_spawn', { task: 'go' })
  expect(spawned).toEqual({ sessionId: 's-1' })
  expect(answeredMembers('sessions_spawn', spawned)).toEqual(['sessionId'])
})
