/**
 * The scripted session controller both fleet-tool suites register against.
 *
 * One double, so a change to what the controller answers cannot leave one suite
 * asserting against a shape the other no longer produces. It implements the
 * narrow structural faces in `src/types.ts` directly: a change to what the host
 * context or controller requires is a compile error here, not a silent pass.
 *
 * One conversion remains, and it is the whole reason `run` exists as its own
 * seam: the registry-owned execution token is a branded symbol minted only by
 * the real registry, and the owning agent is the host's own live fiber, so a
 * suite that drives `execute` directly holds stand-ins for exactly those two.
 * The fixture declares them, the real context is assignable to the fixture, and
 * the compiler checks the conversion against that declaration.
 *
 * @module
 */

import type { SessionFollowFrame, SessionHistoryRecord } from '@deepseek-ai/dsh-api-session-controller/types'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { ToolDefinition, ToolRunContext } from '@deepseek-ai/dsh-tools'
import { applyFleetTools } from '../src/tools.ts'
import type { FleetContext, FleetController } from '../src/types.ts'

/** The arguments one tool execution receives, as the host declares them. */
type ToolArguments = Parameters<ToolDefinition['execute']>[0]

/** What one tool execution settles with, as the host declares it. */
type ToolOutcome = Awaited<ReturnType<ToolDefinition['execute']>>

/**
 * The execution fixture: everything the run context carries, with the members
 * whose concrete types the double cannot mint declared at their widest honest
 * type — call identities as strings, the owning agent as the handle the tools
 * read, the token as an opaque symbol. The real context is assignable to this
 * fixture, which is what makes the single conversion in `run` a narrowing the
 * compiler checks, not a bridge.
 */
type ExecFixture = Omit<ToolRunContext, 'agent' | 'token' | 'callId' | 'rootCallId'> & {
  readonly callId: string
  readonly rootCallId: string
  readonly agent: { readonly session: { readonly id: string } }
  readonly token: symbol
}

/** Limits small enough that a test can reach every ceiling. */
const LIMITS = {
  maxSpawnsPerProcess: 1,
  defaultPreset: 'standard',
  maxPromptChars: 8,
  listLimit: 5,
  promptTimeoutMs: 1_000,
} as const

/** One scripted frame, as the test writes it. */
interface ScriptFrame {
  readonly type: string
  readonly cursor?: number
  readonly hasMore?: boolean
  readonly records?: readonly SessionHistoryRecord[]
}

/**
 * Refuse a drive the suite has not scripted.
 * @returns never — the refusal is the answer.
 */
function refuse(): never {
  throw new Error('controller double: this surface is not scripted for this test')
}

/** What a scripted controller recorded, and how it should answer. */
export interface Script {
  readonly created: { agentPreset?: string; cwd?: string }[]
  readonly prompted: { sessionId: string; mode: string }[]
  readonly cancelled: string[]
  createFails?: Error | undefined
  /** Rows `session.list` answers with, keyed by plain id and branded at the boundary. */
  listed?: { sessionId: string; running: boolean; blank: boolean; updatedAt: number }[]
  /**
   * Frames `session.follow` yields before it ends. A `snapshot` frame is
   * completed into the wire shape the controller really emits; anything else is
   * carried as an event frame the tool skips.
   */
  frames?: readonly ScriptFrame[]
  /** Set when the follow stream was closed by the consumer leaving it early. */
  closed?: boolean
}

/**
 * Complete one scripted frame into the wire shape the controller emits.
 * @param frame - the scripted frame.
 * @returns the frame as the controller would deliver it.
 */
function toFrame(frame: ScriptFrame): SessionFollowFrame {
  if (frame.type === 'snapshot') {
    return {
      type: 'snapshot',
      header: { version: 0, id: SessionId('s-under-follow'), createdAt: 0 },
      cursor: frame.cursor ?? 0,
      hasMore: frame.hasMore ?? false,
      records: frame.records ?? [],
      projections: { asOfSeq: frame.cursor ?? 0, values: {} },
    }
  }
  return { type: 'event', event: { type: frame.type, seq: 0, time: 0, data: null } }
}

