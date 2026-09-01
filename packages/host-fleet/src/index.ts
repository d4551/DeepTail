/**
 * Host-plane fleet orchestrator. It gives one agent the ability to see and
 * direct the other sessions on the same DeepSeek Harness host: list them,
 * spawn new ones from an agent preset, deliver messages, read their current
 * state, and cancel a running turn.
 *
 * It is a Consumer only. Session identity, persistence, delegation, and the
 * live registry stay where they already are — `ctx.sessionController`,
 * `ctx.sessionPersistence`, and `ctx.subagents` — so nothing here becomes a
 * second source of truth for session state.
 *
 * @module @deeptail/host-fleet
 */

/// <reference types="@deepseek-ai/dsh-api-session-controller" />
/// <reference types="@deepseek-ai/dsh-tools" />
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { applyFleetTools, type FleetLimits } from './tools.ts'

export type * from './types.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'host-fleet'

/**
 * Services required before the tools can register. `sessionController` owns
 * every session operation used here; `subagents` is injected so the plugin
 * refuses to load on a host with no delegation registry, where a spawned
 * session would have no owner to report back to.
 */
export const inject = ['tools', 'sessionController', 'subagents']

/** Deployment-varying limits; none of these are compiled in. */
export interface Config {
  /** Sessions this orchestrator may create over one process lifetime. */
  maxSpawnsPerProcess?: number
  /** Agent preset composed for a session created without an explicit one. */
  defaultPreset?: string
  /** Longest message `sessions_send` will admit, in characters. */
  maxPromptChars?: number
  /** Default row budget for `sessions_list`. */
  listLimit?: number
  /** How long a delivered prompt may take to be admitted, in milliseconds. */
  promptTimeoutMs?: number
}

export const Config: z<Config> = z.object({
  maxSpawnsPerProcess: z.natural().min(1).default(8),
  defaultPreset: z.string().default('standard'),
  maxPromptChars: z.natural().min(1).default(8192),
  listLimit: z.natural().min(1).default(50),
  promptTimeoutMs: z.natural().min(1).default(30_000),
})

/**
 * Register the fleet tools on this host.
 * @param ctx - host context carrying `tools`, `sessionController`, and `subagents`.
 * @param config - resolved plugin config; schemastery has applied its defaults.
 */
export function apply(ctx: Context, config: Config): void {
  // Schemastery `.default()` guarantees every field after validation, but a
  // hand-built test context may mount this plugin with no config at all.
  const limits: FleetLimits = {
    maxSpawnsPerProcess: config.maxSpawnsPerProcess ?? 8,
    defaultPreset: config.defaultPreset ?? 'standard',
    maxPromptChars: config.maxPromptChars ?? 8192,
    listLimit: config.listLimit ?? 50,
    promptTimeoutMs: config.promptTimeoutMs ?? 30_000,
  }
  if (limits.defaultPreset.trim() === '') {
    throw new Error('host-fleet: defaultPreset must name an agent preset')
  }
  applyFleetTools(ctx, limits)
}
