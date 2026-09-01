/**
 * Behaviour of the five `sessions_*` tools, driven through the public
 * registration surface with a scripted session controller.
 *
 * The guards these tools carry — the spawn budget, the message ceiling, the
 * refusal to address their own session — are the whole reason the package
 * exists, and none of them is observable from the schema alone.
 */

import { expect, it } from 'bun:test'
import type { Context } from '@deepseek-ai/cordis'
import type { SessionController } from '@deepseek-ai/dsh-api-session-controller'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { ToolDefinition, ToolRunContext } from '@deepseek-ai/dsh-tools'
import type { FleetLimits } from '../src/limits.ts'
import { applyFleetTools } from '../src/tools.ts'

/** Limits small enough that a test can reach every ceiling. */
const LIMITS: FleetLimits = {
  maxSpawnsPerProcess: 1,
  defaultPreset: 'standard',
  maxPromptChars: 8,
  listLimit: 5,
  promptTimeoutMs: 1_000,
}

/** What a scripted controller recorded, and how it should answer. */
interface Script {
  readonly created: { agentPreset?: string; cwd?: string }[]
  readonly prompted: { sessionId: string; mode: string }[]
  readonly cancelled: string[]
  createFails?: Error | undefined
}

/**
 * Register the fleet tools against a scripted controller.
 * @param script - what the controller records and how it answers.
 * @returns every registered tool, by name.
 */
function registerTools(recording: Script): Map<string, ToolDefinition> {
  const tools = new Map<string, ToolDefinition>()
  const controller = {
    list: () => Promise.resolve({ items: [] }),
    create: (request: { agentPreset?: string; cwd?: string }) => {
      if (recording.createFails !== undefined) return Promise.reject(recording.createFails)
      recording.created.push(request)
      return Promise.resolve({ sessionId: SessionId(`s-${String(recording.created.length)}`) })
    },
    prompt: (request: { sessionId: string; mode: string }) => {
      recording.prompted.push({ sessionId: String(request.sessionId), mode: request.mode })
      return Promise.resolve({})
    },
    cancel: (request: { sessionId: string }) => {
      recording.cancelled.push(String(request.sessionId))
      return Promise.resolve({ cancelled: true })
    },
    follow: () => Promise.resolve({ snapshot: { records: [] } }),
  } as unknown as SessionController
  const ctx = {
    sessionController: controller,
    tools: {
      register: (definition: ToolDefinition) => {
        tools.set(definition.name, definition)
        return () => null
      },
    },
    effect: (install: () => unknown) => {
      install()
    },
  } as unknown as Context
  applyFleetTools(ctx, LIMITS)
  return tools
}

/** A fresh recording script. */
function script(): Script {
  return { created: [], prompted: [], cancelled: [] }
}

/**
 * Run one tool.
 * @param tools - the registered tools.
 * @param name - which one to run.
 * @param args - its arguments.
 * @param agent - the session the caller speaks for.
 * @returns whatever the tool returned.
 */
function run(
  tools: Map<string, ToolDefinition>,
  name: string,
  args: Record<string, unknown>,
  agent = 'caller',
): Promise<unknown> {
  const tool = tools.get(name)
  if (tool === undefined) throw new Error(`${name} was never registered`)
  const exec = { agent: { session: { id: SessionId(agent) } } } as unknown as ToolRunContext
  return (tool.execute as (a: Record<string, unknown>, e: ToolRunContext) => Promise<unknown>)(args, exec)
}

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
