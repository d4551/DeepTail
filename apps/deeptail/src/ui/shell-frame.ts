/**
 * The shell's chrome: the regions its surfaces mount into, and the drawer that
 * owns the sidebar on the narrow layout.
 *
 * @module
 */

import type { Preconditions } from '../actions/dispatch.ts'
import { ACTIONS } from '../actions/registry.ts'
import type { Translate } from '../locales.ts'
import { DATA } from '../markers.ts'
import { type AppRuntime, type OutcomeTell, runAction } from '../runtime.ts'
import { type Disposer, el, setAria } from './dom.ts'
import { bindSeated, seatedButton } from './seated.ts'
import { buildChrome, placeChrome, readChrome, relabelChrome, type ShellChrome, SIDEBAR_ID } from './shell-chrome.ts'
import { errorStrip, showFailure } from './states.ts'

/** The regions of the shell, and what its main pane can be told to say. */
export interface ShellFrame {
  /** Where the host switcher, the new-session action and the roster sit. */
  readonly sidebar: HTMLElement
  /** The main pane, which a chosen session takes over. */
  readonly body: HTMLElement
  /** Announce a change to assistive technology without moving focus. */
  readonly announce: (text: string) => void
  /** Put a failure that belongs to no single row in the main pane. */
  readonly showError: (message: string) => void
  /** Move the drawer to the state asked for, focus following it. */
  readonly setDrawer: (open: boolean) => void
  /** Remove the chrome, and with it every listener it installed. */
  readonly dispose: () => void
}

/** What the chrome's own registry controls spend through. */
export interface ShellFramePorts {
  /** The action plane the toggle and the dismiss control spend through. */
  readonly runtime: AppRuntime
  /** The facts the chrome's controls spend against. */
  readonly facts: Preconditions
  /** Where the chrome's outcomes are told, read when a control is activated. */
  tell(): OutcomeTell
}

/**
 * Mount the chrome over the container.
 *
 * When the container already holds a first paint of this chrome, the live
 * mount adopts those nodes and binds the drawer rather than replacing the
 * tree the document shipped.
 * @param container - the application root.
 * @param t - copy source.
 * @param ports - what the chrome's registry controls are dispatched through.
 * @returns the regions the shell's surfaces mount into, and a disposer.
 */
export function mountShellFrame(container: HTMLElement, t: Translate, ports: ShellFramePorts): ShellFrame {
  const adopted = readChrome(container)
  const chrome = adopted ?? buildChrome(t)
  if (adopted === undefined) placeChrome(container, chrome)
  else relabelChrome(chrome, t)
  const drawer = mountDrawer(chrome, t, adopted !== undefined, ports)
  if (adopted === undefined) {
    chrome.header.append(drawer.toggle, el('h1', { className: 'main-title', text: t('shell.sessionsHeading') }))
  }
  return {
    sidebar: chrome.sidebar,
    body: chrome.body,
    announce: (text) => {
      chrome.live.textContent = text
    },
    showError: (message) => {
      const strip = errorStrip('shell-error')
      chrome.body.replaceChildren(strip)
      showFailure(strip, message)
    },
    setDrawer: (open) => {
      drawer.set(open, true)
    },
    dispose: () => {
      drawer.close()
      drawer.dispose()
      chrome.shell.remove()
    },
  }
}
/** The drawer's control, and the teardown for the listeners it installed. */
interface Drawer {
  readonly toggle: HTMLButtonElement
  /** Move the drawer to a state, focus following it when asked. */
  readonly set: (open: boolean, moveFocus?: boolean) => void
  readonly close: () => void
  readonly dispose: () => void
}

/**
 * Move focus with the drawer.
 * @param sidebar - the drawer.
 * @param toggle - the control that opens and closes it.
 * @param open - whether the drawer is now open.
 */
function followDrawer(sidebar: HTMLElement, toggle: HTMLButtonElement, open: boolean): void {
  if (!open) {
    toggle.focus()
    return
  }
  requestAnimationFrame(() => sidebar.querySelector('button')?.focus())
}

/**
 * Whether the sidebar is currently a drawer.
 * @returns true while the narrow layout is showing.
 */
function isDrawerLayout(): boolean {
  const root = document.querySelector('#root')
  if (!(root instanceof HTMLElement)) return false
  return getComputedStyle(root).getPropertyValue('--dsh-drawer').trim() === '1'
}

/** The elements the drawer moves between its open and closed states. */
interface DrawerRegions {
  readonly shell: HTMLElement
  readonly sidebar: HTMLElement
  readonly main: HTMLElement
  readonly scrim: HTMLElement
  readonly dismiss: HTMLButtonElement
}

/**
 * Put the shell into the drawer state asked for.
 * @param regions - the shell, the sidebar, the pane behind it and the backdrop.
 * @param toggle - the control whose label and `aria-expanded` report the state.
 * @param t - copy source.
 * @param open - the state to move to.
 */
