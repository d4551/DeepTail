/**
 * The `sessions_list` tool: read-only inventory of the host's sessions.
 *
 * @module @deeptail/host-fleet/tool-list
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { type FleetController, summarize } from './tool-support.ts'
import type { FleetLimits } from './tools.ts'

/** Per-property parameter schema; `defineTool`'s const generics keep the
 * literal types so argument inference flows from these declarations. */
const PARAMETERS = {
  runningOnly: { type: 'boolean', description: 'Report only sessions with a live agent.' },
  limit: { type: 'number', description: 'Maximum rows to report.' },
}

/** The reported row shape is declared in full rather than as opaque JSON: the
 * model reads this schema, and PTC callers get a typed value from it. */
const OUTPUT_SCHEMA = {
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
}

/**
 * Build the `sessions_list` tool.
 * @param controller - the session controller to read from.
 * @param limits - resolved deployment limits supplying the row budget default.
 * @returns the tool definition, ready to register.
 */
export function sessionsListTool(controller: FleetController, limits: FleetLimits) {
  return defineTool({
    name: 'sessions_list',
    description:
      'List the agent sessions on this host, newest activity first. Reads stored state only — it never starts or resumes an agent.',
    parameters: PARAMETERS,
    output: {
      schema: OUTPUT_SCHEMA,
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
      return { sessions: rows.slice(0, limit).map((row) => summarize(row)), total: rows.length }
    },
    presentCall: (args) => ({
      card: 'generic',
      title: args.runningOnly === true ? 'List running sessions' : 'List sessions',
      kind: 'other',
    }),
  })
}
