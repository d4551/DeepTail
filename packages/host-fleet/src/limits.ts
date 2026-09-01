/**
 * The deployment-varying limits every fleet tool reads. They reach a tool
 * already resolved, so no tool carries a second copy of a default.
 *
 * @module @deeptail/host-fleet/limits
 */

/** Resolved plugin config after schemastery applied its defaults. */
export interface FleetLimits {
  readonly maxSpawnsPerProcess: number
  readonly defaultPreset: string
  readonly maxPromptChars: number
  readonly listLimit: number
  readonly promptTimeoutMs: number
}
