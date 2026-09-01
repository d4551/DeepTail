/**
 * The reactive states every surface must be able to render.
 *
 * The vocabulary is the harness's: a list is *pending* until its read settles,
 * so an empty result never flashes "nothing here" on a cold start, and a
 * failure carries its own retry rather than replacing the whole screen.
 *
 * @module
 */

import type { Translate } from '../locales.ts'
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
  const row = el('div', { className: 'centered', data: { deeptailState: 'loading' }, attrs: { role: 'status' } })
  row.append(el('div', { className: 'spinner' }), el('div', { className: 'status', text: t(key) }))
  return row
}

/**
 * A row announcing that a settled read found nothing.
 * @param text - the already-localized message.
 * @returns the row.
 */
export function emptyRow(text: string): HTMLElement {
  return el('div', { className: 'status', text, data: { deeptailState: 'empty' }, attrs: { role: 'status' } })
}

/**
 * A per-host warning that sits beside the hosts that answered.
 *
 * Partial failure is a warning next to working content, never a whole-screen
 * error: one unreachable host must not blank the rest of the fleet.
 * @param message - the failure text.
 * @param retryLabel - localized retry label.
 * @param onRetry - what retry does.
 * @returns the strip.
 */
export function warningRow(message: string, retryLabel: string, onRetry: () => void): HTMLElement {
  const strip = el('div', {
    className: 'warning',
    text: message,
    data: { deeptailState: 'partial' },
    attrs: { role: 'status' },
  })
  strip.append(button('retry', retryLabel, onRetry))
  return strip
}

/**
 * The localized label for a host state, announced as text beside the
 * `aria-hidden` dot so status is never colour alone.
 * @param t - copy source.
 * @param state - the host's reachability.
 * @returns the label.
 */
export function hostStateLabel(t: Translate, state: HostState): string {
  switch (state) {
    case 'online':
      return t('host.state.online')
    case 'offline':
      return t('host.state.offline')
    case 'unauthorized':
      return t('host.state.unauthorized')
    case 'unknown':
      return t('host.state.unknown')
    default:
      throw new Error(`deeptail: unknown host state ${String(state)}`)
  }
}
