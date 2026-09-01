/**
 * Foreground and background handling.
 *
 * Mobile operating systems suspend an app's process: iOS stops executing code
 * in the Suspended state and Android's Doze suspends timers and TCP keepalives.
 * A mux socket does not survive that, and one the OS killed silently looks open
 * until the first failed send. So the socket is closed through its adapter on
 * the way out, which the harness stream client observes as a lost generation
 * and answers with its own reconnect and cursor catch-up.
 *
 * @module
 */

import type { CarrierHooks } from './transport.ts'

/**
 * Close the host connection whenever the page is hidden.
 *
 * Reopening is deliberately not done here: the harness stream client owns
 * reconnection, including its backoff and the `session.follow` cursor replay
 * that repairs the gap. Racing it with a second open would produce two
 * generations for one host.
 *
 * @param carrier - the carrier whose socket follows the app's lifecycle.
 * @returns a disposer that stops watching.
 */
export function followAppLifecycle(carrier: CarrierHooks): () => void {
  const onVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') carrier.suspendMuxSocket()
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}
