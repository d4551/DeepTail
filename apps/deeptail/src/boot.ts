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
 * Install the page gate the shell entry watches before it reads any global.
 * Idempotent: a shell entry evaluating concurrently in this document must
 * observe the same deferred, not a second one. The key is removed when the
 * boot that installed it finishes, so every attempt starts from an unsettled
 * gate.
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
  ready.promise.then(undefined, () => {
    // The barrier's rejection is already reported through the boot that failed;
    // this reference only keeps the reader of the gate from racing an unhandled
    // rejection warning past the consumer that acts on it.
  })
  const carrier = createCarrier(host.id)
  Object.assign(globalThis, { [TRANSPORT_KEY]: carrier })
  const installed = await invoke<readonly IndexInjection[]>('boot_injections', { host: host.id })
    .then((rows) => applyIndexInjections(rows, (src: string) => carrier.loadBundle(src)))
    .then(
      () => ({ settled: true as const }),
      (reason) => discardFailedBoot(ready, reason),
    )
  if (!installed.settled) throw installed.reason
  ready.resolve()
  const entry = new AppWebEntry(container)
  await entry.run()
  return { entry, carrier }
}

/**
 * Undo a boot that failed partway, and report it through the barrier.
 *
 * Both globals are installed before the injection table is applied, so a
 * failure must remove both, and nothing else will: the caller never receives a
 * `BootedHost`, so teardown is out of reach. A page that still advertises a
 * carrier would let a retry attach to a host it never finished reaching, and a
 * rejected barrier can never be settled again, so leaving it behind would make
 * the shell paint this failure's message for every later host, reachable or
 * not.
 * @param ready - the barrier the page's shell entry is waiting on.
 * @param reason - whatever the failed step rejected with.
 * @returns the failure, marked apart from a settled boot.
 */
function discardFailedBoot<T>(ready: PromiseWithResolvers<void>, reason: T): { settled: false; reason: T } {
  Reflect.deleteProperty(globalThis, TRANSPORT_KEY)
  Reflect.deleteProperty(globalThis, BOOT_READY_KEY)
  ready.reject(reason)
  return { settled: false, reason }
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
