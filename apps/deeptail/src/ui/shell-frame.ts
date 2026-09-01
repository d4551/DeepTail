/**
 * The shell's chrome: the regions its surfaces mount into, and the drawer that
 * owns the sidebar on the narrow layout.
 *
 * @module
 */

import type { Translate } from '../locales.ts'
import { button, el } from './dom.ts'

/** The sidebar's id, which the drawer toggle points `aria-controls` at. */
const SIDEBAR_ID = 'deeptail-sidebar'

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
 * @param container - the application root.
 * @param t - copy source.
 * @returns the regions the shell's surfaces mount into, and a disposer.
 */
export function mountShellFrame(container: HTMLElement, t: Translate): ShellFrame {
  const shell = el('div', { className: 'shell', data: { deeptailShell: '' } })
  const scrim = el('div', { className: 'drawer-scrim' })
  const sidebar = el('nav', { className: 'sidebar', aria: { label: t('shell.sessions') } })
  sidebar.id = SIDEBAR_ID
  const brandRow = el('div', { className: 'brand-row' })
  // A wordmark, not the page's heading: the sidebar it sits in is hidden on a
  // phone, and a heading that disappears with the layout leaves the page with
  // none at all.
  brandRow.append(el('span', { className: 'brand-name', text: t('app.name') }))
  sidebar.append(brandRow)

  const main = el('main', { className: 'main' })
  const header = el('div', { className: 'main-header' })
  const body = el('div', { className: 'main-body' })
  body.append(el('div', { className: 'placeholder', text: t('shell.pickSession') }))
  const live = el('div', { className: 'visually-hidden', role: 'status' })
  main.append(header, body, live)

  shell.append(scrim, sidebar, main)
  container.replaceChildren(shell)

  const drawer = mountDrawer({ shell, sidebar, scrim }, t)
  // The main pane is present at every width, so the page's one heading lives
  // here rather than in the drawer.
  header.append(drawer.toggle, el('h1', { className: 'main-title', text: t('shell.sessions') }))

  return {
    sidebar,
    body,
    announce: (text) => {
      live.textContent = text
    },
    showError: (message) => {
      const strip = el('div', { className: 'error', text: message, role: 'alert' })
      strip.dataset.deeptailState = 'shell-error'
      body.replaceChildren(strip)
    },
    dispose: () => {
      drawer.dispose()
      shell.remove()
    },
  }
}

/** The elements the drawer moves between its open and closed states. */
interface DrawerRegions {
  readonly shell: HTMLElement
  readonly sidebar: HTMLElement
  /** The backdrop, whose only gesture is to close the drawer. */
  readonly scrim: HTMLElement
}

/** The drawer's control, and the teardown for the listeners it installs. */
interface Drawer {
  readonly toggle: HTMLButtonElement
  readonly dispose: () => void
}

/**
 * Move focus with the drawer.
 *
 * The sidebar precedes the main pane in the document, so the control that opens
 * it sits after everything it reveals. Without this a keyboard user travels
 * backwards to reach what they just opened, and on the way out has to hunt for
 * the toggle again.
 * @param sidebar - the drawer.
 * @param toggle - the control that opens and closes it.
 * @param open - whether the drawer is now open.
 */
function followDrawer(sidebar: HTMLElement, toggle: HTMLButtonElement, open: boolean): void {
  if (!open) {
    toggle.focus()
    return
  }
  // On the next frame: the sidebar is still hidden until styles are recomputed,
  // and focus does not enter a hidden subtree.
  requestAnimationFrame(() => sidebar.querySelector('button')?.focus())
}

/**
 * Whether the sidebar is currently a drawer.
 *
 * The drawer only exists on the narrow layout; on the wide one the sidebar is a
 * permanent column and must never be made inert. Which layout is showing is the
 * stylesheet's decision, taken at a width written only there and published as a
 * flag: a width restated in script is a second breakpoint waiting to disagree
 * with the first.
 * @returns true while the narrow layout is showing.
 */
function isDrawerLayout(): boolean {
  return getComputedStyle(document.documentElement).getPropertyValue('--dsh-drawer').trim() === '1'
}

/**
 * Wire the drawer: the sidebar is a permanent column on the wide layout and a
 * dismissible overlay on the narrow one, dismissed by the scrim, by Escape,
 * and by the toggle that reports its state.
 * @param regions - the shell, the sidebar it holds, and the backdrop.
 * @param t - copy source.
 * @returns the toggle to seat in the header, and a disposer.
 */
function mountDrawer(regions: DrawerRegions, t: Translate): Drawer {
  const { shell, sidebar, scrim } = regions
  const setDrawer = (open: boolean, moveFocus = false): void => {
    shell.dataset.drawer = open ? 'open' : 'closed'
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false')
    toggle.textContent = open ? t('shell.closeSessions') : t('shell.openSessions')

    // A translated drawer still holds its controls in the tab order, so the
    // closed one is taken out of the tree rather than merely moved off screen.
    const drawer = isDrawerLayout()
    sidebar.inert = !open && drawer
    if (moveFocus && drawer) followDrawer(sidebar, toggle, open)
  }
  const toggle = button('drawer-toggle', t('shell.openSessions'), () => {
    setDrawer(shell.dataset.drawer !== 'open', true)
  })
  toggle.dataset.deeptailAction = 'drawer'
  toggle.setAttribute('aria-controls', SIDEBAR_ID)
  toggle.setAttribute('aria-expanded', 'false')

  scrim.addEventListener('click', () => {
    setDrawer(false, true)
  })
  const onShellKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && shell.dataset.drawer === 'open') setDrawer(false, true)
  }
  document.addEventListener('keydown', onShellKeyDown)
  const onLayoutChange = (): void => {
    setDrawer(shell.dataset.drawer === 'open')
  }
  // The flag changes when the viewport crosses the width the stylesheet named,
  // which is exactly when the document's own box changes.
  const watchLayout = new ResizeObserver(onLayoutChange)
  watchLayout.observe(document.documentElement)
  setDrawer(false)

  return {
    toggle,
    dispose: () => {
      document.removeEventListener('keydown', onShellKeyDown)
      watchLayout.disconnect()
    },
  }
}
