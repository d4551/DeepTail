/**
 * The host picker: the one surface DeepTail draws itself. Everything after a
 * host is chosen is the harness's own web client, served by that host.
 *
 * This screen is intentionally framework-free. It runs before any harness
 * bundle has loaded, so it cannot depend on the client UI packages, and it must
 * still be legible when no host is reachable at all.
 *
 * @module
 */

import { invoke } from '@tauri-apps/api/core'
import type { HostRecord } from './boot.ts'

/**
 * Draw the picker and resolve with the operator's choice.
 *
 * @param container - mount point, cleared before drawing and again on choice.
 * @param hosts - every paired host.
 * @returns the chosen host, or undefined when the operator paired nothing.
 */
export function renderHostPicker(
  container: HTMLElement,
  hosts: readonly HostRecord[],
): Promise<HostRecord | undefined> {
  return new Promise((resolve) => {
    container.replaceChildren()
    const list = document.createElement('ul')
    for (const host of hosts) {
      const item = document.createElement('li')
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = `${host.label} — ${host.origin}`
      button.addEventListener(
        'click',
        () => {
          container.replaceChildren()
          resolve(host)
        },
        { once: true },
      )
      item.append(button)
      list.append(item)
    }

    const pair = document.createElement('button')
    pair.type = 'button'
    pair.textContent = 'Pair a host'
    pair.addEventListener('click', () => {
      void pairHost().then((added) => {
        if (added !== undefined) {
          container.replaceChildren()
          resolve(added)
        }
        return added
      })
    })

    container.append(list, pair)
  })
}

/**
 * Read a launch link from the operator and exchange it for a device grant.
 *
 * On mobile the same link arrives from the camera through the barcode-scanner
 * plugin; both paths hand the identical string to `pair_host`.
 *
 * @returns the newly paired host, or undefined when the operator cancelled.
 */
async function pairHost(): Promise<HostRecord | undefined> {
  const link = globalThis.prompt('Paste the URL that `dsh web` printed')
  if (link === null || link.trim() === '') return undefined
  const label = globalThis.prompt('Name for this host') ?? 'Harness'
  return invoke<HostRecord>('pair_host', { link, label })
}
