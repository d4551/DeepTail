/**
 * The five `sessions_*` tools. Each is a thin Consumer over `ctx.sessionController`:
 * this package owns no session state, no parallel store, and no second wire.
 *
 * @module @deeptail/host-fleet/tools
 */

import type { Context } from '@deepseek-ai/cordis'
import type {
  SessionHistoryRecord,
  SessionRequestId,
  SessionSummary,
} from '@deepseek-ai/dsh-api-session-controller/types'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { SessionId as SessionIdType } from '@deepseek-ai/dsh-session/types'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { FleetSendResult, FleetSessionSummary } from './types.ts'

/** Resolved plugin config after schemastery applied its defaults. */
export interface FleetLimits {
  readonly maxSpawnsPerProcess: number
  readonly defaultPreset: string
  readonly maxPromptChars: number
  readonly listLimit: number
  readonly promptTimeoutMs: number
}

/**
 * Brand one freshly minted correlation id as a prompt identity. The controller
 * requires a client-minted `SessionRequestId`; the orchestrator is that client.
 * @param id - a fresh UUID.
 * @returns the same string with the prompt-identity brand.
 */
function requestId(id: string): SessionRequestId {
  return id as SessionRequestId
}

/**
 * Project one controller row onto the orchestrator's reported view.
 * @param row - one `SessionSummary` from `sessionController.list`.
 * @returns the fields this package reports to the model.
 */
function summarize(row: SessionSummary): FleetSessionSummary {
  const title = row.projections?.values.title
  return {
    sessionId: row.sessionId,
    running: row.running,
    blank: row.blank,
    updatedAt: row.updatedAt,
    ...(row.cwd === undefined ? {} : { cwd: row.cwd }),
    ...(typeof title === 'string' ? { title } : {}),
    ...(row.parentSessionId === undefined ? {} : { parentSessionId: row.parentSessionId }),
  }
}

/**
 * Admit a model-supplied session id.
 *
 * The harness treats a session id as opaque, so this validates what a tool
 * boundary can: a non-empty single-line token. Rejecting here keeps a malformed
 * argument from reaching the controller as a branded value it will trust.
 * @param raw - the `sessionId` argument exactly as the model supplied it.
 * @param tool - the calling tool, named in the failure message.
 * @returns the branded session id.
 */
function admitSessionId(raw: string, tool: string): SessionIdType {
  const trimmed = raw.trim()
  if (trimmed === '' || /\s/u.test(trimmed)) {
    throw new Error(`${tool}: ${JSON.stringify(raw)} is not a session id`)
  }
  return SessionId(trimmed)
}

/**
 * Register every fleet tool on `ctx.tools`.
 * @param ctx - host context carrying `tools` and `sessionController`.
 * @param limits - resolved deployment limits.
 */
