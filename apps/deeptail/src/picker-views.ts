/**
 * The views the picker draws over a roster read: loading, failed, empty, and
 * the host list itself. The one view a viewer types into is the pairing form,
 * which lives beside these in `./picker-pair-form.ts`.
 *
 * Framework-free by necessity — the picker paints before any harness bundle
 * has loaded — so these build DOM directly, in the idiom the harness boot page
 * uses: `textContent` never `innerHTML`, and `replaceChildren` for whole-state
 * swaps.
 *
 * A view knows only what it is drawing and what its controls invoke; it never
 * reaches back into the work that produced the state it is handed.
 *
 * @module
 */

import type { HostRecord } from './host.ts'
import type { PickerKey, Translate } from './locales.ts'
import { bindRovingFocus, el } from './ui/dom.ts'
import type { HostState } from './ui/states.ts'

/** The localized key for one host state's spoken label. */
const STATE_KEYS: Readonly<Record<HostState, PickerKey>> = {
  online: 'host.state.online',
  offline: 'host.state.offline',
  unauthorized: 'host.state.unauthorized',
  unknown: 'host.state.unknown',
}

/** What every picker view needs from its surroundings. */
export interface PickerContext {
  /** Copy source. */
  readonly t: Translate
  /** Reachability per host, filled in as probes settle. */
  readonly states: ReadonlyMap<string, HostState>
}

/** What the host-list view needs beyond {@link PickerContext}. */
interface ListContext extends PickerContext {
  /** The hosts to lay out. */
  readonly hosts: readonly HostRecord[]
  /** Called with the host a viewer activated. */
  pick(host: HostRecord): void
  /** Called when the viewer asks to pair another host. */
  startPairing(hosts: readonly HostRecord[]): void
}

/**
 * The loading announcement.
 * @param t - copy source.
 * @returns the row.
 */
export function loadingView(t: Translate): HTMLElement {
  const row = el('div', { className: 'centered' })
  row.dataset.deeptailState = 'loading'
  row.append(el('div', { className: 'spinner' }), el('div', { className: 'status', text: t('status.loading') }))
  return row
}

/**
 * The failed-read strip, carrying its own retry.
 * @param t - copy source.
 * @param message - the host's own failure text.
 * @param onRetry - what retry does.
 * @returns the strip.
 */
export function failedView(t: Translate, message: string, onRetry: () => void): HTMLElement {
  const strip = el('div', { className: 'error', text: message })
  strip.dataset.deeptailState = 'error'
  strip.setAttribute('role', 'alert')
  const retry = el('button', { className: 'retry', text: t('action.retry') })
  retry.type = 'button'
  retry.addEventListener('click', onRetry)
  strip.append(retry)
  return strip
}

/**
 * The nothing-paired call to action: with nothing paired there is nothing to
 * choose between, so the screen is the pairing call to action rather than an
 * empty list beside a button.
 * @param t - copy source.
 * @param onPair - what the call to action does.
 * @returns the announcement, the lede and the action.
 */
export function emptyView(t: Translate, onPair: () => void): HTMLElement[] {
  const status = el('div', { className: 'status', text: t('status.empty') })
  status.dataset.deeptailState = 'empty'
  status.setAttribute('role', 'status')
  const lede = el('p', { className: 'lede', text: t('empty.lede') })
  const add = el('button', { className: 'button button-primary', text: t('action.pair') })
  add.type = 'button'
  add.addEventListener('click', onPair)
  const actions = el('div', { className: 'actions' })
  actions.append(add)
  return [status, lede, actions]
}

/**
 * One host row: decorative dot, label, origin, and the spoken state beside it.
 * @param ctx - copy and reachability.
 * @param host - the host to draw.
 * @param onPick - called when the row is activated.
 * @returns the row and the listitem seat it sits in.
 */
function hostRow(
  ctx: PickerContext,
  host: HostRecord,
  onPick: (host: HostRecord) => void,
): { readonly row: HTMLButtonElement; readonly seat: HTMLElement } {
  const seat = el('span')
  seat.setAttribute('role', 'listitem')
  const row = el('button', { className: 'row' })
  row.type = 'button'
  row.dataset.deeptailHost = host.id

  const reachability = ctx.states.get(host.id) ?? 'unknown'
  const dot = el('span', { className: 'dot' })
  dot.dataset.state = reachability
  dot.setAttribute('aria-hidden', 'true')

  const text = el('span', { className: 'row-text' })
  text.append(
    el('span', { className: 'row-label', text: host.label }),
    el('span', { className: 'row-origin', text: host.origin }),
  )

  // The dot is decorative; the state is announced as text beside it.
  const spoken = el('span', { className: 'visually-hidden', text: ctx.t(STATE_KEYS[reachability]) })
  row.append(dot, text, spoken)
  row.addEventListener('click', () => onPick(host))
  seat.append(row)
  return { row, seat }
}

/**
 * The host list, with roving focus and the pair-another footer.
 *
 * The rows are bound once the list is complete, so the arrow keys move over the
 * final ordering rather than a partial one.
 * @param ctx - the hosts to lay out and what their controls invoke.
 * @returns the lede, the list and the footer.
 */
export function listView(ctx: ListContext): HTMLElement[] {
  const lede = el('p', { className: 'lede', text: ctx.t('picker.lede') })
  const list = el('div', { className: 'list' })
  list.dataset.deeptailState = 'ready'
  list.setAttribute('role', 'list')
  list.setAttribute('aria-label', ctx.t('picker.aria'))

  const rows: HTMLButtonElement[] = []
  for (const host of ctx.hosts) {
    const { row, seat } = hostRow(ctx, host, ctx.pick)
    rows.push(row)
    list.append(seat)
  }
  bindRovingFocus(rows)

  const add = el('button', { className: 'button button-outline', text: ctx.t('action.pair') })
  add.type = 'button'
  add.addEventListener('click', () => {
    ctx.startPairing(ctx.hosts)
  })
  const footer = el('div', { className: 'footer' })
  footer.append(add)
  return [lede, list, footer]
}
