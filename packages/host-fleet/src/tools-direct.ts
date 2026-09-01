/**
 * The three tools that act on a session: `sessions_spawn` creates one and gives
 * it an opening task, `sessions_send` delivers a message to an existing one,
 * and `sessions_cancel` stops the turn one is running.
 *
 * @module @deeptail/host-fleet/tools-direct
 */

import type { Context } from '@deepseek-ai/cordis'
import type { SessionController } from '@deepseek-ai/dsh-api-session-controller'
import type { SessionId as SessionIdType } from '@deepseek-ai/dsh-session/types'
import { defineTool, type ToolDefinition } from '@deepseek-ai/dsh-tools'
import type { FleetLimits } from './limits.ts'
import { admitSessionId, sendPrompt } from './session-access.ts'
import type { FleetSendResult } from './types.ts'

/**
 * Sessions this orchestrator may still create in this process. The budget
 * guards against a looping agent filling a host with abandoned sessions; it
 * counts creations rather than live sessions because a spawned session that has
 * since ended still spent the operator's intent.
 */
interface SpawnBudget {
  /** Whether the budget has no room left for another creation. */
  exhausted(): boolean
  /** Charge one creation against the budget. */
  spend(): void
}

/** The owning agent as `sessions_send` reads it: the session it speaks for. */
interface OwningAgent {
  readonly session: { readonly id: SessionIdType }
}

/**
 * Open a spawn budget spanning one process lifetime.
 * @param max - creations this orchestrator may make before it refuses.
 * @returns the budget a `sessions_spawn` execution consults and charges.
 */
function spawnBudget(max: number): SpawnBudget {
  let spawned = 0
  return {
    exhausted: () => spawned >= max,
    spend: () => {
      spawned += 1
    },
  }
}

/**
 * Register `sessions_spawn` for the lifetime of this plugin scope.
 * @param ctx - host context carrying `tools`.
 * @param controller - host session API that owns session creation.
 * @param limits - resolved deployment limits: spawn budget, default preset, delivery timeout.
 */
export function registerSessionsSpawn(ctx: Context, controller: SessionController, limits: FleetLimits): void {
  const budget = spawnBudget(limits.maxSpawnsPerProcess)
  ctx.effect(() => ctx.tools.register(sessionsSpawnTool(controller, limits, budget)), 'host-fleet: sessions_spawn')
}

/**
 * Define `sessions_spawn`.
 * @param controller - host session API that owns session creation.
 * @param limits - resolved deployment limits: spawn budget, default preset, delivery timeout.
 * @param budget - the per-process creation budget this tool spends.
 * @returns the registry-ready definition.
 */
function sessionsSpawnTool(controller: SessionController, limits: FleetLimits, budget: SpawnBudget): ToolDefinition {
  return defineTool({
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
      if (budget.exhausted()) {
        throw new Error(
          `sessions_spawn: this process already created ${String(limits.maxSpawnsPerProcess)} sessions, its configured maxSpawnsPerProcess budget`,
        )
      }
      const created = await controller.create({
        agentPreset: args.agentPreset ?? limits.defaultPreset,
        ...(args.cwd === undefined ? {} : { cwd: args.cwd }),
      })
      budget.spend()
      await sendPrompt(controller, { sessionId: created.sessionId, text: task, mode: 'queue' }, limits.promptTimeoutMs)
      return {
        sessionId: created.sessionId,
        ...(created.agentPreset === undefined ? {} : { agentPreset: created.agentPreset }),
      }
    },
    presentCall: (args) => ({ card: 'generic', title: 'Spawn session', kind: 'other', rawInput: args.task }),
  })
}

/**
 * Register `sessions_send` for the lifetime of this plugin scope.
 * @param ctx - host context carrying `tools`.
 * @param controller - host session API that owns prompt admission.
 * @param limits - resolved deployment limits: message budget and delivery timeout.
 */
export function registerSessionsSend(ctx: Context, controller: SessionController, limits: FleetLimits): void {
  ctx.effect(() => ctx.tools.register(sessionsSendTool(controller, limits)), 'host-fleet: sessions_send')
}

/**
 * Define `sessions_send`.
 * @param controller - host session API that owns prompt admission.
 * @param limits - resolved deployment limits: message budget and delivery timeout.
 * @returns the registry-ready definition.
 */
function sessionsSendTool(controller: SessionController, limits: FleetLimits): ToolDefinition {
  return defineTool({
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
    execute: (args, exec) => deliverMessage(controller, limits, args, exec.agent),
    presentCall: (args) => ({
      card: 'generic',
      title: `Message ${args.sessionId}`,
      kind: 'other',
      rawInput: args.message,
    }),
  })
}

/**
 * Deliver one message to another session, refusing an empty or oversized body,
 * a call no agent owns, and a session that addresses itself.
 * @param controller - host session API that owns prompt admission.
 * @param limits - resolved deployment limits: message budget and delivery timeout.
 * @param args - the model's `sessionId`, `message` and `mode` arguments.
 * @param owner - the agent session the call runs for, absent when nothing owns it.
 * @returns the correlation the controller accepted.
 */
async function deliverMessage(
  controller: SessionController,
  limits: FleetLimits,
  args: { readonly sessionId: string; readonly message: string; readonly mode?: 'queue' | 'steer' },
  owner: OwningAgent | undefined,
): Promise<FleetSendResult> {
  const message = args.message.trim()
  if (message === '') throw new Error('sessions_send: message must not be empty')
  if (message.length > limits.maxPromptChars) {
    throw new Error(`sessions_send: message exceeds the configured ${String(limits.maxPromptChars)}-character limit`)
  }
  if (owner === undefined) throw new Error('sessions_send requires an owning agent session')
  const target = admitSessionId(args.sessionId, 'sessions_send')
  if (target === owner.session.id) throw new Error('sessions_send: a session cannot address itself')
  const mode = args.mode === 'steer' ? 'steer' : 'queue'
  return await sendPrompt(controller, { sessionId: target, text: message, mode }, limits.promptTimeoutMs)
}

/**
 * Register `sessions_cancel` for the lifetime of this plugin scope.
 * @param ctx - host context carrying `tools`.
 * @param controller - host session API that owns turn cancellation.
 */
export function registerSessionsCancel(ctx: Context, controller: SessionController): void {
  ctx.effect(() => ctx.tools.register(sessionsCancelTool(controller)), 'host-fleet: sessions_cancel')
}

/**
 * Define `sessions_cancel`.
 * @param controller - host session API that owns turn cancellation.
 * @returns the registry-ready definition.
 */
function sessionsCancelTool(controller: SessionController): ToolDefinition {
  return defineTool({
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
  })
}
