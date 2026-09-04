/**
 * Registration of the five `sessions_*` tools. Each is a thin Consumer over
 * `ctx.sessionController`: this package owns no session state, no parallel
 * store, and no second wire.
 *
 * The context is taken as the narrow structural face in `types.ts`, so the
 * host's real context satisfies it by construction and the suites implement it
 * directly.
 *
 * @module @deeptail/host-fleet/tools
 */

import type { FleetLimits } from './limits.ts'
import { registerSessionsCancel, registerSessionsSend, registerSessionsSpawn } from './tools-direct.ts'
import { registerSessionsFollow, registerSessionsList } from './tools-observe.ts'
import type { FleetContext, FleetController } from './types.ts'

/**
 * Register every fleet tool on `ctx.tools`.
 * @param ctx - host context carrying `tools` and `sessionController`.
 * @param limits - resolved deployment limits.
 */
export function applyFleetTools(ctx: FleetContext, limits: FleetLimits): void {
  const controller: FleetController = ctx.sessionController
  registerSessionsList(ctx, controller, limits)
  registerSessionsSpawn(ctx, controller, limits)
  registerSessionsSend(ctx, controller, limits)
  registerSessionsCancel(ctx, controller)
  registerSessionsFollow(ctx, controller)
}
