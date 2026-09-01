/**
 * The `sessions_send` tool: deliver a message to another session on this host.
 *
 * @module @deeptail/host-fleet/tool-send
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { admitSessionId, type PromptSender } from './tool-support.ts'
import type { FleetLimits } from './tools.ts'

/** Per-property parameter schema for `sessions_send`. */
const PARAMETERS = {
  sessionId: { type: 'string', required: true, description: 'Target session id.' },
  message: { type: 'string', required: true, description: 'Text to deliver.' },
  mode: { type: 'string', enum: ['queue', 'steer'], description: 'Delivery mode (default "queue").' },
}

/** Canonical output schema for `sessions_send`. */
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    sessionId: { type: 'string', required: true },
    mode: { type: 'string', required: true },
    requestId: { type: 'string', required: true },
  },
}

/**
 * Build the `sessions_send` tool.
 * @param limits - resolved deployment limits supplying the message length cap.
 * @param sendPrompt - delivers one admitted prompt to its target session.
 * @returns the tool definition, ready to register.
 */
export function sessionsSendTool(limits: FleetLimits, sendPrompt: PromptSender) {
  return defineTool({
    name: 'sessions_send',
    description:
      'Deliver a message to another session on this host. "queue" appends it after the current work; "steer" interrupts the running turn.',
    parameters: PARAMETERS,
    output: {
      schema: OUTPUT_SCHEMA,
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
      return await sendPrompt(target, message, mode)
    },
    presentCall: (args) => ({
      card: 'generic',
      title: `Message ${args.sessionId}`,
      kind: 'other',
      rawInput: args.message,
    }),
  })
}
