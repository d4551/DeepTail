/**
 * Foreground and background handling.
 *
 * Mobile operating systems suspend an app's process: iOS stops executing code
 * in the Suspended state and Android's Doze suspends timers and TCP keepalives.
 * A mux socket does not survive that, and one the OS killed silently looks open
 * until the first failed send. So the socket is closed through its WebSocket
 * view on the way out, which the harness stream client observes as a lost
 * generation and answers with its own reconnect and cursor catch-up.
 *
 * @module
 */

import type { CarrierHooks } from './transport.ts'

/**
 * Close every open host connection whenever the page is hidden.
 *
 * Reopening is deliberately not done here: each stream client owns its own
 * reconnection, including backoff and the cursor replay that repairs the gap.
 * Racing it with a second open would produce two generations for one host.
 *
 * The whole set is taken rather than one carrier, because the control plane
 * holds a socket per paired host long before any of them is booted, and those
 * are exactly the sockets an OS suspend kills silently.
 *
 * The watch lasts as long as the document does, which is as long as the app
 * does: there is no unmount to tear it down for, so there is no disposer to
 * hand back and nothing that would ever call one.
 *
 * @param carriers - supplies the carriers open at the moment the page hides.
 */
export function followAppLifecycle(carriers: () => Iterable<CarrierHooks>): void {
  const onVisibilityChange = (): void => {
    if (document.visibilityState !== 'hidden') return
    for (const carrier of carriers()) carrier.suspendMuxSocket()
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
}
