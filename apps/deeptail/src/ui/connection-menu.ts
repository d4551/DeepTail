/**
 * The host switcher.
 *
 * Mirrors the harness's workspace picker: a trigger showing the active host and
 * its reachability, a menu of every paired host where **selection is a trailing
 * check rather than a fill**, and a pinned footer for pairing and unpairing.
 *
 * @module
 */

import type { HostRecord } from '../host.ts'
import type { Translate } from '../locales.ts'
import { buildConnectionMenu, type MenuPanel } from './connection-menu-panel.ts'
import { el, screenReaderText } from './dom.ts'
import { type HostState, hostStateLabel } from './states.ts'

/** What the menu needs from the shell. */
export interface ConnectionPorts {
  hosts(): readonly HostRecord[]
  stateOf(hostId: string): HostState
  activeHostId(): string | undefined
  select(hostId: string): void
  pair(): void
  /** Pair this host again, which is the only way out of `unauthorized`. */
  repair(hostId: string): void
  unpair(hostId: string): void
}

/** Whether the menu is showing, and how it is dismissed while it is. */
interface MenuToggle {
  /** Whether the menu is on the page. */
  isOpen(): boolean
  /** Close an open menu, returning focus to the trigger. */
  close(): void
  /** Open a closed menu, close an open one. */
  toggle(): void
  /** Drop the dismissal listeners when the switcher leaves the page. */
  dispose(): void
}

/**
 * Mount the connection menu.
 * @param container - where to mount.
 * @param ports - shell callbacks.
 * @param t - copy source.
 * @returns a disposer, and a render hook for when the fleet changes.
 */
export function mountConnectionMenu(
  container: HTMLElement,
  ports: ConnectionPorts,
  t: Translate,
): { render: () => void; dispose: () => void } {
  const root = el('div', { className: 'connection' })
  const trigger = el('button', { className: 'connection-trigger', data: { deeptailConnection: 'trigger' } })
  trigger.type = 'button'
  trigger.setAttribute('aria-haspopup', 'menu')
  trigger.setAttribute('aria-expanded', 'false')

  const popover = createMenuToggle(trigger, root, () => {
    render()
  })

  const render = (): void => {
    const hosts = ports.hosts()
    const activeHostId = ports.activeHostId()
    const active = hosts.find((host) => host.id === activeHostId)
    const open = popover.isOpen()

    // Which item the operator is on, before it is thrown away. The menu is
    // redrawn on every roster event, and a live fleet forwards those
    // continuously — so without this, opening the menu on a working fleet threw
    // focus back to the first host every few seconds.
    const held = focusedMenuKey(root)

    trigger.replaceChildren(...triggerContent(active, ports, t))

    root.replaceChildren(trigger)
    setSurroundingsInert(root, open)
    if (!open) return

    const panel = buildConnectionMenu({ hosts, activeHostId, ports, t, dismiss: popover.close })
    root.append(panel.menu)
    restoreMenuFocus(panel, held)
  }

  wireTriggerActivation(trigger, ports, popover)
  container.append(root)
  render()

  return {
    render,
    dispose: () => {
      popover.dispose()
      root.remove()
    },
  }
}

/**
 * The name of the menu item focus is on, if it is on one.
 * @param root - the switcher.
 * @returns the item's key, or undefined when focus is elsewhere.
 */
function focusedMenuKey(root: HTMLElement): string | undefined {
  const active = document.activeElement
  if (!(active instanceof HTMLElement) || !root.contains(active)) return undefined
  return active.dataset.deeptailMenu
}

/**
 * Put focus on the item it was on, or on the first one when the menu has just
 * opened.
 * @param panel - the freshly drawn menu.
 * @param held - the key focus was on before the rebuild.
 */
function restoreMenuFocus(panel: MenuPanel, held: string | undefined): void {
  const items = [...panel.menu.querySelectorAll<HTMLButtonElement>('[data-deeptail-menu]')]
  const same = held === undefined ? undefined : items.find((item) => item.dataset.deeptailMenu === held)
  const target = same ?? panel.initialFocus
  if (target === undefined) return
  // The roving stop follows focus, so the next arrow key continues from here.
  for (const item of items) item.tabIndex = item === target ? 0 : -1
  target.focus()
}

