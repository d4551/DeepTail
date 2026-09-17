/**
 * The native boundary, held to one door.
 *
 * This is the regression the transport suites could not report. Their double
 * was registered with `mock.module('@tauri-apps/api/core', …)`, which replaces
 * the copy of that module in the registry at the moment the mock is registered.
 * Bun runs every test file of one command in one process, so whether the
 * product modules that bind `invoke` at import time were looking at the double
 * or at Tauri depended on which suite had imported the library first: run
 * alone, the suite passed; run with the rest of the repository, sixteen cases
 * failed with a `TypeError` thrown from inside Tauri, because the real `invoke`
 * ran against a `window` no webview had installed `__TAURI_INTERNALS__` on.
 *
 * Two things make that unrepresentable now, and both are asserted here. The
 * double answers the runtime object every webview carries, so the copy of the
 * library under test is the library and there is nothing to substitute — the
 * carrier reaches this process's own runtime and its calls are recorded rather
 * than thrown. And the surface the product reaches Tauri through is named in
 * one module, so a second door is a failure this suite names rather than a
 * behaviour that depends on which file loaded first.
 *
 * @module
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { repositoryFiles } from '../scripts/source-tree.ts'
import { resetDocument } from './dom.ts'
import { invocations, resetTransportDouble, transport } from './transport-double.ts'

/** The one module a product file may reach Tauri through. */
const BOUNDARY = 'apps/deeptail/src/ipc.ts'

/** The package the boundary wraps. */
const PACKAGE = '@tauri-apps/api'

/**
 * The one product file that names the package and does not call it.
 *
 * `native-call.ts` imports a single type, which is erased before the page runs:
 * the call it describes is the boundary's own. A second name here is a second
 * door, and this suite reports it.
 */
const NAMES_WITHOUT_CALLING = 'apps/deeptail/src/native-call.ts'

beforeEach(() => {
  resetDocument()
  resetTransportDouble()
})

describe('the native boundary the product binds', () => {
  it('reaches the runtime object this process installed', async () => {
    const carrier = transport.createCarrier('host-1')
    await carrier.send(new URL('https://page.example/api/roster'), {})
    // A call that reached Tauri's own `invoke` would have thrown on
    // `window.__TAURI_INTERNALS__.invoke` before recording anything here.
    expect(invocations.map((call) => call.command)).toEqual(['carrier_fetch'])
    expect(invocations[0]?.host).toBe('host-1')
  })

  it('records the bundle fetch down the same path', async () => {
    const carrier = transport.createCarrier('host-1')
    await carrier.warmBundle('https://host.example/plugins/roster.js')
    expect(invocations.map((call) => call.command)).toEqual(['carrier_load_bundle'])
    expect(invocations[0]?.path).toBe('/plugins/roster.js')
  })

  it('records nothing for a carrier that asked for nothing', () => {
    transport.createCarrier('host-1')
    expect(invocations).toEqual([])
  })

  it('holds every product import of the Tauri package to that one module', async () => {
    // The rule is about what ships. A suite drives the boundary by answering
    // the runtime the library reads, and reaching the library from a test is
    // how it reads the same call the product does.
    const product = repositoryFiles(['.ts']).filter(
      (file) =>
        file.label.startsWith('apps/deeptail/src/') && file.label !== BOUNDARY && file.label !== NAMES_WITHOUT_CALLING,
    )
    const read = await Promise.all(
      product.map(async (file) => ({ label: file.label, text: await Bun.file(file.path).text() })),
    )
    // A second door is a second place a substitution has to land before the
    // first module that imports it is evaluated, which no caller can arrange.
    expect(read.filter((file) => file.text.includes(PACKAGE)).map((file) => file.label)).toEqual([])
  })
})
