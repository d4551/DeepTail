/**
 * The `sessions_cancel` tool: request cancellation of another session's live
 * turn while preserving its queued inbox.
 *
 * @module @deeptail/host-fleet/tool-cancel
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { admitSessionId, type FleetController } from './tool-support.ts'

/** Per-property parameter schema for `sessions_cancel`. */
const PARAMETERS = { sessionId: { type: 'string', required: true, description: 'Target session id.' } } as const

/** Canonical output schema for `sessions_cancel`. */
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { cancelled: { type: 'boolean', required: true } },
} as const

/**
 * Build the `sessions_cancel` tool.
 * @param controller - the session controller that accepts cancellation.
 * @returns the tool definition, ready to register.
 */
export function sessionsCancelTool(controller: FleetController) {
  return defineTool({
    name: 'sessions_cancel',
    description: 'Cancel the active turn of another session on this host. Its queued inbox is preserved.',
    parameters: PARAMETERS,
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [
        { type: 'text', text: value.cancelled ? 'Cancellation requested.' : 'Nothing to cancel.' },
      ],
    },
    execute(args) {
      const accepted = controller.cancel({ sessionId: admitSessionId(args.sessionId, 'sessions_cancel') })
      return Promise.resolve({ cancelled: accepted.accepted })
    },
    presentCall: (args) => ({ card: 'generic', title: `Cancel ${args.sessionId}`, kind: 'other' }),
  })
}
