/**
 * The fleet plumbing the shell composes: the per-host connections every
 * surface shares, the facts each surface supplies, and the event streams that
 * keep the roster honest.
 *
 * @module
 */

import type { Preconditions } from '../actions/dispatch.ts'
import type { ActionOutcome } from '../actions/outcomes.ts'
import { ACTIONS } from '../actions/registry.ts'
import { createHostApi, type HostApi } from '../api.ts'
import type { HostRecord } from '../host.ts'
import type { Translate } from '../locales.ts'
import { type AppRuntime, type OutcomeTell, runAction } from '../runtime.ts'
import type { FleetStore } from '../store.ts'
import { type HostEvent, subscribeRoster } from '../stream.ts'
import type { CarrierHooks } from '../transport.ts'
import type { ComposeTarget } from './compose-sheet.ts'
import { type Disposer, el } from './dom.ts'
import type { FleetPorts } from './fleet-view.ts'
import type { SpawnPorts } from './new-session.ts'
import type { HostState } from './states.ts'

/** The connections every surface shares with one host. */
export interface HostClients {
  /** The carrier reaching one host. */
  carrierFor(host: HostRecord): CarrierHooks
  /** The Remote surface over that carrier. */
  apiFor(host: HostRecord): HostApi
}

/**
 * Memoize the connections to each host, so the roster, the compose sheet and
 * the event streams all reach a host over the one carrier it already has.
 * @param connect - how to reach a host that has no carrier yet.
 * @returns the shared per-host clients.
 */
export function createHostClients(connect: (host: HostRecord) => CarrierHooks): HostClients {
  const carriers = new Map<string, CarrierHooks>()
  const apis = new Map<string, HostApi>()

  const carrierFor = (host: HostRecord): CarrierHooks => {
    const existing = carriers.get(host.id)
    if (existing !== undefined) return existing
    const created = connect(host)
    carriers.set(host.id, created)
    return created
  }
  const apiFor = (host: HostRecord): HostApi => {
    const existing = apis.get(host.id)
    if (existing !== undefined) return existing
    const created = createHostApi(carrierFor(host))
    apis.set(host.id, created)
    return created
  }
  return { carrierFor, apiFor }
}

/**
 * Subscribe every host's forwarded events into the fleet.
 *
 * Each host gets its own subscription, so a host that never answers leaves the
 * others live.
 * @param hosts - every paired host.
 * @param carrierFor - the carrier reaching one host.
 * @param store - the fleet the events land in.
 * @returns a disposer that closes every subscription.
 */
export function subscribeHostRosters(
  hosts: readonly HostRecord[],
  carrierFor: (host: HostRecord) => CarrierHooks,
  store: FleetStore,
): Disposer {
  const disposers = hosts.map((host) =>
    subscribeRoster(carrierFor(host), {
      onReady: () => {
        store.setHostState(host.id, 'online')
      },
      onEvent: (event: HostEvent) => {
        store.applyEvent(host.id, event.event, event.args)
      },
      onLost: () => {
        store.setHostState(host.id, 'offline')
      },
    }),
  )
  return () => {
    for (const dispose of disposers) dispose()
  }
}

/**
 * The facts the chrome holds: whether the fleet has hosts at all. The chrome
 * owns no host and no session — its host reads `unknown` and nothing runs in
 * its context — and the actions it dispatches are `always` available, so none
 * of these is read; they are what the chrome itself knows.
 * @param ports - the fleet the shell mounts over.
 * @returns the facts.
 */
export function chromeFacts(ports: { readonly hosts: readonly HostRecord[] }): Preconditions {
  return { hasHosts: ports.hosts.length > 0, hostState: 'unknown', running: false }
}

/** What the shell's surfaces share: the fleet they read, the plane they spend through, and the facts the fleet holds. */
export interface ShellContext {
  readonly ports: { readonly hosts: readonly HostRecord[] }
  readonly runtime: AppRuntime
  readonly clients: HostClients
  readonly store: FleetStore
  readonly t: Translate
  /** How the host a control names reads, as the fleet last saw it. */
  readonly stateOf: (hostId: string) => HostState
  /** Whether the session a control names is running, as the fleet last read it. */
  readonly runningOf: (hostId: string, sessionId: string) => boolean
}

