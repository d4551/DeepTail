/**
 * Application entry. Resolves the theme, pairs a host if none is known, then
 * mounts the control plane over every paired host.
 *
 * @module
 */

import { invoke } from '@tauri-apps/api/core'
import { type BootedHost, bootHost, teardownHost } from './boot.ts'
import { renderHostPicker } from './fleet.ts'
import type { HostRecord } from './host.ts'
import { followAppLifecycle } from './lifecycle.ts'
import { createTranslate } from './locales.ts'
import { applyTheme } from './theme.ts'
import { createCarrier } from './transport.ts'
import { mountShell } from './ui/shell.ts'

const mount = document.getElementById('root')
if (mount === null) throw new Error('deeptail: missing #root')
// Bound after the check so closures below keep the narrowing.
const container: HTMLElement = mount

applyTheme()
const t = createTranslate()

/** Pair a first host when the registry is empty; otherwise go straight in. */
async function resolveHosts(): Promise<readonly HostRecord[]> {
  const hosts = await invoke<HostRecord[]>('list_hosts')
  if (hosts.length > 0) return hosts
  const paired = await renderHostPicker(container)
  return [paired]
}

const hosts = await resolveHosts()

// One shell at a time: switching hosts disposes the running client before the
// next boots, which is what mobile forces and what ctx.connection requires.
let booted: BootedHost | undefined
let bootedHost: HostRecord | undefined
let unwatchLifecycle: (() => void) | undefined

mountShell(
  container,
  {
    hosts,
    carrierFor: (host) => createCarrier(host.id),
    open: async (host, sessionId) => {
      // The harness client is what reads a conversation. It opens at its own
      // default view: nothing in its boot surface takes a session id, so the
      // operator re-selects there. The copy says so rather than implying a
      // deep link this cannot deliver.
      void sessionId
      if (booted !== undefined && bootedHost !== undefined) await teardownHost(booted, bootedHost)
      unwatchLifecycle?.()
      booted = await bootHost(host, container)
      bootedHost = host
      unwatchLifecycle = followAppLifecycle(booted.carrier)
    },
    pair: () => {
      globalThis.location.reload()
    },
    unpair: async (hostId) => {
      await invoke('forget_host', { host: hostId })
      globalThis.location.reload()
    },
  },
  t,
)

// A clean close beats a dropped connection the host has to time out.
globalThis.addEventListener(
  'beforeunload',
  () => {
    unwatchLifecycle?.()
    if (booted !== undefined && bootedHost !== undefined) void teardownHost(booted, bootedHost)
  },
  { once: true },
)
