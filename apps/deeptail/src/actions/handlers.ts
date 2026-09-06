/**
 * What each declared action actually does.
 *
 * One row per action in `actions.bao`, in a table the compiler checks for
 * completeness: an action with no handler here is a type error. A handler does
 * its work and lets a rejection travel back to the dispatcher, which renders
 * the host's own account in the operator's language.
 *
 * Split from `dispatch.ts` the day the table outgrew the size the linter allows
 * one function, and grouped by the surface each action belongs to so the group
 * a reader wants is the one they open.
 *
 * @module
 */

import type { HostRecord } from '../host.ts'
import type { Translate } from '../locales.ts'
import type { ActionDeps, ActionHandlers } from './dispatch.ts'

/**
 * The host an action names, or nothing when the registry no longer holds it.
 * @param deps - the application.
 * @param hostId - the host the control named.
 * @returns the record, or undefined.
 */
function hostOf(deps: ActionDeps, hostId: string): HostRecord | undefined {
  return deps.hosts().find((host) => host.id === hostId)
}

/**
 * The name a host is announced by.
 * @param deps - the application.
 * @param hostId - the host to name.
 * @returns the label, or the id when the registry no longer holds it.
 */
function labelOf(deps: ActionDeps, hostId: string): string {
  return hostOf(deps, hostId)?.label ?? hostId
}

/** The shell's own actions: booting, returning, and the drawer. */
function shellHandlers(): Pick<
  ActionHandlers,
  'boot.retry' | 'client.return' | 'drawer.toggle' | 'drawer.dismiss' | 'session.spawn'
> {
  return {
    'boot.retry': async (deps) => {
      await deps.remount()
      return { kind: 'executed' }
    },
    'client.return': async (deps) => {
      if (!deps.clientBooted()) return { kind: 'unwired', reason: 'no-booted-client' }
      await deps.returnToFleet()
      return { kind: 'executed' }
    },
    'drawer.toggle': (deps, input) => {
      deps.setDrawer(input.open)
      return { kind: 'executed' }
    },
    'drawer.dismiss': (deps) => {
      deps.setDrawer(false)
      return { kind: 'executed' }
    },
    'session.spawn': (deps) => {
      if (deps.hosts().length === 0) return { kind: 'unwired', reason: 'no-host' }
      deps.openSpawn()
      return { kind: 'executed' }
    },
  }
}

/** Pairing, re-pairing, forgetting and choosing a host. */
function connectionHandlers(): Pick<
  ActionHandlers,
  'connection.pair' | 'connection.repair' | 'connection.unpair' | 'connection.select'
> {
  return {
    'connection.pair': (deps) => {
      deps.pair()
      return { kind: 'executed' }
    },
    'connection.repair': (deps, input) => {
      deps.pair(labelOf(deps, input.hostId))
      return { kind: 'executed' }
    },
    'connection.unpair': async (deps, input) => {
      await deps.forget(input.hostId)
      return { kind: 'executed' }
    },
    'connection.select': (deps, input) => {
      deps.select(input.hostId)
      return { kind: 'executed' }
    },
  }
}

/**
 * Acting on a session: opening it, messaging it, stopping it, creating one.
 * @param t - copy source, for what a successful action announces.
 */
function sessionHandlers(
  t: Translate,
): Pick<
  ActionHandlers,
  'session.open' | 'session.message' | 'session.cancel' | 'compose.send' | 'compose.steer' | 'spawn.create'
> {
  return {
    'session.open': async (deps, input) => {
      const host = hostOf(deps, input.hostId)
      if (host === undefined) return { kind: 'invalid', reason: 'no-host' }
      await deps.openClient(host, input.sessionId)
      return { kind: 'executed' }
    },
    'session.message': (deps, input) => {
      deps.openCompose(input.hostId, input.sessionId, input.title)
      return { kind: 'executed' }
    },
    'session.cancel': async (deps, input) => {
      await deps.cancel(input.hostId, input.sessionId)
      return { kind: 'executed' }
    },
    'compose.send': async (deps, input) => {
      if (input.text.trim() === '') return { kind: 'invalid', reason: 'empty-message' }
      await deps.message(input.hostId, input.sessionId, input.text, 'queue')
      return { kind: 'executed' }
    },
    'compose.steer': async (deps, input) => {
      if (input.text.trim() === '') return { kind: 'invalid', reason: 'empty-message' }
      await deps.message(input.hostId, input.sessionId, input.text, 'steer')
      return { kind: 'executed' }
    },
    'spawn.create': async (deps, input) => {
      await deps.spawn(input.hostId, input.preset, input.cwd)
      return { kind: 'executed', announce: t('spawn.created', { label: labelOf(deps, input.hostId) }) }
    },
  }
}

/** The picker and the tailnet credential behind it. */
function pickerHandlers(): Pick<
  ActionHandlers,
  'picker.pair' | 'picker.tailnet' | 'tailnet.connect' | 'tailnet.forget'
> {
  return {
    'picker.pair': async (deps, input) => {
      if (input.link.trim() === '') return { kind: 'invalid', reason: 'incomplete-credential' }
      await deps.pairFromLink(input.link, input.label)
      return { kind: 'executed' }
    },
    'picker.tailnet': (deps) => {
      deps.openTailnet()
      return { kind: 'executed' }
    },
    'tailnet.connect': async (deps, input) => {
      await deps.connectTailnet(input.kind, input.secret, input.tailnet)
      return { kind: 'executed' }
    },
    'tailnet.forget': async (deps) => {
      if (!deps.tailnetStored()) return { kind: 'unwired', reason: 'no-tailnet-credential' }
      await deps.forgetTailnet()
      return { kind: 'executed' }
    },
  }
}

/**
 * The handlers, one per declared action.
 * @param t - copy source, for what a successful action announces.
 * @returns the exhaustive table.
 */
export function buildHandlers(t: Translate): ActionHandlers {
  return { ...shellHandlers(), ...connectionHandlers(), ...sessionHandlers(t), ...pickerHandlers() }
}
