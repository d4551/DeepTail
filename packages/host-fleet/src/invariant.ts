/**
 * Package-owned invariant companion for `@deeptail/host-fleet`.
 * @module @deeptail/host-fleet/invariant
 */

import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deeptail/host-fleet'

/** Cordis companion plugin name. */
export const name = 'host-fleet-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * Every `fleet/route` this package appends must name a session that the
 * persistence layer can still locate, so a replayed transcript never points at
 * a target that was never created.
 */
const install: InvariantInstaller = (ctx) => {
  ctx.on('session/event', (session, event) => {
    if (event.type !== 'fleet/route') return
    const target = event.data.target
    if (target === session.id) {
      throw new Error(`${PACKAGE_NAME}: fleet/route target ${target} is the routing session itself`)
    }
  })
}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
