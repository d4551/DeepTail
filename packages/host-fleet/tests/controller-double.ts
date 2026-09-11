/**
 * The scripted session controller both fleet-tool suites register against.
 *
 * One double, so a change to what the controller answers cannot leave one suite
 * asserting against a shape the other no longer produces. It implements the
 * narrow structural faces in `src/types.ts` directly: a change to what the host
 * context or controller requires is a compile error here.
 *
 * @module
 */

import type { SessionFollowFrame, SessionHistoryRecord } from '@deepseek-ai/dsh-api-session-controller/types'
import { SessionId } from '@deepseek-ai/dsh-session'
import { validateJsonSchemaValue } from '@deepseek-ai/dsh-tools'
import { applyFleetTools } from '../src/tools.ts'
import type { FleetContext, FleetController, FleetExecution, FleetTool } from '../src/types.ts'

/** The arguments one tool execution receives, as the host declares them. */
type ToolArguments = Parameters<FleetTool['execute']>[0]

/** What one tool execution settles with, as the host declares it. */
type ToolOutcome = Awaited<ReturnType<FleetTool['execute']>>

/** What one prompt admission carries, as the controller face declares it. */
type PromptRequest = Parameters<FleetController['prompt']>[0]

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
  /** Every prompt the controller admitted, whole, in the controller face's own types. */
  readonly prompted: {
    sessionId: string
    mode: PromptRequest['mode']
    content: PromptRequest['content']
    requestId: string
  }[]
  readonly cancelled: string[]
  /** Every follow request the controller received, with the budget key it carried. */
  readonly followed: { sessionId: string; maxMessages: number | 'absent' }[]
  createFails?: Error | undefined
  /** The preset the controller reports back on a creation, when it reports one. */
  createdPreset?: string
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
 * The controller a scripted suite drives, recording what it was given.
 * @param recording - what the controller records and how it answers.
 * @returns the narrowed controller face the fleet tools drive.
 */
function scriptedController(recording: Script): FleetController {
  return {
    list: () =>
      Promise.resolve({
        items: (recording.listed ?? []).map((row) => ({
          sessionId: SessionId(row.sessionId),
          running: row.running,
          blank: row.blank,
          updatedAt: row.updatedAt,
        })),
      }),
    follow: (request) => {
      if (request.address.kind !== 'session') {
        throw new Error('controller double: sessions_follow was handed a subagent address')
      }
      recording.followed.push({
        sessionId: String(request.address.sessionId),
        maxMessages: 'maxMessages' in request ? (request.maxMessages ?? Number.NaN) : 'absent',
      })
      return followStream(recording)
    },
    create: (request: Parameters<FleetController['create']>[0]) => {
      if (recording.createFails !== undefined) return Promise.reject(recording.createFails)
      recording.created.push(request)
      return Promise.resolve({
        sessionId: SessionId(`s-${String(recording.created.length)}`),
        ...(recording.createdPreset === undefined ? {} : { agentPreset: recording.createdPreset }),
      })
    },
    prompt: (request: Parameters<FleetController['prompt']>[0]) => {
      recording.prompted.push({
        sessionId: String(request.sessionId),
        mode: request.mode,
        content: request.content,
        requestId: String(request.requestId),
      })
      return Promise.resolve({ accepted: true as const })
    },
    cancel: (request: Parameters<FleetController['cancel']>[0]) => {
      recording.cancelled.push(String(request.sessionId))
      return { accepted: true as const }
    },
  }
}

/**
 * Register the fleet tools against a scripted controller.
 * @param recording - what the controller records and how it answers.
 * @returns every registered tool, by name.
 */
export function registerTools(recording: Script): Map<string, FleetTool> {
  const tools = new Map<string, FleetTool>()
  const controller = scriptedController(recording)
  const ctx: FleetContext = {
    sessionController: controller,
    tools: {
      register: (definition: FleetTool) => {
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
  return { created: [], prompted: [], cancelled: [], followed: [] }
}

/**
 * Run one tool the way the registry would, and hold its answer to the schema it
 * declares.
 *
 * The registry validates every successful value against the tool's own
 * `output.schema` before a caller sees it. Driving `execute` directly skips
 * that, so it is done here: a tool that answered with a field it never
 * declared, or left out one it did, was previously read by whichever suite
 * happened to look at that field, and by nothing at all otherwise.
 * @param tools - the registered tools.
 * @param name - which one to run.
 * @param args - its arguments.
 * @param agent - the session the caller speaks for, or null for none.
 * @returns the tool's answer, validated against its declared output schema.
 */
export async function run(
  tools: Map<string, FleetTool>,
  name: string,
  args: ToolArguments,
  agent: string | null = 'caller',
): Promise<ToolOutcome> {
  const tool = tools.get(name)
  if (tool === undefined) throw new Error(`${name} was never registered`)
  const exec: FleetExecution = {
    signal: new AbortController().signal,
    ...(agent === null ? {} : { agent: { session: { id: SessionId(agent) } } }),
  }
  const answered = await tool.execute(args, exec)
  const violations = validateJsonSchemaValue(tool.output.schema, answered, name)
  if (violations.length > 0) throw new Error(`${name} broke its own output schema: ${violations.join('; ')}`)
  return answered
}
