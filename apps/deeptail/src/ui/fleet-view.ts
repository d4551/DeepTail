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
import { settle } from '../reason.ts'
import type { FleetStore, HostEntry } from '../store.ts'
import { bindRovingFocus, type Disposer, el, screenReaderText } from './dom.ts'
import { focusedControl, restoreFocus } from './roster-focus.ts'
import { type RowHandlers, sessionRow } from './session-row.ts'
import { emptyRow, hostStateLabel, loadingRow, retryStrip } from './states.ts'

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
export function mountFleetView(container: HTMLElement, store: FleetStore, ports: FleetPorts, t: Translate): Disposer {
  const root = el('div', { className: 'roster', data: { deeptailFleet: '' } })
  container.append(root)

  const view: RosterView = {
    store,
    ports,
    t,
    mutations: { busy: false, failures: new Map() },
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
  const focused = focusedControl(root)
  root.replaceChildren()

  if (entries.length === 0) {
    root.append(emptyRow(view.t('status.empty')))
    return
  }

  const stops: HTMLButtonElement[] = []
  for (const entry of entries) {
    root.append(hostGroup(entry, stops, view))
  }
  bindRovingFocus(stops)
  restoreFocus(root, focused)
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
  group.append(groupHeading(entry, view.t))

  if (entry.phase.kind === 'pending') {
    // Empty is only empty once the read settles, so a cold start never
    // flashes "no sessions" at a host that is about to list twenty.
    group.append(loadingRow(view.t, 'sessions.loading'))
    return group
  }
  if (entry.phase.kind === 'failed') {
    group.append(
      retryStrip('partial', entry.phase.message, view.t('action.retry'), () => {
        // A roster read records its own failure on the row it belongs to, so
        // the promise it returns never rejects.
        view.store.refresh(entry.host.id)
      }),
    )
    return group
  }
  const stale = staleStrip(entry, view)
  if (stale !== undefined) group.append(stale)
  const failure = view.mutations.failures.get(entry.host.id)
  if (failure !== undefined) {
    group.append(
      retryStrip('partial', failure, view.t('action.retry'), () => {
        view.mutations.failures.delete(entry.host.id)
        view.store.refresh(entry.host.id)
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
 * The notice that what a host's rows show is no longer live.
 *
 * A dropped subscription left the last read on screen with nothing saying so:
 * the only change was the colour of a dot, and the rows went on looking
 * current while the stream retried behind them. A host whose read failed
 * outright already carries its own strip and does not need a second one.
 * @param entry - the host, its phase and its sessions.
 * @param view - the fleet, its copy and its mutation state.
 * @returns the strip, or undefined while the host is answering.
 */
function staleStrip(entry: HostEntry, view: RosterView): HTMLElement | undefined {
  if (entry.state !== 'offline' || entry.phase.kind !== 'ready') return undefined
  return retryStrip('partial', view.t('status.offline', { label: entry.host.label }), view.t('action.retry'), () => {
    view.store.refresh(entry.host.id)
  })
}

/**
 * A host's heading: its reachability dot, its label, and — once the read has
 * settled — how many sessions it holds.
 *
 * It is the group's heading in the document outline, not a styled `div`, so the
 * roster reads as a set of named sections rather than one flat list. The dot is
 * `aria-hidden` and the state travels beside it as text: the other three places
 * that draw this dot already do that, and this one did not, which left host
 * reachability conveyed by colour alone.
 * @param entry - the host, its phase and its sessions.
 * @param t - copy source.
 * @returns the heading.
 */
function groupHeading(entry: HostEntry, t: Translate): HTMLElement {
  const heading = el('h3', { className: 'group-title' })
  heading.append(
    el('span', { className: 'dot', aria: { hidden: 'true' }, data: { state: entry.state } }),
    el('span', { className: 'group-name', text: entry.host.label }),
    screenReaderText(hostStateLabel(t, entry.state)),
  )
  if (entry.phase.kind === 'ready') {
    const count = entry.sessions.length
    // A bare digit reads as part of the host's name. It is spoken as a counted
    // label beside the glyph, the way the dot is: `aria-label` on a `span` that
    // carries no role is prohibited, so the text is a real node.
    heading.append(
      el('span', { className: 'group-count', text: String(count), aria: { hidden: 'true' } }),
      screenReaderText(t('sessions.count', { count })),
    )
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
  // The seat is a `div`: a `span` is phrasing content and cannot hold the row's
  // block box, and the list itself carries a class so its rows are spaced by a
  // rule rather than sitting flush against one another.
  const list = el('div', { className: 'session-list', role: 'list', aria: { label: entry.host.label } })
  for (const session of entry.sessions) {
    const seat = el('div', { className: 'list-seat', role: 'listitem' })
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
      stopSession(entry, session, view)
    },
  }
}

/**
 * Stop one session, then re-read the host it belongs to.
 *
 * A failed cancel is reported on its own host rather than raised, so one
 * refused stop never blanks the fleet. Every arm settles, so a caller that
 * fires this from a click handler leaves no rejected promise behind.
 * @param entry - the host the session belongs to.
 * @param session - the session to stop.
 * @param view - the fleet, its copy and its mutation state.
 */
async function stopSession(entry: HostEntry, session: SessionSummary, view: RosterView): Promise<void> {
  const api = view.ports.apiFor(entry.host.id)
  const { mutations } = view
  if (api === undefined || mutations.busy) return
  mutations.busy = true
  mutations.failures.delete(entry.host.id)
  view.render()
  // A failed stop is reported on its own host rather than raised, so one
  // refused stop never blanks the fleet. The busy flag clears and the host
  // re-reads once the stop settles, so a second row action never races the
  // first and the failure stays visible beside the rows that still answer.
  const stopped = await settle(api.cancel(session.sessionId), view.t)
  if (stopped.ok) mutations.failures.delete(entry.host.id)
  else mutations.failures.set(entry.host.id, view.t('sessions.stopFailed', { message: stopped.message }))
  mutations.busy = false
  view.render()
  view.store.refresh(entry.host.id)
}
