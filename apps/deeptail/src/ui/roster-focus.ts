/**
 * Keeping the operator's place while the roster is rebuilt.
 *
 * Every forwarded event replaces every row, so without this a message arriving
 * while someone is arrow-keying the list drops focus to the document and resets
 * the roving stop to the top.
 *
 * @module
 */

import { ACTIONS } from '../actions/registry.ts'

/** Where focus sits inside the roster, in terms that survive a rebuild. */
interface FocusedControl {
  readonly session: string
  readonly action: string
}

/**
 * The roster control holding focus, named by the row it belongs to.
 * @param root - the roster.
 * @returns the control, or undefined when focus is elsewhere.
 */
export function focusedControl(root: HTMLElement): FocusedControl | undefined {
  const active = document.activeElement
  if (!(active instanceof HTMLElement) || !root.contains(active)) return undefined
  const row = active.closest<HTMLElement>('[data-deeptail-session]')
  const session = row?.dataset['deeptailSession']
  if (session === undefined) return undefined
  // Every control in a row carries its registry marker, the open control
  // included, so the sentinel this used to invent for it is gone: a marker off
  // the union is what the restore below looks up, not a word chosen here.
  return { session, action: active.dataset['deeptailAction'] ?? ACTIONS['session.open'].marker }
}

/**
 * Put focus back on the rebuilt control it was on.
 *
 * The roving stop moves with it, so the next arrow key continues from where the
 * operator was rather than from the top of the roster.
 * @param root - the roster.
 * @param focused - where focus sat before the rebuild.
 */
export function restoreFocus(root: HTMLElement, focused: FocusedControl | undefined): void {
  if (focused === undefined) return
  const row = root.querySelector<HTMLElement>(`[data-deeptail-session="${CSS.escape(focused.session)}"]`)
  if (row === null) return
  const stop = row.querySelector<HTMLButtonElement>('.session-open')
  if (stop === null) return
  for (const other of root.querySelectorAll<HTMLButtonElement>('.session-open')) other.tabIndex = -1
  stop.tabIndex = 0
  // The row's own control is focused first, and unconditionally. A row's
  // actions are revealed by `:focus-within`, so on a rebuilt row — nothing
  // focused, no pointer over it — they are still `display: none`, and focusing
  // one is a no-op that drops the operator to the document body. Focusing the
  // open control is what reveals them.
  stop.focus()
  if (focused.action === ACTIONS['session.open'].marker) return
  const target = row.querySelector<HTMLButtonElement>(`[data-deeptail-action="${CSS.escape(focused.action)}"]`)
  if (target === null) return
  target.focus()
}

/**
 * Keep the roster reachable by keyboard whenever it is the only thing holding
 * its own scroll.
 *
 * A pane that scrolls and draws no control of its own cannot be scrolled from
 * a keyboard at all: there is nothing to tab to, and a wheel is a pointer.
 * That is the roster's loading and empty states — exactly the states a short
 * viewport makes scrollable. Once rows are drawn, tabbing through them scrolls
 * the pane, so the pane must not take a stop of its own: a focusable ancestor
 * of every row is a widget wrapped around widgets, which is its own defect.
 * @param root - the roster element.
 */
export function keepScrollReachable(root: HTMLElement): void {
  const control = root.querySelector('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
  if (control === null) root.tabIndex = 0
  else root.removeAttribute('tabindex')
}