function applyDrawerState(regions: DrawerRegions, toggle: HTMLButtonElement, t: Translate, open: boolean): void {
  const { shell, sidebar, main, dismiss } = regions
  shell.dataset[DATA.drawer] = open ? 'open' : 'closed'
  setAria(toggle, { expanded: open ? 'true' : 'false' })
  toggle.textContent = open ? t('shell.closeSessions') : t('shell.openSessions')
  const drawer = isDrawerLayout()
  sidebar.inert = !open && drawer
  main.inert = open && drawer
  dismiss.hidden = !(open && drawer)
}

/**
 * The dismiss control, created or adopted.
 * @param sidebar - where it sits.
 * @param t - copy source.
 * @param adopted - whether the first paint already seated it.
 * @param onClose - closes the drawer.
 * @returns the control.
 */
function drawerDismiss(sidebar: HTMLElement, t: Translate, adopted: boolean, onClose: () => void): HTMLButtonElement {
  if (adopted) {
    const seated = seatedButton(sidebar, 'drawer-dismiss')
    bindSeated(seated, onClose)
    return seated
  }
  const dismiss = el('button', { className: 'drawer-dismiss', text: t('shell.closeSessions') })
  dismiss.type = 'button'
  bindSeated(dismiss, onClose)
  dismiss.dataset[DATA.action] = ACTIONS['drawer.dismiss'].marker
  dismiss.hidden = true
  sidebar.prepend(dismiss)
  return dismiss
}

/**
 * The toggle control, created or adopted.
 * @param chrome - the regions it sits in and reports on.
 * @param t - copy source.
 * @param adopted - whether the first paint already seated it.
 * @param onToggle - opens or closes the drawer.
 * @returns the control.
 */
function drawerToggle(chrome: ShellChrome, t: Translate, adopted: boolean, onToggle: () => void): HTMLButtonElement {
  if (adopted) {
    const seated = seatedButton(chrome.header, 'drawer-toggle')
    bindSeated(seated, onToggle)
    return seated
  }
  const toggle = el('button', { className: 'drawer-toggle', text: t('shell.openSessions') })
  toggle.type = 'button'
  bindSeated(toggle, onToggle)
  toggle.dataset[DATA.action] = ACTIONS['drawer.toggle'].marker
  setAria(toggle, { controls: SIDEBAR_ID, expanded: 'false' })
  return toggle
}

/**
 * Follow the layout the drawer sits in: the backdrop closes it, Escape closes
 * it, and a layout flip re-applies the state the sidebar is drawn in.
 * @param regions - the shell, the sidebar, the pane behind it and the backdrop.
 * @param drawer - the state the watchers move.
 * @returns the teardown for the listeners the watchers installed.
 */
function watchDrawerRegions(
  regions: DrawerRegions,
  drawer: {
    readonly set: (open: boolean, moveFocus?: boolean) => void
  },
): Disposer {
  const { shell, scrim } = regions
  scrim.addEventListener('click', () => {
    drawer.set(false, true)
  })
  const onShellKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && shell.dataset[DATA.drawer] === 'open') drawer.set(false, true)
  }
  document.addEventListener('keydown', onShellKeyDown)
  const watchLayout = new ResizeObserver(() => {
    drawer.set(shell.dataset[DATA.drawer] === 'open')
  })
  watchLayout.observe(document.documentElement)
  return () => {
    document.removeEventListener('keydown', onShellKeyDown)
    watchLayout.disconnect()
  }
}

/**
 * Wire the drawer onto chrome that was just built or just adopted.
 * @param chrome - the regions the drawer moves.
 * @param t - copy source.
 * @param adopted - whether the toggle and dismiss already sit in the tree.
 * @param ports - what the toggle and the dismiss control are dispatched through.
 * @returns the toggle to seat in the header on a fresh mount, and a disposer.
 */
function mountDrawer(chrome: ShellChrome, t: Translate, adopted: boolean, ports: ShellFramePorts): Drawer {
  const { shell, sidebar, main, scrim } = chrome
  // The state the closures below apply; assigned before any of them can fire,
  // because a listener is bound only after this assignment has run.
  let applyState: (open: boolean, moveFocus?: boolean) => void
  const drawer = {
    set: (open: boolean, moveFocus = false): void => {
      applyState(open, moveFocus)
    },
  }
  const dismiss = drawerDismiss(sidebar, t, adopted, () => {
    runAction(ports.runtime, ACTIONS['drawer.dismiss'], undefined, ports.facts, ports.tell())
  })
  const toggle = drawerToggle(chrome, t, adopted, () => {
    runAction(
      ports.runtime,
      ACTIONS['drawer.toggle'],
      { open: shell.dataset[DATA.drawer] !== 'open' },
      ports.facts,
      ports.tell(),
    )
  })
  applyState = (open, moveFocus = false) => {
    applyDrawerState({ shell, sidebar, main, scrim, dismiss }, toggle, t, open)
    if (moveFocus && isDrawerLayout()) followDrawer(sidebar, toggle, open)
  }
  const disposeWatchers = watchDrawerRegions({ shell, sidebar, main, scrim, dismiss }, drawer)
  drawer.set(false)
  return {
    toggle,
    set: (open, moveFocus = false) => {
      drawer.set(open, moveFocus)
    },
    close: () => {
      drawer.set(false, true)
    },
    dispose: disposeWatchers,
  }
}
