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
import type { HostRecord } from './host.ts'
import { applyIndexInjections, type IndexInjection } from './injections.ts'
import { type CarrierHooks, createCarrier } from './transport.ts'

/** Names owned by the harness's page-boot protocol. */
const BOOT_READY_KEY = '__DSH_BOOT_READY__'
const TRANSPORT_KEY = '__DSH_TRANSPORT__'

/** A running shell and the carrier feeding it. */
export interface BootedHost {
  readonly entry: AppWebEntry
  readonly carrier: CarrierHooks
}

interface BootReadyGlobal {
  [BOOT_READY_KEY]?: PromiseWithResolvers<void>
}

/**
 * Install the page boot barrier the shell entry awaits before it reads any
 * global. Idempotent: a shell entry evaluating concurrently in this document
 * must observe the same deferred, not a second one.
 */
function bootReadyGate(): PromiseWithResolvers<void> {
  const page = globalThis as BootReadyGlobal
  const existing = page[BOOT_READY_KEY]
  if (existing !== undefined) return existing
  const created = Promise.withResolvers<void>()
  page[BOOT_READY_KEY] = created
  return created
}

/**
 * Boot the harness shell against one paired host.
 *
 * @param host - the host to connect to.
 * @param container - mount point handed to the shell's UI renderer.
 * @returns the live shell entry and its carrier; tear down before booting another host.
 */
export async function bootHost(host: HostRecord, container: HTMLElement): Promise<BootedHost> {
  const ready = bootReadyGate()
  void ready.promise.catch(() => {})
  const carrier = createCarrier(host.id)
  try {
    Object.assign(globalThis, { [TRANSPORT_KEY]: carrier })
    const injections = await invoke<readonly IndexInjection[]>('boot_injections', { host: host.id })
    await applyIndexInjections(injections, (src: string) => carrier.loadBundle(src))
    ready.resolve()
  } catch (reason) {
    // The transport global is installed before the table is applied, so a
    // failure here must remove it: a half-booted page that still advertises a
    // carrier would let a retry attach to a host it never finished reaching.
    Reflect.deleteProperty(globalThis, TRANSPORT_KEY)
    ready.reject(reason)
    throw reason
  }
  const entry = new AppWebEntry(container)
  await entry.run()
  return { entry, carrier }
}

/**
 * Tear down the current shell so another host can boot in the same webview.
 *
 * Switching by teardown rather than a second webview is not a simplification:
 * multiwebview is desktop-only behind Tauri's `unstable` feature, and
 * `ctx.connection` refuses a second generation source in one client runtime,
 * so one shell at a time is the only shape that works on every target.
 *
 * @param booted - the shell entry and carrier to dispose.
 * @param host - the host whose mux socket should be closed with it.
 */
export async function teardownHost(booted: BootedHost, host: HostRecord): Promise<void> {
  booted.carrier.suspendMuxSocket()
  await booted.entry.dispose()
  await invoke('carrier_close_mux', { host: host.id })
  Reflect.deleteProperty(globalThis, TRANSPORT_KEY)
  Reflect.deleteProperty(globalThis, BOOT_READY_KEY)
}

export type { HostRecord } from './host.ts'
