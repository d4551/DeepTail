/**
 * The deployment-varying limits every fleet tool reads. They reach a tool
 * already resolved, so no tool carries a second copy of a default.
 *
 * The schema is the single declaration of both the shape and its defaults, and
 * the type is read off it. A separate interface beside it would be five numbers
 * and five names to keep in step by hand.
 *
 * @module @deeptail/host-fleet/limits
 */

import z from '@deepseek-ai/schemastery'

/** Deployment-varying limits; none of these are compiled in. */
export const fleetLimits = z.object({
  /** Sessions this orchestrator may create over one process lifetime. */
  maxSpawnsPerProcess: z.natural().min(1).default(8),
  /** Agent preset composed for a session created without an explicit one. */
  defaultPreset: z.string().default('standard'),
  /** Longest message `sessions_send` will admit, in characters. */
  maxPromptChars: z.natural().min(1).default(8192),
  /** Default row budget for `sessions_list`. */
  listLimit: z.natural().min(1).default(50),
  /** How long a delivered prompt may take to be admitted, in milliseconds. */
  promptTimeoutMs: z.natural().min(1).default(30_000),
})

/** Resolved plugin config after schemastery applied its defaults. */
export type FleetLimits = Readonly<ReturnType<typeof fleetLimits>>
