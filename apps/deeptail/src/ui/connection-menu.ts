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
import { createMenuToggle, type MenuToggle } from './connection-menu-dismiss.ts'
import { heldMenuFocus, restoreMenuFocus } from './connection-menu-focus.ts'
import { buildConnectionMenu } from './connection-menu-panel.ts'
import { el, screenReaderText, setAria } from './dom.ts'
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

/** What a mounted switcher hands back: a render hook and a teardown. */
interface ConnectionMenuHandle {
  /** Repaint the switcher for the fleet it now stands for. */
  render(): void
  /** Drop the dismissal listeners and take the switcher down. */
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
): ConnectionMenuHandle {
  const root = el('div', { className: 'connection' })
  const trigger = el('button', { className: 'connection-trigger', data: { deeptailConnection: 'trigger' } })
  trigger.type = 'button'
  setAria(trigger, { haspopup: 'menu', expanded: 'false' })

  const popover = createMenuToggle(trigger, root, () => {
    render()
  })

  const render = (): void => {
    paintSwitcher({ root, trigger, popover, ports, t })
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

/** What one repaint of the switcher needs. */
interface SwitcherPaint {
  /** The switcher's own subtree, which the menu is appended to. */
  readonly root: HTMLElement
  /** The control the menu hangs from, whose content names the active host. */
  readonly trigger: HTMLButtonElement
  /** Whether the menu is showing, and how it is dismissed while it is. */
  readonly popover: MenuToggle
  /** The shell callbacks the menu's items invoke. */
  readonly ports: ConnectionPorts
  /** Copy source. */
  readonly t: Translate
}

/**
 * Redraw the switcher for the fleet it now stands for.
 * @param paint - the switcher's parts, and what they are drawn from.
 */
function paintSwitcher(paint: SwitcherPaint): void {
  const { root, trigger, popover, ports, t } = paint
  const hosts = ports.hosts()
  const activeHostId = ports.activeHostId()
  const active = hosts.find((host) => host.id === activeHostId)
  const open = popover.isOpen()

  // Read before the rebuild: it names elements in the subtree being replaced.
  const held = heldMenuFocus(root, trigger)

  trigger.replaceChildren(...triggerContent(active, ports, t))
  root.replaceChildren(trigger)
  setSurroundingsInert(root, open)
  if (!open) {
    if (held !== undefined && held.kind === 'trigger') trigger.focus()
    return
  }

  const panel = buildConnectionMenu({
    hosts,
    activeHostId,
    ports,
    t,
    dismiss: () => {
      popover.close(true)
    },
  })
  root.append(panel.menu)
  restoreMenuFocus(root, panel.initialFocus, held)
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
