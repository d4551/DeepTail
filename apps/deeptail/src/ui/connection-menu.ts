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
import { button, el, screenReaderText } from './dom.ts'
import { type HostState, hostStateLabel } from './states.ts'

/** What the menu needs from the shell. */
export interface ConnectionPorts {
  hosts(): readonly HostRecord[]
  stateOf(hostId: string): HostState
  activeHostId(): string | undefined
  select(hostId: string): void
  pair(): void
  unpair(hostId: string): void
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

  const menuId = 'deeptail-connection-menu'
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

  trigger.addEventListener('click', () => {
    const hosts = ports.hosts()
    // With nothing paired there is nothing to choose between, so the gesture
    // *is* the pair action rather than a one-row popover.
    if (hosts.length === 0) {
      ports.pair()
      return
    }
    if (open) closeMenu()
    else openMenu()
  })

  const render = (): void => {
    const hosts = ports.hosts()
    const activeId = ports.activeHostId()
    const active = hosts.find((host) => host.id === activeId)

    trigger.replaceChildren()
    const state = active === undefined ? 'unknown' : ports.stateOf(active.id)
    const dot = el('span', { className: 'dot', attrs: { 'aria-hidden': 'true' }, data: { state } })
    trigger.append(
      dot,
      el('span', { className: 'connection-label', text: active?.label ?? t('status.empty') }),
      screenReaderText(hostStateLabel(t, state)),
    )
    trigger.setAttribute('aria-controls', open ? menuId : '')

    root.replaceChildren(trigger)
    if (!open) return

    const menu = el('div', {
      className: 'menu',
      attrs: { role: 'menu', 'aria-label': t('shell.switchHost'), id: menuId },
      data: { deeptailConnection: 'menu' },
    })
    for (const host of hosts) {
      const item = el('button', {
        className: 'menu-item',
        attrs: { role: 'menuitem' },
        data: { deeptailHost: host.id },
      })
      item.type = 'button'
      const hostState = ports.stateOf(host.id)
      item.append(
        el('span', { className: 'dot', attrs: { 'aria-hidden': 'true' }, data: { state: hostState } }),
        el('span', { className: 'menu-label', text: host.label }),
        screenReaderText(hostStateLabel(t, hostState)),
      )
      if (host.id === activeId) {
        item.append(el('span', { className: 'menu-check', text: '✓', attrs: { 'aria-hidden': 'true' } }))
        item.setAttribute('aria-current', 'true')
      }
      item.addEventListener('click', () => {
        closeMenu()
        ports.select(host.id)
      })
      menu.append(item)
    }

    const footer = el('div', { className: 'menu-footer' })
    footer.append(
      button('menu-item', t('action.pair'), () => {
        closeMenu()
        ports.pair()
      }),
    )
    if (active !== undefined) {
      footer.append(
        button('menu-item menu-danger', t('shell.unpair'), () => {
          closeMenu()
          ports.unpair(active.id)
        }),
      )
    }
    menu.append(footer)
    root.append(menu)
  }

  container.append(root)
  render()

  return {
    render,
    dispose: () => {
      document.removeEventListener('pointerdown', onOutside)
      document.removeEventListener('keydown', onKeyDown)
      root.remove()
    },
  }
}
