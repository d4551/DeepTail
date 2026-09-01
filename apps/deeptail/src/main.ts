/**
 * Application entry. Picks a paired host, boots the harness shell against it,
 * and follows the app lifecycle so a suspended process does not hold a socket
 * the operating system already killed.
 *
 * @module
 */

import { invoke } from '@tauri-apps/api/core'
import { bootHost, type HostRecord, teardownHost } from './boot.ts'
import { renderHostPicker } from './fleet.ts'
import { followAppLifecycle } from './lifecycle.ts'

const container = document.getElementById('root')
if (container === null) throw new Error('deeptail: missing #root')

const hosts = await invoke<HostRecord[]>('list_hosts')
const selected = hosts.length === 1 ? hosts[0] : await renderHostPicker(container, hosts)

if (selected !== undefined) {
  const entry = await bootHost(selected, container)
  const unwatch = followAppLifecycle(selected.id)
  // Teardown runs on the way out so the host sees a clean close rather than a
  // dropped connection it must time out.
  globalThis.addEventListener(
    'beforeunload',
    () => {
      unwatch()
      void teardownHost(entry, selected)
    },
    { once: true },
  )
}
