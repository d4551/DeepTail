/**
 * The `sessions_spawn` tool: create a new session from an agent preset and
 * hand it an opening task.
 *
 * @module @deeptail/host-fleet/tool-spawn
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import type { FleetController, PromptSender } from './tool-support.ts'
import type { FleetLimits } from './tools.ts'

/** Per-property parameter schema for `sessions_spawn`. */
const PARAMETERS = {
  task: { type: 'string', required: true, description: 'The opening instruction for the new session.' },
  agentPreset: { type: 'string', description: 'Agent preset to compose.' },
  cwd: { type: 'string', description: 'Absolute working directory for the new session.' },
}

/** Canonical output schema for `sessions_spawn`. */
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { sessionId: { type: 'string', required: true }, agentPreset: { type: 'string' } },
}

/**
 * Build the `sessions_spawn` tool.
 * @param controller - the session controller that creates sessions.
 * @param limits - resolved deployment limits supplying the default preset.
 * @param claimSpawn - spends one unit of the process spawn budget, throwing
 * when the budget is exhausted.
 * @param sendPrompt - delivers the opening task to the freshly created session.
 * @returns the tool definition, ready to register.
 */
export function sessionsSpawnTool(
  controller: FleetController,
  limits: FleetLimits,
  claimSpawn: () => void,
  sendPrompt: PromptSender,
) {
  return defineTool({
    name: 'sessions_spawn',
    description:
      'Create a new agent session on this host from a named agent preset, then send it an opening task. Returns the new session id.',
    parameters: PARAMETERS,
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: `Spawned session ${value.sessionId}.` }],
    },
    async execute(args, exec) {
      const task = args.task.trim()
      if (task === '') throw new Error('sessions_spawn: task must not be empty')
      if (exec.agent === undefined) throw new Error('sessions_spawn requires an owning agent session')
      const created = await controller.create({
        agentPreset: args.agentPreset ?? limits.defaultPreset,
        ...(args.cwd === undefined ? {} : { cwd: args.cwd }),
      })
      claimSpawn()
      await sendPrompt(created.sessionId, task, 'queue')
      return {
        sessionId: created.sessionId,
        ...(created.agentPreset === undefined ? {} : { agentPreset: created.agentPreset }),
      }
    },
    presentCall: (args) => ({ card: 'generic', title: 'Spawn session', kind: 'other', rawInput: args.task }),
  })
}
