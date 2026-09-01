/**
 * The `sessions_follow` tool: one-shot read of another session's opening
 * snapshot and most recent messages.
 *
 * @module @deeptail/host-fleet/tool-follow
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { admitSessionId, type FleetController, recentLines } from './tool-support.ts'

/** Per-property parameter schema for `sessions_follow`. */
const PARAMETERS = {
  sessionId: { type: 'string', required: true, description: 'Target session id.' },
  maxMessages: { type: 'number', description: 'Message budget for the snapshot window.' },
}

/** Canonical output schema for `sessions_follow`. */
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    sessionId: { type: 'string', required: true },
    cursor: { type: 'integer', required: true },
    hasMore: { type: 'boolean', required: true },
    records: { type: 'integer', required: true },
    recent: { type: 'array', required: true, items: { type: 'string' } },
  },
}

/**
 * Build the `sessions_follow` tool.
 * @param controller - the session controller whose follow stream supplies the
 * snapshot frame.
 * @returns the tool definition, ready to register.
 */
export function sessionsFollowTool(controller: FleetController) {
  return defineTool({
    name: 'sessions_follow',
    description:
      'Read the current state of another session on this host: its opening snapshot cut and the most recent messages. Does not resume a cold session.',
    parameters: PARAMETERS,
    output: {
      schema: OUTPUT_SCHEMA,
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
  })
}
