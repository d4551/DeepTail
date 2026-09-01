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
import { type FleetLimits, fleetLimits } from './limits.ts'
import { applyFleetTools } from './tools.ts'

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

/** The plugin config schema cordis validates against. */
export const Config = fleetLimits

/**
 * Register the fleet tools on this host.
 * @param ctx - host context carrying `tools`, `sessionController`, and `subagents`.
 * @param config - plugin config; the schema fills anything a caller omitted.
 */
export function apply(ctx: Context, config: Partial<FleetLimits> = {}): void {
  // Running the schema is what applies the defaults, so a hand-built test
  // context that mounts this plugin with no config gets the same values cordis
  // would have resolved.
  const limits: FleetLimits = new Config(config)
  if (limits.defaultPreset.trim() === '') {
    throw new Error('host-fleet: defaultPreset must name an agent preset')
  }
  applyFleetTools(ctx, limits)
}