/**
 * The async iterable `session.follow` hands back.
 *
 * The consumer leaving the stream early closes it: `closed` is recorded only
 * when frames remained unconsumed, so a stream drained to its end and one
 * abandoned mid-read stay distinguishable.
 * @param recording - the script, which records the early exit.
 * @returns the scripted frames.
 */
function followStream(recording: Script): AsyncIterable<SessionFollowFrame> {
  const queue = (recording.frames ?? []).map((frame) => toFrame(frame))
  return {
    [Symbol.asyncIterator]: () => ({
      next: (): Promise<IteratorResult<SessionFollowFrame>> => {
        const frame = queue.shift()
        return Promise.resolve(frame === undefined ? { done: true, value: undefined } : { done: false, value: frame })
      },
      return: (): Promise<IteratorResult<SessionFollowFrame>> => {
        if (queue.length > 0) recording.closed = true
        return Promise.resolve({ done: true, value: undefined })
      },
    }),
  }
}

/**
 * The controller every suite starts from: it answers every surface, and refuses
 * the ones the suite has not scripted a drive through.
 * @returns the narrowed controller face the fleet tools drive.
 */
export function refusingController(): FleetController {
  return {
    list: () => refuse(),
    follow: () => refuse(),
    create: () => refuse(),
    prompt: () => refuse(),
    cancel: () => refuse(),
  }
}

/**
 * Register the fleet tools against a scripted controller.
 * @param recording - what the controller records and how it answers.
 * @returns every registered tool, by name.
 */
export function registerTools(recording: Script): Map<string, ToolDefinition> {
  const tools = new Map<string, ToolDefinition>()
  const controller: FleetController = {
    list: () =>
      Promise.resolve({
        items: (recording.listed ?? []).map((row) => ({ ...row, sessionId: SessionId(row.sessionId) })),
      }),
    follow: () => followStream(recording),
    create: (request: Parameters<FleetController['create']>[0]) => {
      if (recording.createFails !== undefined) return Promise.reject(recording.createFails)
      recording.created.push(request)
      return Promise.resolve({ sessionId: SessionId(`s-${String(recording.created.length)}`) })
    },
    prompt: (request: Parameters<FleetController['prompt']>[0]) => {
      recording.prompted.push({ sessionId: String(request.sessionId), mode: request.mode })
      return Promise.resolve({ accepted: true as const })
    },
    cancel: (request: Parameters<FleetController['cancel']>[0]) => {
      recording.cancelled.push(String(request.sessionId))
      return { accepted: true as const }
    },
  }
  const ctx: FleetContext = {
    sessionController: controller,
    tools: {
      register: (definition: ToolDefinition) => {
        tools.set(definition.name, definition)
        return () => null
      },
    },
    effect: (install) => {
      install()
      return null
    },
  }
  applyFleetTools(ctx, LIMITS)
  return tools
}

/** A fresh recording script. */
export function script(): Script {
  return { created: [], prompted: [], cancelled: [] }
}

/**
 * Run one tool through the double's execution fixture.
 *
 * The fixture covers every member of the run context except the four declared
 * in its type; the conversion at the call is the compiler-checked narrowing
 * from fixture to context.
 * @param tools - the registered tools.
 * @param name - which one to run.
 * @param args - its arguments.
 * @param agent - the session the caller speaks for.
 * @returns whatever the tool returned.
 */
export function run(
  tools: Map<string, ToolDefinition>,
  name: string,
  args: ToolArguments,
  agent = 'caller',
): Promise<ToolOutcome> {
  const tool = tools.get(name)
  if (tool === undefined) throw new Error(`${name} was never registered`)
  const exec: ExecFixture = {
    callId: `c-${name}`,
    rootCallId: `c-${name}`,
    name,
    arguments: args,
    signal: new AbortController().signal,
    agent: { session: { id: SessionId(agent) } },
    token: Symbol('tool-execution'),
    deferContext: () => null,
    concludeTurn: () => null,
  }
  return tool.execute(args, exec as Parameters<typeof tool.execute>[1])
}
