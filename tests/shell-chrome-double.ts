/**
 * The shell chrome the drawer specs mount, built the way the live shell builds
 * it.
 *
 * Three suites drive the same mounted chrome — the first paint's adoption, the
 * seated toggle and the seated dismiss — so the mount and the seated-control
 * reads live here once, and a change to the chrome's wiring lands in every
 * suite at the same moment.
 *
 * @module
 */

import { createGrantLedger } from '../apps/deeptail/src/capabilities/grants.ts'
import { createTranslate } from '../apps/deeptail/src/locales.ts'
import { createAppRuntime } from '../apps/deeptail/src/runtime.ts'
import { mountShellFrame, type ShellFrame } from '../apps/deeptail/src/ui/shell-frame.ts'

/**
 * Mount the chrome the way the live shell mounts it, over a plane whose
 * `shell.navigate` grant is live, so the drawer's own controls spend for real.
 * @param root - the mount to build the chrome in.
 * @returns the mounted frame.
 */
export function mountLiveChrome(root: HTMLElement): ShellFrame {
  const t = createTranslate('en')
  const ledger = createGrantLedger()
  ledger.hydrate({
    issuer: 'native',
    context: 'first-paint',
    grants: [{ capability: 'shell.navigate', subject: 'device', revision: 1, expiresAt: Date.now() + 60_000 }],
  })
  const runtime = createAppRuntime(t, ledger)
  const frame = mountShellFrame(root, t, {
    runtime,
    facts: { hasHosts: false, hostState: 'unknown', running: false },
    tell: () => ({ announce: frame.announce, fail: frame.showError }),
  })
  runtime.deps.setDrawer = frame.setDrawer
  return frame
}

/**
 * The seated toggle a mount adopted or built.
 * @param root - the mount that holds it.
 * @returns the toggle.
 */
export function seatedToggle(root: ParentNode): HTMLButtonElement {
  const toggle = root.querySelector('.drawer-toggle')
  if (!(toggle instanceof HTMLButtonElement)) throw new Error('missing drawer toggle')
  return toggle
}

/**
 * The seated dismiss a mount adopted or built.
 * @param root - the mount that holds it.
 * @returns the dismiss.
 */
export function seatedDismiss(root: ParentNode): HTMLButtonElement {
  const dismiss = root.querySelector('.drawer-dismiss')
  if (!(dismiss instanceof HTMLButtonElement)) throw new Error('missing drawer dismiss')
  return dismiss
}

/**
 * A mount seat appended to the document, the way the page holds it.
 * @returns the mount root.
 */
export function mountedRoot(): HTMLElement {
  const root = document.createElement('div')
  root.id = 'root'
  document.body.append(root)
  return root
}
