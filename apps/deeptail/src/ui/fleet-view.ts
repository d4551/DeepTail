/**
 * The cross-host session roster — the surface no single host can render.
 *
 * Sessions from every paired host, grouped by host, newest activity first.
 * A host that fails to answer renders a warning beside the hosts that did:
 * partial failure never blanks the fleet.
 *
 * @module
 */

import type { HostApi, SessionSummary } from '../api.ts'
import type { Translate } from '../locales.ts'
import { messageOf } from '../reason.ts'
import type { FleetStore, HostEntry } from '../store.ts'
import { bindRovingFocus, el } from './dom.ts'
import { type FocusedControl, focusedControl, restoreFocus } from './roster-focus.ts'
import { type RowHandlers, sessionRow } from './session-row.ts'
import { emptyRow, loadingRow, retryStrip } from './states.ts'

/** What the roster needs from the shell. */
export interface FleetPorts {
  apiFor(hostId: string): HostApi | undefined
  /** Hand this session off to the harness client on its host. */
  open(hostId: string, sessionId: string): void
  /** Message this session. */
  message(hostId: string, session: SessionSummary): void
}

/**
 * The mutation state a mounted roster carries between renders.
 *
 * One mutation at a time: while a cancel is in flight every other row action is
 * disabled, so a late outcome cannot race a second one. A cancel that fails is
 * held against its host and shown beside the rows that still answer.
 */
interface RosterMutations {
  /** True while a cancel is in flight. */
  busy: boolean
  /** Per-host mutation failures, keyed by host id. */
  readonly failures: Map<string, string>
  /**
   * The control focus is owed, held across the rebuilds it cannot be given in.
   *
   * A row action is disabled while its mutation runs, and focus cannot be given
   * to a disabled control, so without this the gesture that started the
   * mutation lost focus for good.
   */
  owed: FocusedControl | undefined
}

/**
 * Everything one mounted roster draws from and acts through: the fleet it
 * reads, the shell it hands sessions to, its copy, the mutation state its rows
 * observe, and the redraw a started or settled mutation triggers.
 */
interface RosterView {
  readonly store: FleetStore
  readonly ports: FleetPorts
  readonly t: Translate
  readonly mutations: RosterMutations
  /** Redraw every host group. */
  render(): void
}

/**
 * Mount the roster.
 * @param container - where to mount.
 * @param store - the fleet.
 * @param ports - shell callbacks.
 * @param t - copy source.
 * @returns a disposer.
 */
export function mountFleetView(container: HTMLElement, store: FleetStore, ports: FleetPorts, t: Translate): () => void {
  const root = el('div', { className: 'roster', data: { deeptailFleet: '' } })
  container.append(root)

  const view: RosterView = {
    store,
    ports,
    t,
    mutations: { busy: false, failures: new Map(), owed: undefined },
    render: () => {
      renderRoster(root, view)
    },
  }

  const unsubscribe = store.subscribe(view.render)
  view.render()

  return () => {
    unsubscribe()
    root.remove()
  }
}

/**
 * Draw every host group into the roster.
 * @param root - the roster element.
 * @param view - the fleet, its copy and its mutation state.
 */
function renderRoster(root: HTMLElement, view: RosterView): void {
  const { entries } = view.store.getState()
  // Every roster event rebuilds these rows, and one arriving while the operator
  // is on a row would otherwise drop focus to the document body and reset the
  // roving stop to the first row.
  // What is owed outranks where focus happens to be, because where it happens
  // to be is usually the fallback this function gave it last time. A deliberate
  // move to another row does outrank it: that is the operator's choice.
  const current = focusedControl(root)
  const focused = current !== undefined && current.session !== undefined ? current : (view.mutations.owed ?? current)
  root.replaceChildren()

  if (entries.length === 0) {
    root.append(emptyRow(view.t('status.empty')))
    view.mutations.owed = undefined
    return
  }

  const stops: HTMLButtonElement[] = []
  for (const entry of entries) {
    root.append(hostGroup(entry, stops, view))
  }
  bindRovingFocus(stops)
  view.mutations.owed = restoreFocus(root, focused)
}

/**
 * One host's block: its heading, then whatever its roster read produced.
 * @param entry - the host, its phase and its sessions.
 * @param stops - collects each row's open control for the roving tab stop.
 * @param view - the fleet, its copy and its mutation state.
 * @returns the group.
 */
