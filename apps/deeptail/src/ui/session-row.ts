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
  wireRowKeys(row)
  stops.push(open)
  return row
}

/**
 * Move along the row with the arrow keys.
 *
 * The actions share the row's single tab stop, so a fleet of a hundred sessions
 * is a hundred stops rather than three hundred. Reaching them is the same
 * gesture a toolbar uses: along the row to enter, back to leave.
 *
 * An arrow key names a direction on the screen, not a position in the markup,
 * so under a right-to-left script — where the row is drawn mirrored — the two
 * keys swap. Following the markup instead would walk the row backwards for
 * every reader of Arabic or Hebrew.
 * @param row - the row to wire.
 */
function wireRowKeys(row: HTMLElement): void {
  row.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    const controls = [...row.querySelectorAll<HTMLButtonElement>('.session-open, .row-action')].filter(
      (control) => !control.disabled,
    )
    // Narrowed rather than asserted: focus may sit anywhere, and a cast would
    // claim the control is a button before anything has checked that it is.
    const active = document.activeElement
    if (!(active instanceof HTMLButtonElement)) return
    const here = controls.indexOf(active)
    if (here === -1) return
    const forwards = event.key === (getComputedStyle(row).direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight')
    const next = controls[here + (forwards ? 1 : -1)]
    if (next === undefined) return
    event.preventDefault()
    next.focus()
  })
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
      aria: { hidden: 'true' },
      data: { state: running ? 'online' : 'unknown' },
    }),
    el('span', { className: 'session-title', text: sessionTitle(session, t) }),
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
  // Every row's actions read "Send" and "Stop", so across a fleet they are N
  // identical names with nothing saying which session is about to be
  // interrupted. The visible text stays short; the name carries the session.
  const title = sessionTitle(session, t)
  const message = button('row-action', t('sessions.messageAction'), handlers.message, {
    aria: { label: t('sessions.messageAria', { title }) },
  })
  message.tabIndex = -1
  message.dataset.deeptailAction = 'row-message'
  message.disabled = handlers.busy
  actions.append(message)

  if (session.running) {
    const stop = button('row-action', t('sessions.stop'), handlers.stop, {
      aria: { label: t('sessions.stopAria', { title }) },
    })
    stop.tabIndex = -1
    stop.dataset.deeptailAction = 'row-stop'
    stop.disabled = handlers.busy
    actions.append(stop)
  }
  return actions
}

/**
 * The name a session is known by, which is what every control about it is
 * named after.
 * @param session - the session the row lists.
 * @param t - copy source.
 * @returns the title, or the placeholder for a session that has none yet.
 */
function sessionTitle(session: SessionSummary, t: Translate): string {
  return session.projections?.values?.title ?? t('sessions.untitled')
}

/**
 * One age formatter per locale.
 *
 * Every roster event rebuilds every row, so a formatter built per row is one
 * ICU object per session per event. There are two locales and they never
 * change within a session.
 */
const AGE_FORMATS = new Map<string, Intl.RelativeTimeFormat>()

/**
 * The age formatter for one locale, built once.
 * @param locale - the locale the copy source speaks.
 * @returns the formatter.
 */
function ageFormat(locale: string): Intl.RelativeTimeFormat {
  const held = AGE_FORMATS.get(locale)
  if (held !== undefined) return held
  const made = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'narrow' })
  AGE_FORMATS.set(locale, made)
  return made
}

/** The units a roster age is reported in, largest first, with their lengths. */
const AGE_UNITS: readonly (readonly [Intl.RelativeTimeFormatUnit, number])[] = [
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
]

/**
 * A short relative time.
 *
 * The wording, the plural rules and the ordering all belong to the platform,
 * which is given the locale the copy source speaks — so this cannot drift with
 * the browser's own language the way `toLocaleString` would, and a locale added
 * to the dictionary needs no time strings written for it.
 * @param at - epoch milliseconds.
 * @param t - copy source, which names the locale to format in.
 * @returns the label.
 */
function relativeTime(at: number, t: Translate): string {
  const format = ageFormat(t.locale)
  const seconds = Math.max(0, Math.round((Date.now() - at) / 1000))
  for (const [unit, length] of AGE_UNITS) {
    if (seconds >= length) return format.format(-Math.round(seconds / length), unit)
  }
  return format.format(0, 'second')
}
