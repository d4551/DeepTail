/**
 * Whether the switcher's menu is showing, and how it is dismissed while it is.
 *
 * The dismissal listeners sit on the document only while the menu is open, so
 * a closed switcher never intercepts a pointer or a key the rest of the app
 * wants. Escape and Tab are handled on the key rather than on a focus event,
 * because focus reaching the document body raises no event at all.
 *
 * @module
 */

import { setAria } from './dom.ts'

/** Whether the menu is showing, and how it is dismissed while it is. */
export interface MenuToggle {
  /** Whether the menu is on the page. */
  isOpen(): boolean
  /**
   * Close an open menu.
   * @param returnFocus - hand focus back to the trigger, which is right for a
   * dismissal the operator made from inside the menu and wrong for a pointer
   * that landed on something else.
   */
  close(returnFocus: boolean): void
  /** Open a closed menu, close an open one. */
  toggle(): void
  /** Drop the dismissal listeners when the switcher leaves the page. */
  dispose(): void
}

/** The handlers an open menu listens to the document with. */
interface DismissalHandlers {
  /** A pointer or focus landing away from the menu. */
  readonly onOutside: (event: Event) => void
  /** Escape, which closes, and Tab, which leaves. */
  readonly onKeyDown: (event: KeyboardEvent) => void
}

/**
 * Attach or detach the dismissal listeners.
 * @param handlers - what to attach.
 * @param on - true to attach them, false to remove them.
 */
function listenForDismissal(handlers: DismissalHandlers, on: boolean): void {
  const bind = on ? document.addEventListener.bind(document) : document.removeEventListener.bind(document)
  bind('pointerdown', handlers.onOutside)
  bind('keydown', handlers.onKeyDown)
  bind('focusin', handlers.onOutside)
}

/**
 * The handlers that dismiss one open menu.
 *
 * A pointer or focus landing outside dismisses it: an open menu overlaps what
 * is behind it, so leaving it open once the operator has moved on covers the
 * content they are now working in.
 * @param root - the subtree a pointer may land in without dismissing the menu.
 * @param close - dismisses the menu.
 * @returns the handlers.
 */
function dismissalHandlers(root: HTMLElement, close: (returnFocus: boolean) => void): DismissalHandlers {
  return {
    onOutside: (event: Event): void => {
      if (event.target instanceof Node && root.contains(event.target)) return
      close(false)
    },
    onKeyDown: (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        // The drawer also closes on Escape, and one press must not close both.
        event.stopPropagation()
        close(true)
        return
      }
      // Tab leaves the menu rather than cycling inside it. The rest of the
      // sidebar is inert while the menu is over it, so without this the tab
      // sequence runs menu, document, trigger, menu — a ring with no way out,
      // which is the one thing a keyboard must never be put in. Closing here
      // returns focus to the trigger before the browser acts on the key, so it
      // continues the sequence from where the operator opened the menu.
      if (event.key === 'Tab') close(true)
    },
  }
}

/**
 * Own whether the menu is showing.
 *
 * The dismissal listeners sit on the document only while the menu is open, and
 * closing hands focus back to the trigger the operator came from.
 * @param trigger - the button whose `aria-expanded` mirrors the state.
 * @param root - the subtree a pointer may land in without dismissing the menu.
 * @param render - redraws the switcher once the state has changed.
 * @returns the open state and its dismissal.
 */
export function createMenuToggle(trigger: HTMLButtonElement, root: HTMLElement, render: () => void): MenuToggle {
  let open = false

  const closeMenu = (returnFocus: boolean): void => {
    if (!open) return
    open = false
    setAria(trigger, { expanded: 'false' })
    listenForDismissal(handlers, false)
    render()
    // Focus follows the dismissal only when the operator dismissed from inside
    // the menu. A pointer landing on a session row also closes the menu, and
    // pulling focus to the trigger there overrides whatever they just clicked.
    if (returnFocus) trigger.focus()
  }

  const handlers = dismissalHandlers(root, closeMenu)

  const openMenu = (): void => {
    if (open) return
    open = true
    setAria(trigger, { expanded: 'true' })
    listenForDismissal(handlers, true)
    render()
  }

  return {
    isOpen: () => open,
    close: closeMenu,
    toggle: () => {
      if (open) closeMenu(true)
      else openMenu()
    },
    dispose: () => {
      listenForDismissal(handlers, false)
    },
  }
}
