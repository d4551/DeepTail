/**
 * Package-owned invariant companion for `@deeptail/host-fleet`.
 * @module @deeptail/host-fleet/invariant
 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantFailure, InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deeptail/host-fleet'

/** Cordis companion plugin name. */
export const name = 'host-fleet-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/** The tools this package exists to provide. */
const TOOLS = ['sessions_list', 'sessions_spawn', 'sessions_send', 'sessions_cancel', 'sessions_follow'] as const

/**
 * The package's contract, checked from outside it: a host that loaded this
 * plugin can address every session on it.
 *
 * A registration that silently failed, or one a later scope shadowed away,
 * leaves an agent believing it can reach the fleet when it cannot. That is not
 * visible from inside the registering code, which is why it is checked here.
 */
const install: InvariantInstaller = (ctx: Context, fail: InvariantFailure): void => {
  const missing = TOOLS.filter((tool) => ctx.tools.get(tool) === undefined)
  if (missing.length > 0) fail(`${PACKAGE_NAME}: ${missing.join(', ')} did not register`)
}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
