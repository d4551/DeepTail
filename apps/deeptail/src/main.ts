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

/**
 * How many times the registry is asked before the boot gives up on it.
 *
 * Each attempt is separated by a whole trip through the picker, so this is a
 * count of the operator's own retries, not a poll.
 */
const REGISTRY_ATTEMPTS = 3

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
async function knownHosts(attemptsLeft = REGISTRY_ATTEMPTS): Promise<readonly HostRecord[]> {
  // A registry that never answers is a failure the picker asks the operator to
  // retry, and each trip through it mounts a fresh runtime and a fresh frame.
  // The recursion is bounded so an unreadable registry ends in a reported
  // failure rather than in a window that allocates until it stops responding.
  const read = await invoke<HostRecord[]>('list_hosts').then(
    (hosts) => hosts,
    (reason) => (attemptsLeft <= 1 ? Promise.reject(reason) : undefined),
  )
  if (read !== undefined) return read
  await renderHostPicker(container)
  return knownHosts(attemptsLeft - 1)
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
        runToBootNotice(pairAnother())
      },
      repair: (hostId) => {
        // Re-pairing pairs the same host again, so the form opens under the
        // name it is filed under rather than blank.
        runToBootNotice(pairAnother(hosts.find((host) => host.id === hostId)?.label))
      },
      unpair: async (hostId) => {
        // The socket is closed before the token is forgotten, so an unpaired
        // host leaves no authenticated stream open for the process's life.
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
 *
 * The harness client opens at its own default view: nothing in its boot
 * surface takes a session id, so the operator re-selects there. The copy says
 * so rather than implying a deep link this path cannot deliver.
 * @param host - the host that owns the session.
 */
async function openSession(host: HostRecord): Promise<void> {
  if (opening) return
  opening = true
  // Booting replaces the page, so a failure part way through leaves nothing
  // on screen. The control plane goes back up carrying the reason, rather
  // than a blank window with the reason only in the console.
  const boot = clearPage()
    .then(() => bootHost(host, container))
    .then((client) => {
      booted = client
      bootedHost = host
      return showReturnBar()
    })
    .then(undefined, async (reason) => {
      await clearPage()
      mountControlPlane(await knownHosts(), messageOf(reason))
    })
  await boot.then(() => (opening = false))
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

/** Mount the control plane from the registry, from a blank or failed page. */
async function start(): Promise<void> {
  mountControlPlane(await resolveHosts())
}

/**
 * Let page-owning background work settle, reporting a failure through the
 * boot notice rather than leaving a rejected promise no surface holds.
 * @param work - the boot step to run.
 */
function runToBootNotice<T>(work: Promise<T>): void {
  work.then(undefined, (reason) => showBootNotice(messageOf(reason)))
}

/**
 * The failure surface for a boot step that owns the page: the reason, and the
 * one remedy the window still has — mounting again from the registry.
 * @param message - the failure, in the operator's language.
 */
function showBootNotice(message: string): void {
  const strip = el('div', { className: 'error', role: 'alert', text: message, data: { deeptailState: 'boot-error' } })
  strip.append(button('retry', t('action.retry'), () => runToBootNotice(start())))
  container.replaceChildren(strip)
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
    button('button button-outline return-button', t('shell.backToFleet'), () => runToBootNotice(returnToFleet())),
  )
  bar.dataset.deeptailReturn = ''
  document.body.append(bar)
  returnBar = bar
}

runToBootNotice(start())

// A clean close beats a dropped connection the host has to time out.
globalThis.addEventListener(
  'beforeunload',
  () => {
    runToBootNotice(clearPage())
  },
  { once: true },
)
