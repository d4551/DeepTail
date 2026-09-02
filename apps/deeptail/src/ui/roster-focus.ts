/**
 * Keeping the operator's place while the roster is rebuilt.
 *
 * Every forwarded event replaces every row, so without this a message arriving
 * while someone is arrow-keying the list drops focus to the document and resets
 * the roving stop to the top.
 *
 * @module
 */

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
  const session = row?.dataset.deeptailSession
  if (session === undefined) return undefined
  return { session, action: active.dataset.deeptailAction ?? 'open' }
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
  const target =
    focused.action === 'open'
      ? row.querySelector<HTMLButtonElement>('.session-open')
      : row.querySelector<HTMLButtonElement>(`[data-deeptail-action="${CSS.escape(focused.action)}"]`)
  if (target === null || target === undefined) return
  const stop = row.querySelector<HTMLButtonElement>('.session-open')
  if (stop !== null) {
    for (const other of root.querySelectorAll<HTMLButtonElement>('.session-open')) other.tabIndex = -1
    stop.tabIndex = 0
  }
  target.focus()
}
