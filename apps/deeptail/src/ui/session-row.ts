/**
 * One session, as the roster lists it.
 *
 * A row is a container, not a control: a button may never contain another
 * button, and the row's actions are real buttons, so the row's own gesture
 * lives in a sibling control beside them. That control is also the row's tab
 * stop, which is why it is collected as the row is built — a fleet of a hundred
 * sessions stays one stop in the page's tab order.
 *
 * @module
 */

import type { SessionSummary } from '../api.ts'
import type { Translate } from '../locales.ts'
import { button, el, screenReaderText } from './dom.ts'

/**
 * What a row's controls do, and whether its mutations may start.
 *
 * `busy` is read as the row is drawn: the fleet runs one mutation at a time and
 * rebuilds its rows whenever that changes.
 */
export interface RowHandlers {
  /** Hand this session off to the harness client on its host. */
  open(): void
  /** Message this session. */
  message(): void
  /** Stop this session. Reached only while the session is running. */
  stop(): void
  /** True while a mutation is in flight anywhere in the fleet. */
  readonly busy: boolean
}

/**
 * Build one session row.
 * @param hostId - the host the session belongs to.
 * @param session - the session to list.
 * @param t - copy source.
 * @param handlers - what the row's controls do.
 * @param stops - collects the row's open control, in display order, for the roster's roving tab stop.
 * @returns the row.
 */
export function sessionRow(
  hostId: string,
  session: SessionSummary,
  t: Translate,
  handlers: RowHandlers,
  stops: HTMLButtonElement[],
): HTMLElement {
  const row = el('div', {
    className: 'session-row',
    data: { deeptailSession: session.sessionId, deeptailHost: hostId },
  })
  const open = openControl(session, t, handlers.open)
  row.append(open, rowActions(session, t, handlers))
  stops.push(open)
  return row
}

/**
 * The row's own gesture, filling the width the actions leave.
 *
 * Its dot is `aria-hidden`, so whether the session is running is announced as
 * text rather than by colour alone.
 * @param session - the session the row lists.
 * @param t - copy source.
 * @param onOpen - what activation does.
 * @returns the control.
 */
function openControl(session: SessionSummary, t: Translate, onOpen: () => void): HTMLButtonElement {
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
  open.addEventListener('click', onOpen)
  return open
}

/**
 * The row's mutations: message always, stop only where there is something to
 * stop. Both go dark while another mutation is in flight, so a late outcome
 * cannot race a second one.
 * @param session - the session the row lists.
 * @param t - copy source.
 * @param handlers - what the controls do, and whether they are live.
 * @returns the actions.
 */
function rowActions(session: SessionSummary, t: Translate, handlers: RowHandlers): HTMLElement {
  const actions = el('span', { className: 'row-actions' })
  const message = button('row-action', t('chat.send'), handlers.message)
  message.dataset.deeptailAction = 'row-message'
  message.disabled = handlers.busy
  actions.append(message)

  if (session.running) {
    const stop = button('row-action', t('chat.cancel'), handlers.stop)
    stop.dataset.deeptailAction = 'row-stop'
    stop.disabled = handlers.busy
    actions.append(stop)
  }
  return actions
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