/**
 * Read the shared context out of the fleet: how each host reads, and whether
 * the session a control names is running, as the fleet last saw them.
 * @param ports - the fleet the shell mounts over.
 * @param runtime - the action plane every control spends through.
 * @param clients - the connections every surface shares.
 * @param store - the fleet the surfaces read.
 * @param t - copy source.
 * @returns the shared context.
 */
export function createShellContext(
  ports: { readonly hosts: readonly HostRecord[] },
  runtime: AppRuntime,
  clients: HostClients,
  store: FleetStore,
  t: Translate,
): ShellContext {
  return {
    ports,
    runtime,
    clients,
    store,
    t,
    stateOf: (hostId) => store.getState().entries.find((entry) => entry.host.id === hostId)?.state ?? 'unknown',
    runningOf: (hostId, sessionId) =>
      store
        .getState()
        .entries.find((entry) => entry.host.id === hostId)
        ?.sessions.some((session) => session.sessionId === sessionId && session.running) ?? false,
  }
}

/**
 * The new-session dialog's ports: the fleet to choose from, and the spawn the
 * plane prices and carries out.
 * @param cx - the shell's shared context.
 * @returns the dialog's ports.
 */
export function spawnPorts(cx: ShellContext): SpawnPorts {
  return {
    hosts: cx.ports.hosts,
    create: (hostId, preset, cwd) =>
      cx.runtime.dispatcher.dispatch(ACTIONS['spawn.create'], { hostId, preset, cwd }, chromeFacts(cx.ports)),
  }
}

/**
 * The compose sheet's target: the session it names, and the send the plane
 * prices and carries out.
 * @param cx - the shell's shared context.
 * @param hostId - the host that owns the session.
 * @param sessionId - the session to message.
 * @param title - the name the sheet is titled with.
 * @returns the sheet's target.
 */
export function composeTarget(cx: ShellContext, hostId: string, sessionId: string, title: string): ComposeTarget {
  return {
    title,
    send: (mode, text) => {
      const facts: Preconditions = {
        hasHosts: true,
        hostState: cx.stateOf(hostId),
        running: cx.runningOf(hostId, sessionId),
      }
      if (mode === 'queue') {
        return cx.runtime.dispatcher.dispatch(ACTIONS['compose.send'], { hostId, sessionId, text }, facts)
      }
      return cx.runtime.dispatcher.dispatch(ACTIONS['compose.steer'], { hostId, sessionId, text }, facts)
    },
  }
}

/**
 * The roster's row actions, which reach past the row into the plane: an open
 * hands the pane over, a message opens the compose sheet, and a stop is spent
 * against the host that owns the session. A row naming a host the fleet no
 * longer holds is refused by the plane rather than guessed at.
 * @param cx - the shell's shared context.
 * @param frame - the chrome the row actions report to.
 * @returns the roster's callbacks.
 */
export function fleetPorts(
  cx: ShellContext,
  frame: {
    readonly announce: (text: string) => void
    readonly showError: (message: string) => void
    readonly body: HTMLElement
  },
): FleetPorts {
  const { runtime, t } = cx
  const facts = (hostId: string, sessionId: string): Preconditions => ({
    hasHosts: true,
    hostState: cx.stateOf(hostId),
    running: cx.runningOf(hostId, sessionId),
  })
  const tell: OutcomeTell = { announce: frame.announce, fail: frame.showError }
  return {
    open: (hostId, sessionId) => {
      // The pane says where it is going while the client boots; a refusal the
      // plane answers replaces it with the failure, and a boot replaces it
      // with the client.
      const host = cx.ports.hosts.find((candidate) => candidate.id === hostId)
      if (host !== undefined) {
        frame.body.replaceChildren(
          el('div', { className: 'placeholder', text: t('shell.opening', { label: host.label }) }),
        )
      }
      runAction(runtime, ACTIONS['session.open'], { hostId, sessionId }, facts(hostId, sessionId), tell)
    },
    message: (hostId, session) => {
      runAction(
        runtime,
        ACTIONS['session.message'],
        {
          hostId,
          sessionId: session.sessionId,
          title: session.projections?.values?.title ?? t('sessions.untitled'),
        },
        facts(hostId, session.sessionId),
        tell,
      )
    },
    cancel: (hostId, sessionId): Promise<ActionOutcome> =>
      runtime.dispatcher.dispatch(ACTIONS['session.cancel'], { hostId, sessionId }, facts(hostId, sessionId)),
  }
}
