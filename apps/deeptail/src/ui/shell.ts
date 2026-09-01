/**
 * The control-plane shell: a sidebar of hosts and their sessions, and a main
 * pane that hands a chosen session to the harness client on its own host.
 *
 * @module
 */

import { createHostApi, type HostApi } from '../api.ts'
import type { HostRecord } from '../host.ts'
import type { Translate } from '../locales.ts'
import { createFleetStore, type FleetState } from '../store.ts'
import { type HostEvent, subscribeRoster } from '../stream.ts'
import type { CarrierHooks } from '../transport.ts'
import { openComposeSheet } from './compose-sheet.ts'
import { mountConnectionMenu } from './connection-menu.ts'
import { button, el } from './dom.ts'
import { mountFleetView } from './fleet-view.ts'
import { openNewSession } from './new-session.ts'
import '../styles/tokens.css'
import '../styles/picker.css'
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
  /** Forget a host. */
  unpair(hostId: string): Promise<void>
}

/**
 * Mount the shell.
 * @param container - the application root.
 * @param ports - application callbacks.
 * @param t - copy source.
 * @returns a disposer.
 */
export function mountShell(container: HTMLElement, ports: ShellPorts, t: Translate): () => void {
  const carriers = new Map<string, CarrierHooks>()
  const apis = new Map<string, HostApi>()
  const hostById = new Map(ports.hosts.map((host) => [host.id, host]))

  const carrierFor = (host: HostRecord): CarrierHooks => {
    const existing = carriers.get(host.id)
    if (existing !== undefined) return existing
    const created = ports.carrierFor(host)
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

  const store = createFleetStore(ports.hosts, { apiFor })
  const stateNow = (): FleetState => store.getState()
  let activeHostId = ports.hosts[0]?.id

  // ── layout ──────────────────────────────────────────────────────────────
  const shell = el('div', { className: 'shell', data: { deeptailShell: '' } })
  const scrim = el('div', { className: 'drawer-scrim' })
  const sidebar = el('nav', { className: 'sidebar', attrs: { 'aria-label': t('shell.sessions') } })
  const main = el('main', { className: 'main' })

  const brandRow = el('div', { className: 'brand-row' })
  brandRow.append(el('h1', { className: 'brand-name', text: t('app.name') }))
  const drawerToggle = button('icon-button drawer-toggle', t('shell.sessions'), () => {
    shell.dataset.drawer = shell.dataset.drawer === 'open' ? 'closed' : 'open'
  })
  drawerToggle.setAttribute('aria-controls', 'deeptail-sidebar')

  const live = el('div', { className: 'visually-hidden', attrs: { role: 'status' } })
  const announce = (text: string): void => {
    live.textContent = text
  }

  sidebar.id = 'deeptail-sidebar'
  sidebar.append(brandRow)

  const connection = mountConnectionMenu(
    sidebar,
    {
      hosts: () => ports.hosts,
      stateOf: (hostId) => stateNow().entries.find((entry) => entry.host.id === hostId)?.state ?? 'unknown',
      activeHostId: () => activeHostId,
      select: (hostId) => {
        activeHostId = hostId
        void store.refresh(hostId)
        connection.render()
      },
      pair: ports.pair,
      unpair: (hostId) => {
        void ports.unpair(hostId)
      },
    },
    t,
  )

  const spawn = button('new-session', t('shell.newSession'), () => {
    openNewSession({ hosts: ports.hosts, apiFor }, t, announce)
  })
  spawn.dataset.deeptailAction = 'new-session'
  spawn.disabled = ports.hosts.length === 0
  sidebar.append(spawn)
  sidebar.append(el('div', { className: 'section-header', text: t('shell.sessions') }))

  const rosterSeat = el('div', { className: 'roster-seat' })
  sidebar.append(rosterSeat)

  const header = el('div', { className: 'main-header' })
  header.append(drawerToggle, el('h2', { className: 'main-title', text: t('shell.sessions') }))
  const body = el('div', { className: 'main-body' })
  body.append(el('div', { className: 'placeholder', text: t('shell.pickSession') }))
  main.append(header, body, live)

  shell.append(scrim, sidebar, main)
  container.replaceChildren(shell)
  scrim.addEventListener('click', () => {
    shell.dataset.drawer = 'closed'
  })

  // ── data ────────────────────────────────────────────────────────────────
  const disposeRoster = mountFleetView(
    rosterSeat,
    store,
    {
      apiFor: (hostId) => {
        const host = hostById.get(hostId)
        return host === undefined ? undefined : apiFor(host)
      },
      open: (hostId, sessionId) => {
        const host = hostById.get(hostId)
        if (host === undefined) return
        body.replaceChildren(el('div', { className: 'placeholder', text: t('shell.opening', { label: host.label }) }))
        void ports.open(host, sessionId).catch((reason: unknown) => {
          const message = reason instanceof Error ? reason.message : String(reason)
          const failure = el('div', { className: 'error', text: message, attrs: { role: 'alert' } })
          failure.dataset.deeptailState = 'open-error'
          body.replaceChildren(failure)
        })
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
          announce,
        )
      },
    },
    t,
  )

  const unsubscribeConnection = store.subscribe(connection.render)

  // Each host gets its own roster subscription; a host that never answers
  // leaves the others live.
  const rosterDisposers = ports.hosts.map((host) =>
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
  for (const host of ports.hosts) void store.refresh(host.id)

  return () => {
    for (const dispose of rosterDisposers) dispose()
    unsubscribeConnection()
    disposeRoster()
    connection.dispose()
    shell.remove()
  }
}
