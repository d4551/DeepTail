/**
 * The two tools that only report. `sessions_list` reads stored session state
 * and `sessions_follow` takes one snapshot of a session's current window;
 * neither starts, resumes, or steers an agent.
 *
 * @module @deeptail/host-fleet/tools-observe
 */

import { defineTool, type ToolDefinition } from '@deepseek-ai/dsh-tools'
import type { FleetLimits } from './limits.ts'
import { admitSessionId } from './session-access.ts'
import { recentLines, summarize } from './session-projection.ts'
import type { FleetContext, FleetController, FleetSessionSummary } from './types.ts'

/** One listed session as the `sessions_list` renderer reads it. */
interface ReportedSession {
  readonly sessionId: string
  /** Whether an Agent is live for this session right now. */
  readonly running: boolean
  /** Projected session title when the projection cache already holds one. */
  readonly title?: string
}

/**
 * Register `sessions_list` for the lifetime of this plugin scope.
 * @param ctx - host context carrying `tools`.
 * @param controller - host session API that owns the session list.
 * @param limits - resolved deployment limits supplying the default row budget.
 */
export function registerSessionsList(ctx: FleetContext, controller: FleetController, limits: FleetLimits): void {
  ctx.effect(() => ctx.tools.register(sessionsListTool(controller, limits)), 'host-fleet: sessions_list')
}

/**
 * Define `sessions_list`.
 * @param controller - host session API that owns the session list.
 * @param limits - resolved deployment limits supplying the default row budget.
 * @returns the registry-ready definition.
 */
function sessionsListTool(controller: FleetController, limits: FleetLimits): ToolDefinition {
  return defineTool({
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
      render: (_args, value) => [{ type: 'text', text: listedSessionsText(value.sessions, value.total) }],
    },
    execute: (args, exec) => listSessions(controller, limits, args, exec.signal),
    presentCall: (args) => ({
      card: 'generic',
      title: args.runningOnly === true ? 'List running sessions' : 'List sessions',
      kind: 'other',
    }),
  })
}

/**
 * Report the sessions on this host within the caller's row budget.
 * @param controller - host session API that owns the session list.
 * @param limits - resolved deployment limits supplying the default row budget.
 * @param args - the model's `runningOnly` and `limit` arguments.
 * @param signal - caller cancellation for the controller read.
 * @returns the projected rows, and how many sessions matched before the budget.
 */
async function listSessions(
  controller: FleetController,
  limits: FleetLimits,
  args: { readonly runningOnly?: boolean; readonly limit?: number },
  signal: AbortSignal,
): Promise<{ sessions: FleetSessionSummary[]; total: number }> {
  const listed = await controller.list({}, signal)
  const rows = listed.items
    .filter((row) => args.runningOnly !== true || row.running)
    // The tool promises newest activity first, and the row budget is applied
    // after this rather than before it: a caller asking for five rows wants the
    // five most recent sessions, not five of whatever order the store returned.
    .toSorted((left, right) => right.updatedAt - left.updatedAt)
  const limit = args.limit ?? limits.listLimit
  if (limit <= 0) throw new Error('sessions_list: limit must be a positive number')
  return { sessions: rows.slice(0, limit).map((row) => summarize(row)), total: rows.length }
}

/**
 * Render a session list the way a person scans it: one line per session,
 * carrying the running marker and the title only where the row has them.
 * @param sessions - the reported rows, in report order.
 * @param total - how many sessions matched before the row budget was applied.
 * @returns the text a `sessions_list` result renders to.
 */
function listedSessionsText(sessions: readonly ReportedSession[], total: number): string {
  if (sessions.length === 0) return 'No sessions on this host.'
  const lines = sessions.map(
    (s) => `  ${s.sessionId}${s.running ? ' [running]' : ''}${s.title === undefined ? '' : ` — ${s.title}`}`,
  )
  return `${String(sessions.length)} of ${String(total)} sessions:\n${lines.join('\n')}`
}

/** One followed session's state at the snapshot cut. */
interface FollowedSession {
  readonly sessionId: string
  /** Sequence number the snapshot window ends at. */
  readonly cursor: number
  /** Whether records exist before the window. */
  readonly hasMore: boolean
  /** How many records the window holds. */
  readonly records: number
  /** One line per surfaced message in the window, oldest first. */
  readonly recent: string[]
}

/**
 * Register `sessions_follow` for the lifetime of this plugin scope.
 * @param ctx - host context carrying `tools`.
 * @param controller - host session API that owns session follow streams.
 */
export function registerSessionsFollow(ctx: FleetContext, controller: FleetController): void {
  ctx.effect(() => ctx.tools.register(sessionsFollowTool(controller)), 'host-fleet: sessions_follow')
}

/**
 * Define `sessions_follow`.
 * @param controller - host session API that owns session follow streams.
 * @returns the registry-ready definition.
 */
function sessionsFollowTool(controller: FleetController): ToolDefinition {
  return defineTool({
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
      render: (_args, value) => [{ type: 'text', text: followedSessionText(value) }],
    },
    execute: (args, exec) => readSessionSnapshot(controller, args, exec.signal),
    presentCall: (args) => ({ card: 'generic', title: `Follow ${args.sessionId}`, kind: 'other' }),
  })
}

/**
 * Read one session's current state from its opening follow frame.
 * @param controller - host session API that owns session follow streams.
 * @param args - the model's `sessionId` and `maxMessages` arguments.
 * @param signal - caller cancellation for the follow stream.
 * @returns the snapshot cut and the tail of its window.
 */
async function readSessionSnapshot(
  controller: FleetController,
  args: { readonly sessionId: string; readonly maxMessages?: number },
  signal: AbortSignal,
): Promise<FollowedSession> {
  const address = { kind: 'session', sessionId: admitSessionId(args.sessionId, 'sessions_follow') } as const
  // `page` needs a `throughSeq` that only a follow opening frame supplies,
  // so the snapshot frame is the entry point for a one-shot read: take it
  // and stop, leaving no live stream behind.
  for await (const frame of controller.follow(
    { address, ...(args.maxMessages === undefined ? {} : { maxMessages: args.maxMessages }) },
    signal,
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
}

/**
 * Render where a followed session stands: the snapshot cut, then the tail of
 * the window when it surfaced any message.
 * @param session - the snapshot value being reported.
 * @returns the text a `sessions_follow` result renders to.
 */
function followedSessionText(session: FollowedSession): string {
  return (
    `Session ${session.sessionId} at seq ${String(session.cursor)} (${String(session.records)} records` +
    `${session.hasMore ? ', more before this window' : ''}).` +
    (session.recent.length === 0 ? '' : `\nRecent:\n${session.recent.map((line) => `  ${line}`).join('\n')}`)
  )
}