export function applyFleetTools(ctx: Context, limits: FleetLimits): void {
  const controller = ctx.sessionController
  // Sessions this orchestrator created in this process. The budget guards
  // against a looping agent filling a host with abandoned sessions; it counts
  // creations rather than live sessions because a spawned session that has
  // since ended still spent the operator's intent.
  let spawned = 0

  ctx.effect(
    () =>
      ctx.tools.register(
        defineTool({
          name: 'sessions_list',
          description:
            'List the agent sessions on this host, newest activity first. Reads stored state only — it never starts or resumes an agent.',
          parameters: {
            runningOnly: { type: 'boolean', description: 'Report only sessions with a live agent.' },
            limit: { type: 'number', description: `Maximum rows to report (default ${String(limits.listLimit)}).` },
          },
          output: {
            // The row shape is declared in full rather than as opaque JSON: the model
            // reads this schema, and PTC callers get a typed value from it.
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                sessions: {
                  type: 'array',
                  required: true,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      sessionId: { type: 'string', required: true },
                      running: { type: 'boolean', required: true },
                      blank: { type: 'boolean', required: true },
                      updatedAt: { type: 'number', required: true },
                      cwd: { type: 'string' },
                      title: { type: 'string' },
                      parentSessionId: { type: 'string' },
                    },
                  },
                },
                total: { type: 'integer', required: true },
              },
            },
            render: (_args, value) => [
              {
                type: 'text',
                text:
                  value.sessions.length === 0
                    ? 'No sessions on this host.'
                    : `${String(value.sessions.length)} of ${String(value.total)} sessions:\n` +
                      value.sessions
                        .map(
                          (s) =>
                            `  ${s.sessionId}${s.running ? ' [running]' : ''}${s.title === undefined ? '' : ` — ${s.title}`}`,
                        )
                        .join('\n'),
              },
            ],
          },
          async execute(args, exec) {
            const listed = await controller.list({}, exec.signal)
            const rows = listed.items.filter((row) => args.runningOnly !== true || row.running)
            const limit = args.limit ?? limits.listLimit
            if (limit <= 0) throw new Error('sessions_list: limit must be a positive number')
            return { sessions: rows.slice(0, limit).map(summarize), total: rows.length }
          },
          presentCall: (args) => ({
            card: 'generic',
            title: args.runningOnly === true ? 'List running sessions' : 'List sessions',
            kind: 'other',
          }),
        }),
      ),
    'host-fleet: sessions_list',
  )

  ctx.effect(
    () =>
      ctx.tools.register(
        defineTool({
          name: 'sessions_spawn',
          description:
            'Create a new agent session on this host from a named agent preset, then send it an opening task. Returns the new session id.',
          parameters: {
            task: { type: 'string', required: true, description: 'The opening instruction for the new session.' },
            agentPreset: {
              type: 'string',
              description: `Agent preset to compose (default "${limits.defaultPreset}").`,
            },
            cwd: { type: 'string', description: 'Absolute working directory for the new session.' },
          },
          output: {
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: { sessionId: { type: 'string', required: true }, agentPreset: { type: 'string' } },
            },
            render: (_args, value) => [{ type: 'text', text: `Spawned session ${value.sessionId}.` }],
          },
          async execute(args, exec) {
            const task = args.task.trim()
            if (task === '') throw new Error('sessions_spawn: task must not be empty')
            if (exec.agent === undefined) throw new Error('sessions_spawn requires an owning agent session')
            if (spawned >= limits.maxSpawnsPerProcess) {
              throw new Error(
                `sessions_spawn: this process already created ${String(limits.maxSpawnsPerProcess)} sessions, its configured maxSpawnsPerProcess budget`,
              )
            }
            const created = await controller.create({
              agentPreset: args.agentPreset ?? limits.defaultPreset,
              ...(args.cwd === undefined ? {} : { cwd: args.cwd }),
            })
            spawned += 1
            await sendPrompt(created.sessionId, task, 'queue')
            return {
              sessionId: created.sessionId,
              ...(created.agentPreset === undefined ? {} : { agentPreset: created.agentPreset }),
            }
          },
          presentCall: (args) => ({ card: 'generic', title: 'Spawn session', kind: 'other', rawInput: args.task }),
        }),
      ),
    'host-fleet: sessions_spawn',
  )

  ctx.effect(
    () =>
      ctx.tools.register(
        defineTool({
          name: 'sessions_send',
          description:
            'Deliver a message to another session on this host. "queue" appends it after the current work; "steer" interrupts the running turn.',
          parameters: {
            sessionId: { type: 'string', required: true, description: 'Target session id.' },
            message: { type: 'string', required: true, description: 'Text to deliver.' },
            mode: { type: 'string', enum: ['queue', 'steer'], description: 'Delivery mode (default "queue").' },
          },
          output: {
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                sessionId: { type: 'string', required: true },
                mode: { type: 'string', required: true },
                requestId: { type: 'string', required: true },
              },
            },
            render: (_args, value) => [{ type: 'text', text: `Delivered to ${value.sessionId} (${value.mode}).` }],
          },
          async execute(args, exec) {
            const message = args.message.trim()
            if (message === '') throw new Error('sessions_send: message must not be empty')
            if (message.length > limits.maxPromptChars) {
              throw new Error(
                `sessions_send: message exceeds the configured ${String(limits.maxPromptChars)}-character limit`,
              )
            }
            if (exec.agent === undefined) throw new Error('sessions_send requires an owning agent session')
            const target = admitSessionId(args.sessionId, 'sessions_send')
            if (target === exec.agent.session.id) throw new Error('sessions_send: a session cannot address itself')
            const mode = args.mode === 'steer' ? 'steer' : 'queue'
            return sendPrompt(target, message, mode)
          },
          presentCall: (args) => ({
            card: 'generic',
            title: `Message ${args.sessionId}`,
            kind: 'other',
            rawInput: args.message,
          }),
        }),
      ),
    'host-fleet: sessions_send',
  )

  ctx.effect(
    () =>
      ctx.tools.register(
        defineTool({
          name: 'sessions_cancel',
          description: 'Cancel the active turn of another session on this host. Its queued inbox is preserved.',
          parameters: { sessionId: { type: 'string', required: true, description: 'Target session id.' } },
          output: {
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: { cancelled: { type: 'boolean', required: true } },
            },
            render: (_args, value) => [
              { type: 'text', text: value.cancelled ? 'Cancellation requested.' : 'Nothing to cancel.' },
            ],
          },
          execute(args) {
            const accepted = controller.cancel({ sessionId: admitSessionId(args.sessionId, 'sessions_cancel') })
            return Promise.resolve({ cancelled: accepted.accepted })
          },
          presentCall: (args) => ({ card: 'generic', title: `Cancel ${args.sessionId}`, kind: 'other' }),
        }),
      ),
    'host-fleet: sessions_cancel',
  )

  ctx.effect(
    () =>
      ctx.tools.register(
        defineTool({
          name: 'sessions_follow',
          description:
            'Read the current state of another session on this host: its opening snapshot cut and the most recent messages. Does not resume a cold session.',
          parameters: {
            sessionId: { type: 'string', required: true, description: 'Target session id.' },
            maxMessages: { type: 'number', description: 'Message budget for the snapshot window.' },
          },
          output: {
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                sessionId: { type: 'string', required: true },
                cursor: { type: 'integer', required: true },
                hasMore: { type: 'boolean', required: true },
                records: { type: 'integer', required: true },
                recent: { type: 'array', required: true, items: { type: 'string' } },
              },
            },
            render: (_args, value) => [
              {
                type: 'text',
                text:
                  `Session ${value.sessionId} at seq ${String(value.cursor)} (${String(value.records)} records` +
                  `${value.hasMore ? ', more before this window' : ''}).` +
                  (value.recent.length === 0 ? '' : `\nRecent:\n${value.recent.map((line) => `  ${line}`).join('\n')}`),
              },
            ],
          },
          async execute(args, exec) {
            const address = { kind: 'session', sessionId: admitSessionId(args.sessionId, 'sessions_follow') } as const
            // `page` needs a `throughSeq` that only a follow opening frame supplies,
            // so the snapshot frame is the entry point for a one-shot read: take it
            // and stop, leaving no live stream behind.
            for await (const frame of controller.follow(
              { address, ...(args.maxMessages === undefined ? {} : { maxMessages: args.maxMessages }) },
              exec.signal,
            )) {
              if (frame.type !== 'snapshot') continue
              return {
                sessionId: args.sessionId,
                cursor: frame.cursor,
                hasMore: frame.hasMore,
                records: frame.records.length,
                recent: recentLines(frame.records),
              }
            }
            throw new Error(`sessions_follow: session ${args.sessionId} produced no opening snapshot`)
          },
          presentCall: (args) => ({ card: 'generic', title: `Follow ${args.sessionId}`, kind: 'other' }),
        }),
      ),
    'host-fleet: sessions_follow',
  )

  /**
   * Admit one text prompt into a target session.
   * @param sessionId - target session.
   * @param text - already-trimmed prompt text.
   * @param mode - queue after current work, or steer into the live turn.
   * @returns the correlation the controller accepted.
   */
  async function sendPrompt(sessionId: SessionIdType, text: string, mode: 'queue' | 'steer'): Promise<FleetSendResult> {
    const id = requestId(crypto.randomUUID())
    await controller.prompt(
      {
        requestId: id,
        sessionId,
        mode,
        content: [{ type: 'text', text }],
      },
      AbortSignal.timeout(limits.promptTimeoutMs),
    )
    return { sessionId, mode, requestId: id }
  }
}

