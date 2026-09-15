/**
 * Paint the control-plane chrome the shipped page carries.
 *
 * Vite leaves `#root` empty. The factories that paint the live shell fill it
 * here, so the shipped document is the first paint, not a blank mount. The
 * filesystem half — reading a built page and writing it back stamped — lives
 * in `paint-stamp.ts`, which this module stays free of.
 *
 * @module
 */

import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { createGrantLedger } from '../apps/deeptail/src/capabilities/grants.ts'
import { createTranslate } from '../apps/deeptail/src/locales.ts'
import { createAppRuntime } from '../apps/deeptail/src/runtime.ts'
import { mountShellFrame } from '../apps/deeptail/src/ui/shell-frame.ts'

/** The empty mount Vite writes, which this paint replaces. */
export const EMPTY_ROOT = '<div id="root"></div>'

/**
 * The control-plane chrome as markup, from the same factories the webview
 * mounts.
 *
 * Built against a detached host so the paint cannot steal a live `#root`.
 * Listeners do not serialize; the client adopts the nodes and binds them.
 * @returns the shell's inner HTML, ready to sit inside `#root`.
 */
export function firstPaintMarkup(): string {
  if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register()
  const host = document.createElement('div')
  const t = createTranslate('en')
  // The paint builds the chrome through the same factories the live mount
  // builds it through, so the plane rides along; nothing dispatches at paint
  // time, because listeners do not serialize.
  const runtime = createAppRuntime(t, createGrantLedger())
  const frame = mountShellFrame(host, t, {
    runtime,
    facts: { hasHosts: false, hostState: 'unknown', running: false },
    tell: () => ({ announce: frame.announce, fail: frame.showError }),
  })
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
  const mains = painted.split('<main').length - 1
  if (
    mains !== 1 ||
    !painted.includes('data-deeptail-shell') ||
    !painted.includes('drawer-toggle') ||
    !painted.includes('main-title')
  ) {
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
