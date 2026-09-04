/**
 * The switcher's open menu.
 *
 * `role="menu"` may own only menu items, so every grouping element here
 * carries `role="none"`, the footer's pair and unpair controls are real menu
 * items rather than loose buttons beside the list, and the host rows share one
 * roving tab stop so the whole menu is a single stop in the page's tab order.
 *
 * @module
 */

import type { HostRecord } from '../host.ts'
import type { Translate } from '../locales.ts'
import type { ConnectionPorts } from './connection-menu.ts'
import { bindRovingFocus, button, el, screenReaderText } from './dom.ts'
import { hostStateLabel } from './states.ts'

/** Everything one open menu is drawn from. */
export interface MenuPanelOptions {
  /** Every paired host, in display order. */
  readonly hosts: readonly HostRecord[]
  /** The selected host, marked with a trailing check. */
  readonly activeHostId: string | undefined
  /** Shell callbacks. */
  readonly ports: ConnectionPorts
  /** Copy source. */
  readonly t: Translate
  /** Close the menu, ahead of an action that leaves or replaces it. */
  readonly dismiss: () => void
}

/** A drawn menu, and the row focus lands on when it opens. */
export interface MenuPanel {
  /** The `role="menu"` surface. */
  readonly menu: HTMLElement
  /** The first host row, absent only when no host is paired. */
  readonly initialFocus: HTMLButtonElement | undefined
}

/**
 * Draw the open menu.
 * @param options - the fleet, the selection, and the shell callbacks.
 * @returns the menu and the row that takes focus.
 */
export function buildConnectionMenu(options: MenuPanelOptions): MenuPanel {
  const menu = el('div', {
    className: 'menu',
    role: 'menu',
    aria: { label: options.t('shell.switchHost') },
    data: { deeptailConnection: 'menu' },
  })
  const items = el('div', { className: 'menu-items', role: 'none' })
  const rows = options.hosts.map((host) => appendHostRow(items, host, options))
  menu.append(items)
  const footer = buildFooter(options)
  menu.append(footer)
  // Arrow keys walk everything the menu owns, and the whole menu is one stop in
  // the page's tab order, so a row and a pinned action are reached the same way.
  bindRovingFocus([...menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"], [role="menuitemradio"]')])
  return { menu, initialFocus: rows[0] }
}

/**
 * Add one host's row to the list.
 *
 * `unauthorized` is the one state the operator cannot clear by waiting, so that
 * row is followed by the only action that does clear it.
 * @param items - the list the row joins.
 * @param host - the host the row stands for.
 * @param options - the selection, the shell callbacks and the copy source.
 * @returns the row, which is this host's roving tab stop.
 */
function appendHostRow(items: HTMLElement, host: HostRecord, options: MenuPanelOptions): HTMLButtonElement {
  const { activeHostId, ports, t, dismiss } = options
  const state = ports.stateOf(host.id)
  const item = el('button', {
    className: 'menu-item menu-choice',
    role: 'menuitemradio',
    aria: { checked: host.id === activeHostId ? 'true' : 'false' },
    data: { deeptailHost: host.id },
  })
  item.type = 'button'
  item.append(
    el('span', { className: 'dot', aria: { hidden: 'true' }, data: { state } }),
    el('span', { className: 'menu-label', text: host.label }),
    screenReaderText(hostStateLabel(t, state)),
  )
  item.addEventListener('click', () => {
    dismiss()
    ports.select(host.id)
  })
  items.append(item)
  if (state === 'unauthorized') items.append(repairItem(host.id, options))
  return item
}

/**
 * The action that clears `unauthorized`, offered by the row that is in it.
 * @param hostId - the host to pair again.
 * @param options - the shell callbacks and the copy source.
 * @returns the item.
 */
function repairItem(hostId: string, options: MenuPanelOptions): HTMLButtonElement {
  const { ports, t, dismiss } = options
  const repair = button(
    'menu-repair',
    t('shell.repair'),
    () => {
      dismiss()
      ports.repair(hostId)
    },
    { role: 'menuitem' },
  )
  repair.dataset.deeptailAction = 'repair'
  return repair
}

/**
 * The pinned footer: pairing another host, and unpairing the selected one.
 * @param options - the selection, the shell callbacks and the copy source.
 * @returns the footer.
 */
function buildFooter(options: MenuPanelOptions): HTMLElement {
  const { hosts, activeHostId, ports, t, dismiss } = options
  const footer = el('div', { className: 'menu-footer', role: 'none' })
  footer.append(
    menuItem('menu-item', t('action.pair'), () => {
      dismiss()
      ports.pair()
    }),
  )
  const active = hosts.find((host) => host.id === activeHostId)
  if (active !== undefined) {
    footer.append(
      menuItem('menu-item menu-danger', t('shell.unpair'), () => {
        dismiss()
        ports.unpair(active.id)
      }),
    )
  }
  return footer
}

/**
 * A footer control that is a real menu item, so `role="menu"` owns it.
 * @param className - the item's classes.
 * @param text - its label.
 * @param onClick - its activation handler.
 * @returns the item.
 */
function menuItem(className: string, text: string, onClick: () => void): HTMLButtonElement {
  return button(className, text, onClick, { role: 'menuitem' })
}
