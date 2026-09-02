/**
 * The reactive states every surface must be able to render.
 *
 * The vocabulary is the harness's: a list is *pending* until its read settles,
 * so an empty result never flashes "nothing here" on a cold start, and a
 * failure carries its own retry rather than replacing the whole screen.
 *
 * @module
 */

import type { PickerKey, Translate } from '../locales.ts'
import { button, el } from './dom.ts'

/** Reachability of one host. */
export type HostState = 'unknown' | 'online' | 'unauthorized' | 'offline'

/** What a host's roster read is doing. */
export type Phase =
  | { readonly kind: 'pending' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'failed'; readonly message: string }

/**
 * A row announcing that something is loading.
 * @param t - copy source.
 * @param key - which loading message.
 * @returns the row.
 */
export function loadingRow(t: Translate, key: 'status.loading' | 'sessions.loading'): HTMLElement {
  const row = el('div', { className: 'centered', data: { deeptailState: 'loading' }, role: 'status' })
  row.append(el('div', { className: 'spinner' }), el('div', { className: 'status', text: t(key) }))
  return row
}

/**
 * A row announcing that a settled read found nothing.
 * @param text - the already-localized message.
 * @returns the row.
 */
export function emptyRow(text: string): HTMLElement {
  return el('div', { className: 'status', text, data: { deeptailState: 'empty' }, role: 'status' })
}

/**
 * How loudly a failed read is reported.
 *
 * Partial failure is a warning next to working content: one unreachable host
 * must not blank the rest of the fleet, and must not interrupt a reader who is
 * working in the part that answered. A read that produced no content at all has
 * nothing to sit beside, so it is the screen and it is announced.
 */
type Tone = 'partial' | 'error'

/** What each tone is drawn and announced as. */
const TONES: Readonly<Record<Tone, { readonly className: string; readonly role: string }>> = {
  partial: { className: 'error warning', role: 'status' },
  error: { className: 'error', role: 'alert' },
}

/**
 * A failed read, carrying the retry that clears it.
 *
 * Both surfaces report a failed read this way, so both report it the same way:
 * the host's own message, and a control that reads it again.
 * @param tone - whether this sits beside working content or replaces it.
 * @param message - the failure text, as the host gave it.
 * @param retryLabel - localized retry label.
 * @param onRetry - what retry does.
 * @returns the strip.
 */
export function retryStrip(tone: Tone, message: string, retryLabel: string, onRetry: () => void): HTMLElement {
  const strip = el('div', {
    className: TONES[tone].className,
    text: message,
    data: { deeptailState: tone },
    role: TONES[tone].role,
  })
  const retry = button('retry', retryLabel, onRetry)
  // Named so focus can be returned to it, or to what replaced it: activating a
  // retry starts a read that immediately removes the control that started it.
  retry.dataset.deeptailAction = 'retry'
  strip.append(retry)
  return strip
}

/** The dictionary key each host state is spoken with. */
const STATE_KEYS: Readonly<Record<HostState, PickerKey>> = {
  online: 'host.state.online',
  offline: 'host.state.offline',
  unauthorized: 'host.state.unauthorized',
  unknown: 'host.state.unknown',
}

/**
 * The localized label for a host state, announced as text beside the
 * `aria-hidden` dot so status is never colour alone.
 *
 * Both surfaces speak the same four states, from the one table: a second
 * mapping is four keys to keep in step by hand, and a state added to the type
 * is then a compile error in one place rather than a silent gap in the other.
 * @param t - copy source.
 * @param state - the host's reachability.
 * @returns the label.
 */
export function hostStateLabel(t: Translate, state: HostState): string {
  return t(STATE_KEYS[state])
}
