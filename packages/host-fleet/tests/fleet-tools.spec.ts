/**
 * The fleet tools' registration and their three mutating tools: what the spawn
 * budget admits, what the argument guards refuse, and what reaches the host.
 */

import { expect, it } from 'bun:test'
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
  await run(tools, 'sessions_send', { sessionId: 'other', message: 'hi', mode: 'steer' })
  expect(recorded.prompted).toEqual([{ sessionId: 'other', mode: 'steer' }])
  await run(tools, 'sessions_cancel', { sessionId: 'other' })
  expect(recorded.cancelled).toEqual(['other'])
})
