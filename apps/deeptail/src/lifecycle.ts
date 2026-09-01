/**
 * Foreground and background handling.
 *
 * Mobile operating systems suspend an app's process: iOS stops executing code
 * in the Suspended state and Android's Doze suspends timers and TCP keepalives.
 * A mux socket does not survive that, and one the OS killed silently looks open
 * until the first failed send. So the socket is dropped on the way out and
 * re-established on the way back, where the harness's own reconnect path takes
 * over: `session.follow` reopens with a snapshot and cursor, and the journal
 * stream repairs the gap.
 *
 * @module
 */

import { invoke } from '@tauri-apps/api/core'

/** Callbacks the host shell supplies for the two transitions. */
export interface LifecycleSinks {
  /** Called after the socket is dropped, so the UI can show a disconnected state. */
  onSuspend?: () => void
  /** Called on return to the foreground, after the socket may be reopened. */
  onResume?: () => void
}

/**
 * Watch page visibility and drop or restore the host connection with it.
 *
 * @param hostId - the paired host whose socket follows the app's lifecycle.
 * @param sinks - UI callbacks for the two transitions.
 * @returns a disposer that stops watching.
 */
export function followAppLifecycle(hostId: string, sinks: LifecycleSinks = {}): () => void {
  const onVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      void invoke('carrier_close_mux', { host: hostId })
      sinks.onSuspend?.()
      return
    }
    sinks.onResume?.()
  }
  document.addEventListener('visibilitychange', onVisibilityChange)
  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
}
