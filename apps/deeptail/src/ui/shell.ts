/**
 * The control-plane shell: a sidebar of hosts and their sessions, and a main
 * pane that hands a chosen session to the harness client on its own host.
 *
 * @module
 */

import { ACTIONS } from '../actions/registry.ts'
import { createHostApi, type HostApi } from '../api.ts'
import type { HostRecord } from '../host.ts'
import type { Translate } from '../locales.ts'
import { reportSettled } from '../reason.ts'
import { createFleetStore, type FleetState, type FleetStore } from '../store.ts'
import { type HostEvent, subscribeRoster } from '../stream.ts'
import type { CarrierHooks } from '../transport.ts'
import { openComposeSheet } from './compose-sheet.ts'
import { mountConnectionMenu } from './connection-menu.ts'
import { button, type Disposer, el } from './dom.ts'
import { type FleetPorts, mountFleetView } from './fleet-view.ts'
import { openNewSession, type SpawnPorts } from './new-session.ts'
import { mountShellFrame, type ShellFrame } from './shell-frame.ts'
import '../styles/tokens.css'
import '../styles/picker.css'
import '../styles/picker-form.css'
import '../styles/sidebar.css'
import '../styles/roster.css'
import '../styles/dialogs.css'
import '../styles/shell.css'

/** What the shell needs from the application. */
export interface ShellPorts {
  /** Every paired host. */
  readonly hosts: readonly HostRecord[]
  /** The carrier reaching one host. */
  carrierFor(host: HostRecord): CarrierHooks
  /** Boot the harness client for a host, at a session when it can. */
  open(host: HostRecord, sessionId: string): Promise<void>
  /** Pair another host. */
  pair(): void
  /** Pair an already-known host again, clearing a revoked token. */
  repair(hostId: string): void
  /** Forget a host. */
  unpair(hostId: string): Promise<void>
}

/** The connections every surface shares with one host. */
interface HostClients {
  /** The carrier reaching one host. */
  carrierFor(host: HostRecord): CarrierHooks
  /** The Remote surface over that carrier. */
  apiFor(host: HostRecord): HostApi
}

/**
 * Mount the shell.
 * @param container - the application root.
 * @param ports - application callbacks.
 * @param t - copy source.
 * @param notice - a failure to report, when one preceded the mount.
 * @returns a disposer.
 */
export function mountShell(container: HTMLElement, ports: ShellPorts, t: Translate, notice?: string): Disposer {
  const clients = createHostClients((host) => ports.carrierFor(host))
  const store = createFleetStore(ports.hosts, { apiFor: clients.apiFor })

  const frame = mountShellFrame(container, t)
  const connection = mountHostSwitcher(frame, ports, store, t)
  const rosterSeat = el('div', { className: 'roster-seat' })
  frame.sidebar.append(
    newSessionButton({ hosts: ports.hosts, apiFor: clients.apiFor }, t, frame.announce),
    el('h2', { className: 'section-header', text: t('shell.sessionsSection') }),
    rosterSeat,
  )

  const disposeRoster = mountFleetView(rosterSeat, store, createFleetPorts(ports, frame, clients.apiFor, t), t)
  const unsubscribeConnection = store.subscribe(connection.render)
  const disposeStreams = subscribeHostRosters(ports.hosts, clients.carrierFor, store)
  // A failure that happened while no shell was mounted has nowhere else to land.
  if (notice !== undefined) frame.showError(notice)
  for (const host of ports.hosts) store.refresh(host.id)

  return () => {
    disposeStreams()
    unsubscribeConnection()
    disposeRoster()
    connection.dispose()
    frame.dispose()
  }
}

/**
 * Memoize the connections to each host, so the roster, the compose sheet and
 * the event streams all reach a host over the one carrier it already has.
 * @param connect - how to reach a host that has no carrier yet.
 * @returns the shared per-host clients.
 */
