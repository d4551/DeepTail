/**
 * The shell's chrome: the regions its surfaces mount into, and the drawer that
 * owns the sidebar on the narrow layout.
 *
 * @module
 */

import { ACTIONS } from '../actions/registry.ts'
import type { Translate } from '../locales.ts'
import { DATA } from '../markers.ts'
import { button, el, setAria } from './dom.ts'
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
  /** Remove the chrome, and with it every listener it installed. */
  readonly dispose: () => void
}

/**
 * Mount the chrome over the container.
 *
 * When the container already holds a first paint of this chrome, the live
 * mount adopts those nodes and binds the drawer rather than replacing the
 * tree the document shipped.
 * @param container - the application root.
 * @param t - copy source.
 * @returns the regions the shell's surfaces mount into, and a disposer.
 */
export function mountShellFrame(container: HTMLElement, t: Translate): ShellFrame {
  const adopted = readChrome(container)
  const chrome = adopted ?? buildChrome(t)
  if (adopted === undefined) placeChrome(container, chrome)
  else relabelChrome(chrome, t)
  const drawer = mountDrawer(chrome, t, adopted !== undefined)
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
  readonly close: () => void
  readonly dispose: () => void
}

/**
 * The button a first paint already seated, named by its class.
 * @param root - the region that holds it.
 * @param className - the class the first paint wrote.
 * @returns the button.
 */
function seatedButton(root: ParentNode, className: string): HTMLButtonElement {
  const node = root.querySelector(`button.${className}`)
  if (!(node instanceof HTMLButtonElement)) throw new Error(`deeptail: missing ${className} in the shell chrome`)
  return node
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
    seated.addEventListener('click', onClose)
    return seated
  }
  const dismiss = button('drawer-dismiss', t('shell.closeSessions'), onClose)
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
    seated.addEventListener('click', onToggle)
    return seated
  }
  const toggle = button('drawer-toggle', t('shell.openSessions'), onToggle)
  toggle.dataset[DATA.action] = ACTIONS['drawer.toggle'].marker
  setAria(toggle, { controls: SIDEBAR_ID, expanded: 'false' })
  return toggle
}

/**
 * Wire the drawer onto chrome that was just built or just adopted.
 * @param chrome - the regions the drawer moves.
 * @param t - copy source.
 * @param adopted - whether the toggle and dismiss already sit in the tree.
 * @returns the toggle to seat in the header on a fresh mount, and a disposer.
 */
function mountDrawer(chrome: ShellChrome, t: Translate, adopted: boolean): Drawer {
  const { shell, sidebar, main, scrim } = chrome
  const drawer: { set: (open: boolean, moveFocus?: boolean) => void } = {
    set: () => {
      throw new Error('deeptail: drawer set before it was wired')
    },
  }
  const dismiss = drawerDismiss(sidebar, t, adopted, () => drawer.set(false, true))
  const toggle = drawerToggle(chrome, t, adopted, () => drawer.set(shell.dataset[DATA.drawer] !== 'open', true))
  drawer.set = (open, moveFocus = false) => {
    applyDrawerState({ shell, sidebar, main, scrim, dismiss }, toggle, t, open)
    if (moveFocus && isDrawerLayout()) followDrawer(sidebar, toggle, open)
  }
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
  drawer.set(false)
  return {
    toggle,
    close: () => {
      drawer.set(false, true)
    },
    dispose: () => {
      document.removeEventListener('keydown', onShellKeyDown)
      watchLayout.disconnect()
    },
  }
}
