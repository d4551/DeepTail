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
import type { FleetStore, HostEntry } from '../store.ts'
import { button, el, moveRovingFocus, screenReaderText } from './dom.ts'
import { emptyRow, loadingRow, warningRow } from './states.ts'

/** What the roster needs from the shell. */
export interface FleetPorts {
  apiFor(hostId: string): HostApi | undefined
  /** Hand this session off to the harness client on its host. */
  open(hostId: string, sessionId: string): void
  /** Message this session. */
  message(hostId: string, session: SessionSummary): void
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

  // One mutation at a time: while a cancel is in flight every other row action
  // is disabled, so a late outcome cannot race a second one.
  let busy = false
  /** Per-host mutation failures, shown beside the rows that still answer. */
  const failures = new Map<string, string>()

  const render = (): void => {
    const { entries } = store.getState()
    root.replaceChildren()

    if (entries.length === 0) {
      root.append(emptyRow(t('status.empty')))
      return
    }

    const stops: HTMLButtonElement[] = []
    for (const entry of entries) {
      root.append(renderGroup(entry, stops))
    }
    for (const [index, stop] of stops.entries()) {
      stop.tabIndex = index === 0 ? 0 : -1
      stop.addEventListener('keydown', (event) => {
        moveRovingFocus(event, stops, index)
      })
    }
  }

  const renderGroup = (entry: HostEntry, stops: HTMLButtonElement[]): HTMLElement => {
    const group = el('div', { className: 'host-group', data: { deeptailHost: entry.host.id } })
    const heading = el('div', { className: 'group-title' })
    heading.append(
      el('span', { className: 'dot', attrs: { 'aria-hidden': 'true' }, data: { state: entry.state } }),
      el('span', { className: 'group-name', text: entry.host.label }),
    )
    if (entry.phase.kind === 'ready') {
      heading.append(el('span', { className: 'group-count', text: String(entry.sessions.length) }))
    }
    group.append(heading)

    if (entry.phase.kind === 'pending') {
      // Empty is only empty once the read settles, so a cold start never
      // flashes "no sessions" at a host that is about to list twenty.
      group.append(loadingRow(t, 'sessions.loading'))
      return group
    }
    if (entry.phase.kind === 'failed') {
      group.append(
        warningRow(entry.phase.message, t('action.retry'), () => {
          void store.refresh(entry.host.id)
        }),
      )
      return group
    }
    const failure = failures.get(entry.host.id)
    if (failure !== undefined) {
      group.append(
        warningRow(failure, t('action.retry'), () => {
          failures.delete(entry.host.id)
          void store.refresh(entry.host.id)
        }),
      )
    }
    if (entry.sessions.length === 0) {
      group.append(emptyRow(t('sessions.empty')))
      return group
    }

    const list = el('div', { attrs: { role: 'list', 'aria-label': entry.host.label } })
    for (const session of entry.sessions) {
      const seat = el('span', { attrs: { role: 'listitem' } })
      seat.append(renderRow(entry, session, stops))
      list.append(seat)
    }
    group.append(list)
    return group
  }

  const renderRow = (entry: HostEntry, session: SessionSummary, stops: HTMLButtonElement[]): HTMLElement => {
    // The row is a container, not a control. A button may not contain another
    // button, and the row actions are real buttons, so the row's own gesture
    // lives in a sibling control that fills the remaining width.
    const row = el('div', {
      className: 'session-row',
      data: { deeptailSession: session.sessionId, deeptailHost: entry.host.id },
    })
    const running = session.running

    const open = el('button', { className: 'session-open' })
    open.type = 'button'
    open.append(
      el('span', {
        className: 'dot',
        attrs: { 'aria-hidden': 'true' },
        data: { state: running ? 'online' : 'unknown' },
      }),
      el('span', {
        className: 'session-title',
        text: session.projections?.values?.title ?? t('sessions.untitled'),
      }),
      screenReaderText(running ? t('sessions.running') : t('sessions.idle')),
      el('span', { className: 'session-time', text: relativeTime(session.updatedAt, t) }),
    )
    open.addEventListener('click', () => {
      ports.open(entry.host.id, session.sessionId)
    })
    row.append(open)

    const actions = el('span', { className: 'row-actions' })
    const message = button('row-action', t('chat.send'), () => {
      ports.message(entry.host.id, session)
    })
    message.dataset.deeptailAction = 'row-message'
    message.disabled = busy
    actions.append(message)

    if (running) {
      const stop = button('row-action', t('chat.cancel'), () => {
        void cancel(entry, session)
      })
      stop.dataset.deeptailAction = 'row-stop'
      stop.disabled = busy
      actions.append(stop)
    }
    row.append(actions)

    stops.push(open)
    return row
  }

  const cancel = async (entry: HostEntry, session: SessionSummary): Promise<void> => {
    const api = ports.apiFor(entry.host.id)
    if (api === undefined || busy) return
    busy = true
    failures.delete(entry.host.id)
    render()
    try {
      await api.cancel(session.sessionId)
      failures.delete(entry.host.id)
    } catch (reason) {
      // Swallowed deliberately: the operator is told in the roster instead, and
      // an escaping rejection here would be unhandled and silent.
      failures.set(entry.host.id, t('sessions.stopFailed', { message: describe(reason) }))
    } finally {
      busy = false
      render()
    }
    // Outside the catch so a refresh failure cannot replace the stop failure.
    await store.refresh(entry.host.id)
  }

  const unsubscribe = store.subscribe(render)
  render()

  return () => {
    unsubscribe()
    root.remove()
  }
}

/**
 * A short relative time, built from dictionary keys rather than
 * `toLocaleString`, which would follow the browser language and produce mixed
 * text after a locale switch.
 * @param at - epoch milliseconds.
 * @param t - copy source.
 * @returns the label.
 */
function relativeTime(at: number, t: Translate): string {
  const seconds = Math.max(0, Math.round((Date.now() - at) / 1000))
  if (seconds < 60) return t('time.now')
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return t('time.minutes', { n: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 24) return t('time.hours', { n: hours })
  return t('time.days', { n: Math.round(hours / 24) })
}

/**
 * The message a failure should be reported with.
 * @param reason - whatever was thrown.
 * @returns the text to show.
 */
function describe(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason)
}
