/**
 * Stamp the built page with the control-plane chrome.
 *
 * Vite leaves `#root` empty. The factories that paint the live shell fill it
 * here, so the shipped document is the first paint, not a blank mount.
 *
 * @module
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { createTranslate } from '../apps/deeptail/src/locales.ts'
import { mountShellFrame } from '../apps/deeptail/src/ui/shell-frame.ts'
import { ROOT } from './source-tree.ts'

/** The empty mount Vite writes, which this paint replaces. */
export const EMPTY_ROOT = '<div id="root"></div>'

/** The built page this paint stamps. */
export const DIST_PAGE = `${ROOT}apps/deeptail/dist/index.html`

/**
 * The control-plane chrome as markup, from the same factories the webview
 * mounts.
 *
 * Built against a detached host so the paint cannot steal a live `#root`.
 * Listeners do not serialize; the client adopts the nodes and binds them.
 * @returns the shell's inner HTML, ready to sit inside `#root`.
 */
export function firstPaintMarkup(): string {
  const host = document.createElement('div')
  const frame = mountShellFrame(host, createTranslate('en'))
  const markup = host.innerHTML
  frame.dispose()
  return markup
}

/**
 * Whether markup is the product shell this paint must seat.
 * @param painted - the chrome as HTML.
 * @returns the markup, once it is the shell.
 */
export function assertPaintedShell(painted: string): string {
  if (!painted.includes('<main') || !painted.includes('data-deeptail-shell')) {
    throw new Error('deeptail: first paint lost the product shell')
  }
  return painted
}

/**
 * Fill the empty mount in a built page with the product shell.
 * @param html - the page Vite wrote.
 * @returns the page with the first paint seated in `#root`.
 */
export function paintIndex(html: string): string {
  if (!html.includes(EMPTY_ROOT)) throw new Error('deeptail: dist/index.html has no empty #root to paint')
  const painted = assertPaintedShell(firstPaintMarkup())
  const scripts = html.match(/<script\b/gu)
  if (scripts === null || scripts.length !== 1) {
    throw new Error(`deeptail: shipped page must carry exactly one script, found ${String(scripts?.length ?? 0)}`)
  }
  return html.replace(EMPTY_ROOT, `<div id="root">${painted}</div>`)
}

/**
 * Stamp one built page on disk with the product shell.
 * @param page - the HTML file to paint.
 */
export function paintFile(page: string): void {
  if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register()
  writeFileSync(page, paintIndex(readFileSync(page, 'utf8')))
}

if (import.meta.main) paintFile(DIST_PAGE)