function hostGroup(entry: HostEntry, stops: HTMLButtonElement[], view: RosterView): HTMLElement {
  const group = el('div', { className: 'host-group', data: { deeptailHost: entry.host.id } })
  group.append(groupHeading(entry))

  if (entry.phase.kind === 'pending') {
    // Empty is only empty once the read settles, so a cold start never
    // flashes "no sessions" at a host that is about to list twenty.
    group.append(loadingRow(view.t, 'sessions.loading'))
    return group
  }
  if (entry.phase.kind === 'failed') {
    group.append(
      retryStrip('partial', entry.phase.message, view.t('action.retry'), () => {
        void view.store.refresh(entry.host.id)
      }),
    )
    return group
  }
  const failure = view.mutations.failures.get(entry.host.id)
  if (failure !== undefined) {
    group.append(
      retryStrip('partial', failure, view.t('action.retry'), () => {
        view.mutations.failures.delete(entry.host.id)
        void view.store.refresh(entry.host.id)
      }),
    )
  }
  if (entry.sessions.length === 0) {
    group.append(emptyRow(view.t('sessions.empty')))
    return group
  }
  group.append(sessionList(entry, stops, view))
  return group
}

/**
 * A host's heading: its reachability dot, its label, and — once the read has
 * settled — how many sessions it holds.
 * @param entry - the host, its phase and its sessions.
 * @returns the heading.
 */
function groupHeading(entry: HostEntry): HTMLElement {
  const heading = el('div', { className: 'group-title' })
  heading.append(
    el('span', { className: 'dot', aria: { hidden: 'true' }, data: { state: entry.state } }),
    el('span', { className: 'group-name', text: entry.host.label }),
  )
  if (entry.phase.kind === 'ready') {
    heading.append(el('span', { className: 'group-count', text: String(entry.sessions.length) }))
  }
  return heading
}

/**
 * The host's rows, each seated in its own list item so assistive technology
 * counts sessions rather than the controls inside them.
 * @param entry - the host and its sessions.
 * @param stops - collects each row's open control for the roving tab stop.
 * @param view - the fleet, its copy and its mutation state.
 * @returns the list.
 */
function sessionList(entry: HostEntry, stops: HTMLButtonElement[], view: RosterView): HTMLElement {
  const list = el('div', { role: 'list', aria: { label: entry.host.label } })
  for (const session of entry.sessions) {
    const seat = el('span', { role: 'listitem' })
    seat.append(sessionRow(entry.host.id, session, view.t, rowHandlers(entry, session, view), stops))
    list.append(seat)
  }
  return list
}

/**
 * Bind one row's controls to the fleet. Opening and messaging go out to the
 * shell; stopping runs here, so its failure lands on the host it belongs to.
 * @param entry - the host the session belongs to.
 * @param session - the session the row lists.
 * @param view - the fleet, its copy and its mutation state.
 * @returns the row's handlers.
 */
function rowHandlers(entry: HostEntry, session: SessionSummary, view: RosterView): RowHandlers {
  return {
    busy: view.mutations.busy,
    open: () => {
      view.ports.open(entry.host.id, session.sessionId)
    },
    message: () => {
      view.ports.message(entry.host.id, session)
    },
    stop: () => {
      void cancelSession(entry, session, view)
    },
  }
}

/**
 * Stop one session, then re-read the host it belongs to.
 *
 * A cancel that fails is reported on its own host rather than raised, so one
 * refused stop never blanks the fleet.
 * @param entry - the host the session belongs to.
 * @param session - the session to stop.
 * @param view - the fleet, its copy and its mutation state.
 */
async function cancelSession(entry: HostEntry, session: SessionSummary, view: RosterView): Promise<void> {
  const api = view.ports.apiFor(entry.host.id)
  const { mutations } = view
  if (api === undefined || mutations.busy) return
  mutations.busy = true
  mutations.failures.delete(entry.host.id)
  view.render()
  try {
    await api.cancel(session.sessionId)
    mutations.failures.delete(entry.host.id)
  } catch (reason) {
    // Swallowed deliberately: the operator is told in the roster instead, and
    // an escaping rejection here would be unhandled and silent.
    mutations.failures.set(entry.host.id, view.t('sessions.stopFailed', { message: messageOf(reason) }))
  } finally {
    mutations.busy = false
    view.render()
  }
  // Outside the catch so a refresh failure cannot replace the stop failure.
  await view.store.refresh(entry.host.id)
}
