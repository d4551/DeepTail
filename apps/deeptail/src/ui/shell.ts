/**
 * The control-plane shell: a sidebar of hosts and their sessions, and a main
 * pane that hands a chosen session to the harness client on its own host.
 *
 * Every control the shell draws spends through the action plane. Painting may
 * disable a control, but the dispatcher re-reads the world at activation,
 * which is the moment the answer is still true.
 *
 * @module
 */

import { ACTIONS } from '../actions/registry.ts'
import type { HostRecord } from '../host.ts'
import type { Translate } from '../locales.ts'
import { DATA } from '../markers.ts'
import { type AppRuntime, type OutcomeTell, runAction } from '../runtime.ts'
import { createFleetStore } from '../store.ts'
import type { CarrierHooks } from '../transport.ts'
import { openComposeSheet } from './compose-sheet.ts'
import { mountConnectionMenu } from './connection-menu.ts'
import { button, type Disposer, el } from './dom.ts'
import { mountFleetView } from './fleet-view.ts'
import { openNewSession } from './new-session.ts'
import {
  chromeFacts,
  composeTarget,
  createHostClients,
  createShellContext,
  fleetPorts,
  type ShellContext,
  spawnPorts,
  subscribeHostRosters,
} from './shell-fleet.ts'
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
}

/**
 * Mount the shell.
 * @param container - the application root.
 * @param ports - the fleet the shell mounts over.
 * @param runtime - the action plane every control spends through.
 * @param t - copy source.
 * @param notice - a failure to report, when one preceded the mount.
 * @returns a disposer.
 */
export function mountShell(
  container: HTMLElement,
  ports: ShellPorts,
  runtime: AppRuntime,
  t: Translate,
  notice?: string,
): Disposer {
  const clients = createHostClients((host) => ports.carrierFor(host))
  const store = createFleetStore(ports.hosts, { apiFor: clients.apiFor })
  const frame = mountShellFrame(container, t, {
    runtime,
    facts: chromeFacts(ports),
    tell: () => ({ announce: frame.announce, fail: frame.showError }),
  })
  const cx = createShellContext(ports, runtime, clients, store, t)
  bindShellDeps(cx, frame)

  const connection = mountHostSwitcher(cx, frame)
  const rosterSeat = el('div', { className: 'roster-seat' })
  frame.sidebar.append(
    newSessionButton(cx, frame),
    el('h2', { className: 'section-header', text: cx.t('shell.sessionsSection') }),
    rosterSeat,
  )

  const disposeRoster = mountFleetView(rosterSeat, store, fleetPorts(cx, frame), cx.t)
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
 * Bind the shell's slots of the action plane: the surfaces only the shell can
 * open, and the host work only the shell's shared clients can carry.
 * @param cx - the shell's shared context.
 * @param frame - the chrome the shell's surfaces report to.
 */
function bindShellDeps(cx: ShellContext, frame: ShellFrame): void {
  const { runtime, clients, t } = cx
  const hostById = new Map(cx.ports.hosts.map((host) => [host.id, host]))
  // The dispatcher's own handler screens a host the registry no longer holds;
  // this arm is the race a vanishing host leaves behind, reported rather than
  // swallowed.
  const hostOf = (hostId: string): HostRecord => {
    const host = hostById.get(hostId)
    if (host === undefined) throw new Error(`deeptail: no host ${hostId} to act on`)
    return host
  }
  runtime.deps.setDrawer = frame.setDrawer
  runtime.deps.openSpawn = () => {
    openNewSession(spawnPorts(cx), t, frame.announce)
  }
  runtime.deps.openCompose = (hostId, sessionId, title) => {
    openComposeSheet(composeTarget(cx, hostId, sessionId, title), t, frame.announce)
  }
  runtime.deps.spawn = (hostId, preset, cwd) => {
    // A field left empty is a field the host composes its default for, so it
    // is omitted rather than sent empty.
    const input = {
      ...(preset === '' ? {} : { agentPreset: preset }),
      ...(cwd === '' ? {} : { cwd }),
    }
    return clients.apiFor(hostOf(hostId)).createSession(input)
  }
  runtime.deps.message = async (hostId, sessionId, text, mode) => {
    await clients.apiFor(hostOf(hostId)).prompt(sessionId, text, mode)
  }
  runtime.deps.cancel = async (hostId, sessionId) => {
    await clients.apiFor(hostOf(hostId)).cancel(sessionId)
  }
}

/**
 * Mount the host switcher, which owns which host the operator has selected.
 *
 * Choosing a host re-reads its roster, so the fleet answers for how it stands
 * now rather than leaving the snapshot a passing outage left behind. The
 * selection is the plane's `activeHostId` fact: the switcher holds it, and
 * every precondition that needs it reads it here.
 * @param cx - the shell's shared context.
 * @param frame - the chrome the switcher sits in and reports failures to.
 * @returns a render hook for when the fleet changes, and a disposer.
 */
function mountHostSwitcher(cx: ShellContext, frame: ShellFrame): { render: () => void; dispose: Disposer } {
  const { runtime, ports, store } = cx
  let activeHostId = ports.hosts[0]?.id
  const facts = (hostId: string) => ({
    hasHosts: ports.hosts.length > 0,
    hostState: cx.stateOf(hostId),
    // The switcher's context holds no session, so nothing is running in it.
    running: false,
  })
  const tell: OutcomeTell = { announce: frame.announce, fail: frame.showError }
  const menu = mountConnectionMenu(
    frame.sidebar,
    {
      hosts: () => ports.hosts,
      stateOf: cx.stateOf,
      activeHostId: () => activeHostId,
      select: (hostId) => {
        runAction(runtime, ACTIONS['connection.select'], { hostId }, facts(hostId), tell)
      },
      pair: () => {
        runAction(runtime, ACTIONS['connection.pair'], undefined, facts(activeHostId ?? ''), tell)
      },
      repair: (hostId) => {
        runAction(runtime, ACTIONS['connection.repair'], { hostId }, facts(hostId), tell)
      },
      unpair: (hostId) => {
        runAction(runtime, ACTIONS['connection.unpair'], { hostId }, facts(hostId), tell)
      },
    },
    cx.t,
  )
  runtime.deps.activeHostId = () => activeHostId
  runtime.deps.select = (hostId) => {
    activeHostId = hostId
    store.refresh(hostId)
    menu.render()
  }
  return menu
}

/**
 * The action that opens the spawn dialog, disabled while nothing is paired
 * because there is no host to spawn one on.
 * @param cx - the shell's shared context.
 * @param frame - the chrome the action reports to.
 * @returns the button.
 */
function newSessionButton(cx: ShellContext, frame: ShellFrame): HTMLButtonElement {
  const { runtime, ports } = cx
  const spawn = button('new-session', cx.t('shell.newSession'), () => {
    runAction(runtime, ACTIONS['session.spawn'], undefined, chromeFacts(ports), {
      announce: frame.announce,
      fail: frame.showError,
    })
  })
  spawn.dataset[DATA.action] = ACTIONS['session.spawn'].marker
  spawn.disabled = ports.hosts.length === 0
  return spawn
}
