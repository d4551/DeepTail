/**
 * The shell chrome as a tree of regions, built or recovered.
 *
 * First paint and the live mount share this tree. The drawer wiring lives
 * beside it; this module only names the nodes and the copy they carry.
 *
 * @module
 */

import type { Translate } from '../locales.ts'
import { DATA, dataSelector } from '../markers.ts'
import { el, liveRegion } from './dom.ts'

/** The sidebar's id, which the drawer toggle points `aria-controls` at. */
export const SIDEBAR_ID = 'deeptail-sidebar'

/** The regions of the shell chrome, before the drawer is wired. */
export interface ShellChrome {
  /** The one shell root a document carries. */
  readonly shell: HTMLElement
  /** Where the host switcher, the new-session action and the roster sit. */
  readonly sidebar: HTMLElement
  /** The landmark that holds the page heading and the main pane. */
  readonly main: HTMLElement
  /** The header that seats the drawer toggle and the page heading. */
  readonly header: HTMLElement
  /** The main pane, which a chosen session takes over. */
  readonly body: HTMLElement
  /** The backdrop, whose only gesture is to close the drawer. */
  readonly scrim: HTMLElement
  /** The live region the shell announces through. */
  readonly live: HTMLElement
}

/**
 * Build the chrome the live mount and the first paint both ship.
 * @param t - copy source.
 * @returns the regions, not yet on the page.
 */
export function buildChrome(t: Translate): ShellChrome {
  const shell = el('div', { className: 'shell', data: { [DATA.shell]: '' } })
  const scrim = el('div', { className: 'drawer-scrim' })
  const sidebar = el('nav', { className: 'sidebar', aria: { label: t('shell.navLabel') } })
  sidebar.id = SIDEBAR_ID
  const brandRow = el('div', { className: 'brand-row' })
  brandRow.append(el('span', { className: 'brand-name', text: t('app.name') }))
  sidebar.append(brandRow)
  const main = el('main', { className: 'main' })
  const header = el('div', { className: 'main-header' })
  const body = el('div', { className: 'main-body' })
  body.append(el('div', { className: 'placeholder', text: t('shell.pickSession') }))
  const live = liveRegion()
  main.append(header, body, live)
  shell.append(scrim, sidebar, main)
  return { shell, sidebar, main, header, body, scrim, live }
}

/**
 * Recover the chrome a first paint already put in the container.
 * @param container - the application root.
 * @returns the regions, or undefined when the first paint is not there.
 */
export function readChrome(container: HTMLElement): ShellChrome | undefined {
  const shell = container.querySelector(dataSelector('shell'))
  if (!(shell instanceof HTMLElement)) return undefined
  const sidebar = shell.querySelector(`#${SIDEBAR_ID}`)
  const main = shell.querySelector('main')
  const header = main instanceof HTMLElement ? main.querySelector('.main-header') : null
  const body = main instanceof HTMLElement ? main.querySelector('.main-body') : null
  const scrim = shell.querySelector('.drawer-scrim')
  const live = main instanceof HTMLElement ? main.querySelector('[role="status"]') : null
  const toggle = header instanceof HTMLElement ? header.querySelector('.drawer-toggle') : null
  const dismiss = sidebar instanceof HTMLElement ? sidebar.querySelector('.drawer-dismiss') : null
  const heading = header instanceof HTMLElement ? header.querySelector('.main-title') : null
  if (
    !(sidebar instanceof HTMLElement) ||
    !(main instanceof HTMLElement) ||
    !(header instanceof HTMLElement) ||
    !(body instanceof HTMLElement) ||
    !(scrim instanceof HTMLElement) ||
    !(live instanceof HTMLElement) ||
    !(toggle instanceof HTMLButtonElement) ||
    !(dismiss instanceof HTMLButtonElement) ||
    !(heading instanceof HTMLElement)
  ) {
    return undefined
  }
  return { shell, sidebar, main, header, body, scrim, live }
}

/**
 * Seat the chrome in the container, replacing whatever was there.
 * @param container - the application root.
 * @param chrome - the regions to seat.
 */
export function placeChrome(container: HTMLElement, chrome: ShellChrome): void {
  container.replaceChildren(chrome.shell)
}

/**
 * Write the live locale onto chrome that was painted in another one.
 * @param chrome - the regions to relabel.
 * @param t - copy source.
 */
export function relabelChrome(chrome: ShellChrome, t: Translate): void {
  const brand = chrome.sidebar.querySelector('.brand-name')
  if (brand !== null) brand.textContent = t('app.name')
  chrome.sidebar.setAttribute('aria-label', t('shell.navLabel'))
  const heading = chrome.header.querySelector('.main-title')
  if (heading !== null) heading.textContent = t('shell.sessionsHeading')
  const placeholder = chrome.body.querySelector('.placeholder')
  if (placeholder !== null) placeholder.textContent = t('shell.pickSession')
  const dismiss = chrome.sidebar.querySelector('.drawer-dismiss')
  if (dismiss !== null) dismiss.textContent = t('shell.closeSessions')
}
