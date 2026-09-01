/**
 * Application entry. Resolves the theme, pairs a host if none is known, then
 * mounts the control plane over every paired host.
 *
 * The control plane and the harness client cannot share the page: the client
 * appends into whatever container it is given and takes the viewport, so the
 * shell is torn down before a client boots and re-mounted when the operator
 * comes back. One mechanism on every target beats two divergent paths, and it
 * is what mobile forces anyway.
 *
 * @module
 */

import { invoke } from '@tauri-apps/api/core'
import { type BootedHost, bootHost, teardownHost } from './boot.ts'
import { renderHostPicker } from './fleet.ts'
import type { HostRecord } from './host.ts'
import { followAppLifecycle } from './lifecycle.ts'
import { createTranslate } from './locales.ts'
import { messageOf } from './reason.ts'
import { applyTheme } from './theme.ts'
import { type CarrierHooks, createCarrier } from './transport.ts'
import { button, el } from './ui/dom.ts'
import { mountShell } from './ui/shell.ts'

const mount = document.querySelector('#root')
// Narrowed rather than asserted: the generic form of `querySelector` is a cast,
// and a `#root` that is not an element would fail later and further away.
if (!(mount instanceof HTMLElement)) throw new Error('deeptail: missing #root')
const container: HTMLElement = mount

applyTheme()
const t = createTranslate()

/**
 * Read the host registry, handing any failure to the picker.
 *
 * An unreadable registry is not a fatal boot. The picker reads the registry
 * itself and renders the host's own message with a retry, so every path that
 * needs the list goes through here rather than letting a rejection escape and
 * leave the window blank with the reason only in the console.
 * @returns every paired host.
 */
async function knownHosts(): Promise<readonly HostRecord[]> {
  try {
    return await invoke<HostRecord[]>('list_hosts')
  } catch {
    await renderHostPicker(container)
  }
  // The picker only resolves once a host is paired, so a second failure here is
  // the registry refusing to answer at all; it goes back to the picker rather
  // than escaping and leaving the window empty.
  return knownHosts()
}

/**
 * The hosts to mount over, pairing a first one when the registry is empty.
 * @returns every paired host.
 */
async function resolveHosts(): Promise<readonly HostRecord[]> {
  const known = await knownHosts()
  if (known.length > 0) return known
  await renderHostPicker(container)
  return knownHosts()
}

/** Carriers the control plane holds open, one per paired host. */
const shellCarriers = new Map<string, CarrierHooks>()

let booted: BootedHost | undefined
let bootedHost: HostRecord | undefined
let disposeShell: (() => void) | undefined
let returnBar: HTMLElement | undefined
// A boot spans an IPC call and every plugin bundle load. A second row click in
// that window would boot a second client over the first and leak it.
let opening = false

// One watcher for the whole app: the shell's own sockets are open long before
// any client boots, and those are the ones a suspend kills silently.
followAppLifecycle(function* carriers() {
  yield* shellCarriers.values()
  if (booted !== undefined) yield booted.carrier
})

/** Tear down whatever currently owns the page and hand back an empty container. */
async function clearPage(): Promise<void> {
  disposeShell?.()
  disposeShell = undefined
  shellCarriers.clear()
  returnBar?.remove()
  returnBar = undefined
  if (booted !== undefined && bootedHost !== undefined) await teardownHost(booted, bootedHost)
  booted = undefined
  bootedHost = undefined
  container.replaceChildren()
}

/**
 * Mount the control plane over a set of hosts.
 * @param hosts - the registry as it now stands.
 */
function mountControlPlane(hosts: readonly HostRecord[], notice?: string): void {
  disposeShell = mountShell(
    container,
    {
      hosts,
      carrierFor: (host) => {
        const carrier = createCarrier(host.id)
        shellCarriers.set(host.id, carrier)
        return carrier
      },
      open: openSession,
      pair: () => {
        void pairAnother()
      },
      repair: (hostId) => {
        // Re-pairing is pairing the same host again, so the form opens under the
        // name it is already filed under rather than blank.
        void pairAnother(hosts.find((host) => host.id === hostId)?.label)
      },
      unpair: async (hostId) => {
        // The socket is closed before the token is forgotten, so an unpaired
        // host cannot keep an authenticated stream open for the process's life.
        await clearPage()
        await invoke('forget_host', { host: hostId })
        mountControlPlane(await knownHosts())
      },
    },
    t,
    notice,
  )
}

/**
 * Boot the harness client for one host.
 * @param host - the host that owns the session.
 * @param sessionId - the session the operator chose.
 */
async function openSession(host: HostRecord, sessionId: string): Promise<void> {
  // The harness client opens at its own default view: nothing in its boot
  // surface takes a session id, so the operator re-selects there. The copy says
  // so rather than implying a deep link this cannot deliver.
  void sessionId
  if (opening) return
  opening = true
  try {
    await clearPage()
    booted = await bootHost(host, container)
    bootedHost = host
    showReturnBar()
  } catch (reason) {
    // Booting replaces the page, so a failure part way through leaves nothing
    // on screen. The control plane goes back up carrying the reason, rather
    // than a blank window with the reason only in the console.
    await clearPage()
    mountControlPlane(await knownHosts(), messageOf(reason))
  } finally {
    opening = false
  }
}

/** Pair a host, then come back to the control plane over the new registry. */
async function pairAnother(repairing?: string): Promise<void> {
  await clearPage()
  await renderHostPicker(container, undefined, undefined, repairing)
  mountControlPlane(await knownHosts())
}

/** Tear the booted client down and put the control plane back. */
async function returnToFleet(): Promise<void> {
  await clearPage()
  mountControlPlane(await knownHosts())
}

/**
 * The way back out of the harness client.
 *
 * It lives on `document.body` rather than in the container, because the client
 * owns everything inside the container once it boots.
 */
function showReturnBar(): void {
  const bar = el('div', { className: 'return-bar' })
  bar.append(
    button('button button-outline return-button', t('shell.backToFleet'), () => {
      void returnToFleet()
    }),
  )
  bar.dataset.deeptailReturn = ''
  document.body.append(bar)
  returnBar = bar
}

mountControlPlane(await resolveHosts())

// A clean close beats a dropped connection the host has to time out.
globalThis.addEventListener(
  'beforeunload',
  () => {
    void clearPage()
  },
  { once: true },
)
