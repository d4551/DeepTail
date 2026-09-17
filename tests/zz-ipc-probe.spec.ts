/**
 * The runtime double's own contract, which the product suites depend on.
 *
 * `tests/ipc-reach.spec.ts` holds the product's boundary: a carrier built
 * through the product's module graph reaches this process's runtime, and no
 * product file reaches Tauri around it. `tests/transport-mux.spec.ts` drives a
 * socket over that runtime. This file is the third thing, and the one both of
 * them stand on without saying so: the properties the *double* has to keep for
 * either of those suites to mean anything.
 *
 * Three of them, and each is a way the double could quietly stop being a double
 * while every product suite kept passing:
 *
 * 1. the invocation ledger starts empty, so a suite that reads one call is
 *    reading its own call;
 * 2. the runtime is reinstalled after a reset, so a suite that runs second is
 *    answered as well as the suite that ran first — the failure that made this
 *    double necessary in the first place;
 * 3. the callback registry is dropped with it, so an identifier from an earlier
 *    suite cannot be the one a later frame is delivered to.
 *
 * @module
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { resetDocument } from './dom.ts'
import { installedRuntime } from './tauri-runtime.ts'
import { callbackRegistrations, channels, invocations, resetTransportDouble } from './transport-double.ts'

beforeEach(() => {
  resetDocument()
  resetTransportDouble()
})

describe('the runtime double', () => {
  it('starts a suite with an empty ledger, so a case reads its own calls', () => {
    expect({ invocations: invocations.length, channels: channels.length }).toEqual({ invocations: 0, channels: 0 })
  })

  it('reinstalls the runtime on reset, so the second suite is answered like the first', async () => {
    // The reset a suite makes is the one that matters: happy-dom replaces the
    // global's own properties, and a runtime installed once at import would be
    // gone by the time the second file of a run asked for it.
    resetTransportDouble()
    await installedRuntime().invoke('carrier_fetch', { host: 'host-1' })
    expect(invocations.map((call) => call.command)).toEqual(['carrier_fetch'])
  })

  it('drops the callback registry with the ledger, so no identifier outlives its suite', () => {
    resetTransportDouble()
    expect(callbackRegistrations()).toBe(0)
  })
})