/**
 * Render the tail of a snapshot window as one line per surfaced message.
 * Pure and log-only: this runs on replay as well as live, so it reads nothing
 * but the records it was handed.
 * @param records - the snapshot window, oldest first.
 * @returns at most five trailing lines, each already truncated.
 */
function recentLines(records: readonly SessionHistoryRecord[]): string[] {
  const lines: string[] = []
  for (const record of records) {
    const event = record.event
    if (event.type !== 'user/message' && event.type !== 'assistant/message') continue
    const role = event.type === 'user/message' ? 'user' : 'assistant'
    lines.push(`${role}: ${previewOf(event.data)}`)
  }
  return lines.slice(-5)
}

/**
 * One-line preview of a logged message.
 *
 * Reads the `text` of every `TextBlock` in the message content — `user/message`
 * carries its content directly, `assistant/message` nests it under `message` —
 * and joins them. Reasoning, images, and tool blocks are deliberately skipped:
 * this is the line a person scans in a session list.
 * @param data - the `user/message` or `assistant/message` event payload.
 * @returns a trimmed single-line preview, empty when the message carries no text.
 */
function previewOf(data: unknown): string {
  const content = messageContent(data)
  const text = content
    .filter(
      (block): block is { type: 'text'; text: string } =>
        isRecord(block) && block.type === 'text' && typeof block.text === 'string',
    )
    .map((block) => block.text)
    .join(' ')
  const collapsed = text.replaceAll(/\s+/gu, ' ').trim()
  return collapsed.length > 160 ? `${collapsed.slice(0, 157)}...` : collapsed
}

/**
 * The content array of a logged message payload, from either shape.
 * @param data - the event payload.
 * @returns the content blocks, or an empty list when the payload carries none.
 */
function messageContent(data: unknown): readonly unknown[] {
  if (!isRecord(data)) return []
  const direct = data.content
  if (Array.isArray(direct)) return direct
  const nested = data.message
  if (isRecord(nested) && Array.isArray(nested.content)) return nested.content
  return []
}

/**
 * Whether a value is a plain object with string keys.
 * @param value - the value to test.
 * @returns true when the value can be indexed by key.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
