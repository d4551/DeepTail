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
import { buildConnectionMenu, MENU_ID } from './connection-menu-panel.ts'
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

    trigger.replaceChildren(...triggerContent(active, ports, t))
    // The relationship only exists while there is a menu to point at.
    if (open) trigger.setAttribute('aria-controls', MENU_ID)
    else trigger.removeAttribute('aria-controls')

    root.replaceChildren(trigger)
    if (!open) return

    const panel = buildConnectionMenu({ hosts, activeHostId, ports, t, dismiss: popover.close })
    root.append(panel.menu)
    panel.initialFocus?.focus()
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
    el('span', { className: 'dot', attrs: { 'aria-hidden': 'true' }, data: { state } }),
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

/**
 * Own whether the menu is showing.
 *
 * The dismissal listeners sit on the document only while the menu is open, so a
 * closed switcher never intercepts a pointer or a key the rest of the app wants,
 * and closing hands focus back to the trigger the operator came from.
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
    document.removeEventListener('pointerdown', onOutside)
    document.removeEventListener('keydown', onKeyDown)
    render()
    trigger.focus()
  }

  function onOutside(event: PointerEvent): void {
    if (event.target instanceof Node && root.contains(event.target)) return
    closeMenu()
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') closeMenu()
  }

  const openMenu = (): void => {
    if (open) return
    open = true
    trigger.setAttribute('aria-expanded', 'true')
    document.addEventListener('pointerdown', onOutside)
    document.addEventListener('keydown', onKeyDown)
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
      document.removeEventListener('pointerdown', onOutside)
      document.removeEventListener('keydown', onKeyDown)
    },
  }
}
