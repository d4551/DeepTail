/**
 * The scripted session controller both fleet-tool suites register against.
 *
 * One double, so a change to what the controller answers cannot leave one suite
 * asserting against a shape the other no longer produces.
 *
 * @module
 */

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
export interface Script {
  readonly created: { agentPreset?: string; cwd?: string }[]
  readonly prompted: { sessionId: string; mode: string }[]
  readonly cancelled: string[]
  createFails?: Error | undefined
  /** Rows `session.list` answers with. */
  listed?: { sessionId: string; running: boolean; blank: boolean; updatedAt: number }[]
  /** Frames `session.follow` yields before it ends. */
  frames?: { type: string; cursor?: number; hasMore?: boolean; records?: unknown[] }[]
  /** Set when the follow stream was closed by the consumer leaving it early. */
  closed?: boolean
}

/**
 * The async iterable `session.follow` hands back.
 *
 * `for await` calls `return` when it leaves the loop early. Without it the
 * tool's one-shot read has nothing to leave behind and nothing to prove, so a
 * stream it forgot to close would look identical to one it did.
 * @param recording - the script, which records the early exit.
 * @returns the iterable of scripted frames.
 */
function followStream(recording: Script): AsyncIterable<unknown> {
  const frames = recording.frames ?? []
  return {
    [Symbol.asyncIterator]: (): AsyncIterator<unknown> => {
      let index = 0
      return {
        next: () =>
          Promise.resolve(
            index < frames.length ? { value: frames[index++], done: false } : { value: undefined, done: true },
          ),
        return: () => {
          recording.closed = true
          return Promise.resolve({ value: undefined, done: true as const })
        },
      }
    },
  }
}

/**
 * Register the fleet tools against a scripted controller.
 * @param script - what the controller records and how it answers.
 * @returns every registered tool, by name.
 */
export function registerTools(recording: Script): Map<string, ToolDefinition> {
  const tools = new Map<string, ToolDefinition>()
  const controller = {
    list: () => Promise.resolve({ items: recording.listed ?? [] }),
    follow: () => followStream(recording),
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
export function script(): Script {
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
export function run(
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
