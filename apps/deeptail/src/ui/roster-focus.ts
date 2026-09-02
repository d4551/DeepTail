/**
 * Keeping the operator's place while the roster is rebuilt.
 *
 * Every forwarded event replaces every row, so without this a message arriving
 * while someone is arrow-keying the list drops focus to the document and resets
 * the roving stop to the top.
 *
 * Two rebuilds are harder than that one. A row action goes dark while its
 * mutation runs, and focus cannot be given to a disabled control — so the
 * gesture that started the mutation lost focus to the document and never got it
 * back, because by the time the control came alive again nothing remembered
 * where focus had been. And a failed read offers a retry that the read it starts
 * immediately replaces, so the control that was activated no longer exists.
 * Both are answered the same way: focus goes somewhere sensible and near, and
 * what was wanted is remembered until it can be given.
 *
 * @module
 */

/** Where focus sits inside the roster, in terms that survive a rebuild. */
export interface FocusedControl {
  /** The host whose group holds it. */
  readonly host: string
  /** The session row holding it, absent for a control the host group owns. */
  readonly session?: string
  /** Which control: `open`, a row action's name, or `retry`. */
  readonly action: string
}

/**
 * The roster control holding focus, named by the group and row it belongs to.
 * @param root - the roster.
 * @returns the control, or undefined when focus is elsewhere.
 */
export function focusedControl(root: HTMLElement): FocusedControl | undefined {
  const active = document.activeElement
  if (!(active instanceof HTMLElement) || !root.contains(active)) return undefined
  const host = active.closest<HTMLElement>('[data-deeptail-host]')?.dataset.deeptailHost
  if (host === undefined) return undefined
  const session = active.closest<HTMLElement>('[data-deeptail-session]')?.dataset.deeptailSession
  const action = active.dataset.deeptailAction ?? 'open'
  return session === undefined ? { host, action } : { host, session, action }
}

/**
 * Put focus back on the rebuilt control it was on.
 *
 * The roving stop moves with it, so the next arrow key continues from where the
 * operator was rather than from the top of the roster.
 * @param root - the roster.
 * @param focused - where focus sat before the rebuild, or what is still wanted.
 * @returns what still could not be given, to be tried again after the next
 *   rebuild; undefined once focus has landed where it was asked to.
 */
export function restoreFocus(root: HTMLElement, focused: FocusedControl | undefined): FocusedControl | undefined {
  if (focused === undefined) return undefined
  const group = root.querySelector<HTMLElement>(`[data-deeptail-host="${CSS.escape(focused.host)}"]`)
  if (group === null) return undefined
  return focused.session === undefined
    ? restoreInGroup(group, focused)
    : restoreInRow(root, group, focused, focused.session)
}

/**
 * Give focus back to a control the host group owns, or to the group itself.
 *
 * A retry replaces itself with the read it starts, so there is often nothing
 * left to focus. The group is made focusable for exactly that: focus stays on
 * the thing the operator acted on, and its new state is what gets announced.
 * @param group - the host group.
 * @param focused - what was wanted.
 * @returns undefined; a group is always there to fall back to.
 */
function restoreInGroup(group: HTMLElement, focused: FocusedControl): undefined {
  const control = group.querySelector<HTMLButtonElement>(`[data-deeptail-action="${CSS.escape(focused.action)}"]`)
  if (control !== null && !control.disabled) {
    control.focus()
    return undefined
  }
  group.tabIndex = -1
  group.focus()
  return undefined
}

/**
 * Park focus on the host group while its rows are away.
 * @param group - the host group.
 * @returns nothing.
 */
function parkOnGroup(group: HTMLElement): void {
  group.tabIndex = -1
  group.focus()
}

/**
 * Give focus back to a row's control, or as close to it as the row allows.
 * @param root - the roster, which owns the roving stop.
 * @param group - the host group the row belongs to.
 * @param focused - what was wanted.
 * @param session - the row's session id.
 * @returns what is still wanted, when the control is there but not yet live.
 */
function restoreInRow(
  root: HTMLElement,
  group: HTMLElement,
  focused: FocusedControl,
  session: string,
): FocusedControl | undefined {
  const row = group.querySelector<HTMLElement>(`[data-deeptail-session="${CSS.escape(session)}"]`)
  if (row === null) {
    // The rows are away while the host is being read again. Focus waits on the
    // group, and the row is still owed — giving up here is what left focus
    // parked on a heading for the rest of the session.
    parkOnGroup(group)
    return focused
  }
  const open = row.querySelector<HTMLButtonElement>('.session-open')
  if (open !== null) {
    for (const other of root.querySelectorAll<HTMLButtonElement>('.session-open')) other.tabIndex = -1
    open.tabIndex = 0
  }
  const target =
    focused.action === 'open'
      ? open
      : row.querySelector<HTMLButtonElement>(`[data-deeptail-action="${CSS.escape(focused.action)}"]`)
  if (target !== null && !target.disabled) {
    target.focus()
    return undefined
  }
  // The control is there but dark while its mutation runs. Focus waits in the
  // row rather than falling out of the roster, and the control is still wanted.
  // A control that is simply gone — the session stopped, so there is no longer
  // anything to stop — is not owed: the row itself is where focus belongs.
  open?.focus()
  return target === null ? undefined : focused
}
