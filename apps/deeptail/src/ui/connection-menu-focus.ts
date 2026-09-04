/**
 * Keeping the operator's place while the host switcher is rebuilt.
 *
 * Every fleet event repaints the switcher, and that repaint replaces the menu:
 * without this, an event arriving while the operator was arrowing the menu
 * yanked focus back to the first host on every row that arrived, and a repaint
 * while the menu was closed dropped focus from the trigger to the document
 * body. What the roster does through `roster-focus.ts`, the switcher does
 * through here.
 *
 * @module
 */

/** Where focus sits inside the switcher, in terms that survive a rebuild. */
export type MenuFocus = { readonly kind: 'trigger' } | { readonly kind: 'item'; readonly index: number }

/**
 * The switcher control holding focus before a rebuild.
 *
 * The trigger is read by identity — it is the same element across rebuilds —
 * and a menu item by its index among the menu's items, which is stable because
 * a fleet event reorders sessions, never hosts.
 * @param root - the switcher's own subtree.
 * @param trigger - the trigger button.
 * @returns the held focus, or undefined when focus is elsewhere.
 */
export function heldMenuFocus(root: HTMLElement, trigger: HTMLButtonElement): MenuFocus | undefined {
  const active = document.activeElement
  if (active === trigger) return { kind: 'trigger' }
  if (!(active instanceof HTMLElement) || !root.contains(active)) return undefined
  const index = menuItems(root).indexOf(active)
  return index === -1 ? undefined : { kind: 'item', index }
}

/** Every focusable item in the open menu, in roving order. */
function menuItems(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemradio"]')]
}

/**
 * Put focus back where the rebuild found it.
 *
 * A rebuild during the opening render is the one case focus should move on
 * purpose — into the menu's first row. Every other rebuild restores: the same
 * item when it still exists, the trigger when the menu just closed under it.
 * @param root - the rebuilt switcher subtree.
 * @param initial - the menu's first row, focused when the menu is opening.
 * @param held - where focus sat before the rebuild.
 */
export function restoreMenuFocus(
  root: HTMLElement,
  initial: HTMLButtonElement | undefined,
  held: MenuFocus | undefined,
): void {
  if (held !== undefined && held.kind === 'item') {
    const target = menuItems(root)[held.index]
    if (target instanceof HTMLButtonElement && !target.disabled) {
      // The roving stop moves with the focus, exactly as the roster's own
      // rebuild does, so the next arrow key continues from where the operator
      // was rather than from the first row.
      for (const item of menuItems(root)) item.tabIndex = -1
      target.tabIndex = 0
      target.focus()
      return
    }
  }
  initial?.focus()
}