function createHostClients(connect: (host: HostRecord) => CarrierHooks): HostClients {
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
 * Mount the host switcher, which owns which host the operator has selected.
 *
 * Choosing a host re-reads its roster, so the fleet answers for how it stands
 * now rather than leaving the snapshot a passing outage left behind.
 * @param frame - the chrome the switcher sits in and reports failures to.
 * @param ports - application callbacks.
 * @param store - the fleet, read for each host's reachability.
 * @param t - copy source.
 * @returns a render hook for when the fleet changes, and a disposer.
 */
function mountHostSwitcher(
  frame: ShellFrame,
  ports: ShellPorts,
  store: FleetStore,
  t: Translate,
): { render: () => void; dispose: Disposer } {
  const stateNow = (): FleetState => store.getState()
  let activeHostId = ports.hosts[0]?.id
  const menu = mountConnectionMenu(
    frame.sidebar,
    {
      hosts: () => ports.hosts,
      stateOf: (hostId) => stateNow().entries.find((entry) => entry.host.id === hostId)?.state ?? 'unknown',
      activeHostId: () => activeHostId,
      select: (hostId) => {
        activeHostId = hostId
        store.refresh(hostId)
        menu.render()
      },
      pair: ports.pair,
      repair: ports.repair,
      unpair: (hostId) => {
        reportSettled(ports.unpair(hostId), t, frame.showError)
      },
    },
    t,
  )
  return menu
}

/**
 * The action that spawns a session, disabled while nothing is paired because
 * there is no host to spawn one on.
 * @param ports - the hosts to choose between, and their Remote surfaces.
 * @param t - copy source.
 * @param announce - live-region announcer.
 * @returns the button.
 */
function newSessionButton(ports: SpawnPorts, t: Translate, announce: (text: string) => void): HTMLButtonElement {
  const spawn = button('new-session', t('shell.newSession'), () => {
    openNewSession(ports, t, announce)
  })
  spawn.dataset.deeptailAction = ACTIONS['session.spawn'].marker
  spawn.disabled = ports.hosts.length === 0
  return spawn
}

/**
 * The roster's row actions, which reach past the row into the main pane: an
 * open takes the pane over, and a message opens the compose sheet against the
 * host that owns the session. A row naming a host the fleet no longer holds
 * does nothing rather than guessing at another one.
 * @param ports - application callbacks.
 * @param frame - the chrome the actions write into.
 * @param apiFor - the Remote surface for a host.
 * @param t - copy source.
 * @returns the roster's callbacks.
 */
function createFleetPorts(
  ports: ShellPorts,
  frame: ShellFrame,
  apiFor: (host: HostRecord) => HostApi,
  t: Translate,
): FleetPorts {
  const hostById = new Map(ports.hosts.map((host) => [host.id, host]))
  return {
    apiFor: (hostId) => {
      const host = hostById.get(hostId)
      return host === undefined ? undefined : apiFor(host)
    },
    open: (hostId, sessionId) => {
      const host = hostById.get(hostId)
      if (host === undefined) return
      handOff(host, sessionId, ports, frame, t)
    },
    message: (hostId, session) => {
      const host = hostById.get(hostId)
      if (host === undefined) return
      openComposeSheet(
        {
          api: apiFor(host),
          sessionId: session.sessionId,
          title: session.projections?.values?.title ?? t('sessions.untitled'),
        },
        t,
        frame.announce,
      )
    },
  }
}

/**
 * Hand a session to the harness client on its own host, keeping the main pane
 * on the outcome: a notice while the client boots, and the failure in its place
 * when the boot never arrives.
 * @param host - the host that owns the session.
 * @param sessionId - the session to open.
 * @param ports - application callbacks.
 * @param frame - the chrome whose main pane follows the hand-off.
 * @param t - copy source.
 */
function handOff(host: HostRecord, sessionId: string, ports: ShellPorts, frame: ShellFrame, t: Translate): void {
  frame.body.replaceChildren(el('div', { className: 'placeholder', text: t('shell.opening', { label: host.label }) }))
  reportSettled(ports.open(host, sessionId), t, (message) => {
    const failure = el('div', { className: 'error', text: message, role: 'alert' })
    failure.dataset.deeptailState = 'open-error'
    frame.body.replaceChildren(failure)
  })
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
function subscribeHostRosters(
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
