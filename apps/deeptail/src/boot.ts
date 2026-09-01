/**
 * The boot sequence, mirroring the harness's own non-served shell precedent
 * (`connectWorkerHost` in `dsh-experimental-webworker-runtime`), minus the two
 * hooks that only an in-process host may set: `openStream`, because the mux
 * protocol stays in the harness and only a local host can decode its items,
 * and `ownsHost`, because a remote host is not ours to declare privileged.
 *
 * Order is fixed by the web boot protocol: the transport global must exist
 * before any bundle executes, the injection table then reproduces the served
 * boot rows in table order, and only then may the shell entry proceed past its
 * pre-boot await.
 *
 * @module
 */

import { AppWebEntry } from '@deepseek-ai/dsh-client-web'
import { invoke } from '@tauri-apps/api/core'
import { applyIndexInjections, type IndexInjection } from './injections.ts'
import { createCarrier } from './transport.ts'

/** One paired host, as the registry reports it. */
export interface HostRecord {
  readonly id: string
  readonly label: string
  readonly origin: string
  readonly lastSeen?: number
}

interface BootReadyGlobal {
  __DSH_BOOT_READY__?: PromiseWithResolvers<void>
}

/**
 * Install the page boot barrier the shell entry awaits before it reads any
 * global. Idempotent: a shell entry evaluating concurrently in this document
 * must observe the same deferred, not a second one.
 */
function bootReadyGate(): PromiseWithResolvers<void> {
  const page = globalThis as BootReadyGlobal
  const existing = page.__DSH_BOOT_READY__
  if (existing !== undefined) return existing
  const created = Promise.withResolvers<void>()
  page.__DSH_BOOT_READY__ = created
  return created
}

/**
 * Boot the harness shell against one paired host.
 *
 * @param host - the host to connect to.
 * @param container - mount point handed to the shell's UI renderer.
 * @returns the live shell entry; dispose it before booting another host.
 */
export async function bootHost(host: HostRecord, container: HTMLElement): Promise<AppWebEntry> {
  const ready = bootReadyGate()
  // The handshake may fail before the entry awaits the promise; this no-op
  // subscription keeps that from surfacing as an unhandled rejection.
  void ready.promise.catch(() => {})
  try {
    const carrier = createCarrier(host.id)
    Object.assign(globalThis, { __DSH_TRANSPORT__: carrier })
    const injections = await invoke<readonly IndexInjection[]>('boot_injections', { host: host.id })
    await applyIndexInjections(injections, (src: string) => carrier.loadBundle(src))
    ready.resolve()
  } catch (reason) {
    ready.reject(reason)
    throw reason
  }
  const entry = new AppWebEntry(container)
  await entry.run()
  return entry
}

/**
 * Tear down the current shell so another host can boot in the same webview.
 *
 * Switching by teardown rather than a second webview is not a simplification:
 * multiwebview is desktop-only behind Tauri's `unstable` feature, and
 * `ctx.connection` refuses a second generation source in one client runtime,
 * so one shell at a time is the only shape that works on every target.
 *
 * @param entry - the shell entry to dispose.
 * @param host - the host whose mux socket should be closed with it.
 */
export async function teardownHost(entry: AppWebEntry, host: HostRecord): Promise<void> {
  await entry.dispose()
  await invoke('carrier_close_mux', { host: host.id })
  Reflect.deleteProperty(globalThis, '__DSH_TRANSPORT__')
  Reflect.deleteProperty(globalThis, '__DSH_BOOT_READY__')
}