/**
 * The trigger's contents.
 *
 * With no host selected there is still a state to show, and `unknown` is the
 * honest one: nothing has answered yet.
 * @param active - the selected host, when the fleet has one.
 * @param ports - shell callbacks.
 * @param t - copy source.
 * @returns the dot, the label, and the state as announced text.
 */
function triggerContent(active: HostRecord | undefined, ports: ConnectionPorts, t: Translate): HTMLElement[] {
  const state = active === undefined ? 'unknown' : ports.stateOf(active.id)
  return [
    el('span', { className: 'dot', aria: { hidden: 'true' }, data: { state } }),
    el('span', { className: 'connection-label', text: active?.label ?? t('status.empty') }),
    screenReaderText(hostStateLabel(t, state)),
  ]
}

/**
 * Wire the trigger's gesture.
 *
 * With nothing paired there is nothing to choose between, so the gesture *is*
 * the pair action rather than a one-row popover.
 * @param trigger - the switcher's button.
 * @param ports - shell callbacks.
 * @param popover - the menu's open state.
 */
function wireTriggerActivation(trigger: HTMLButtonElement, ports: ConnectionPorts, popover: MenuToggle): void {
  trigger.addEventListener('click', () => {
    if (ports.hosts().length === 0) {
      ports.pair()
      return
    }
    popover.toggle()
  })
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
 *
 * They sit on the document only while the menu is open, so a closed switcher
 * never intercepts a pointer or a key the rest of the app wants.
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
 * content they are now working in. Focus reaching the document body raises no
 * event at all, which is why leaving by keyboard is handled on the key rather
 * than waiting to be told where focus went.
 * @param root - the subtree a pointer may land in without dismissing the menu.
 * @param close - dismisses the menu.
 * @returns the handlers.
 */
function dismissalHandlers(root: HTMLElement, close: () => void): DismissalHandlers {
  return {
    onOutside: (event: Event): void => {
      if (event.target instanceof Node && root.contains(event.target)) return
      close()
    },
    onKeyDown: (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        close()
        return
      }
      // Tab leaves the menu rather than cycling inside it. The rest of the
      // sidebar is inert while the menu is over it, so without this the tab
      // sequence runs menu, document, trigger, menu — a ring with no way out,
      // which is the one thing a keyboard must never be put in. Closing here
      // returns focus to the trigger before the browser acts on the key, so it
      // continues the sequence from where the operator opened the menu.
      if (event.key === 'Tab') close()
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
function createMenuToggle(trigger: HTMLButtonElement, root: HTMLElement, render: () => void): MenuToggle {
  let open = false

  const closeMenu = (): void => {
    if (!open) return
    open = false
    trigger.setAttribute('aria-expanded', 'false')
    listenForDismissal(handlers, false)
    render()
    trigger.focus()
  }

  const handlers = dismissalHandlers(root, closeMenu)

  const openMenu = (): void => {
    if (open) return
    open = true
    trigger.setAttribute('aria-expanded', 'true')
    listenForDismissal(handlers, true)
    render()
  }

  return {
    isOpen: () => open,
    close: closeMenu,
    toggle: () => {
      if (open) closeMenu()
      else openMenu()
    },
    dispose: () => {
      listenForDismissal(handlers, false)
    },
  }
}

/**
 * Take the rest of the shell out of play while the menu is over it.
 *
 * An open menu overlaps the rows behind it, leaving them partially covered: too
 * small to hit reliably, and pointing at something the operator is not looking
 * at. A click there dismisses the menu rather than reaching the row, so the row
 * is not a target while the menu is open, and this says so.
 * @param root - the element the menu is mounted in.
 * @param open - whether the menu is open.
 */
function setSurroundingsInert(root: HTMLElement, open: boolean): void {
  const sidebar = root.closest('#deeptail-sidebar')
  if (sidebar === null) return
  // Only what the menu actually covers. The main pane is not overlapped, and it
  // carries the page's landmark and heading.
  for (const region of sidebar.querySelectorAll<HTMLElement>(':scope > *')) {
    if (region === root || region.contains(root)) continue
    region.inert = open
  }
}
