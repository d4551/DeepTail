/**
 * The page's scripted IPC, driven from the page.
 *
 * The scripted IPC is emitted as source and evaluated in the page, so a function
 * that reaches for another by name arrives naming something the page has to have.
 * Nothing enforced that: `hostOf` was written into `tauri-ipc-carrier.ts` and
 * left out of `CARRIER_SOURCES`, so `carrier_fetch` threw `ReferenceError:
 * hostOf is not defined` inside the page, every Remote call answered nothing, and
 * the roster came up empty — for nine browser suites, while the unit suites and
 * the type checker both stayed green, because neither of them evaluates the
 * emitted source.
 *
 * This case is that hole closed at the level it opened at. It reaches the
 * page's own runtime and calls the commands the seeding has to answer, so a
 * function left out of the emitted sources is a `ReferenceError` here rather
 * than an empty roster three layers up.
 *
 * @module
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { type Harness, type OpenedPage, startHarness } from './harness.ts'
import { openShellWithRoster } from './surfaces.ts'
import { CARRIER_SOURCES } from './tauri-ipc-carrier.ts'
import { unseededCarrierCalls } from './zz-probe-seeding.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

/**
 * The page every page-reading case here starts from.
 *
 * The shared opener, named once for this suite: the booted shell with its row
 * seated is what all of them read, and saying so once is what keeps a case from
 * waiting on something weaker.
 * @returns the page, which the caller closes.
 */
function bootShell(): Promise<OpenedPage> {
  return openShellWithRoster(harness)
}

it('seeds every carrier function another seeded function calls, so none arrives undefined', () => {
  // The hole read without a page, and at the level it opened at: the reader
  // compares the calls the emitted sources make against what they carry, so a
  // helper that is called and not seeded is named here rather than surfacing as
  // a `ReferenceError` three layers up. `hostOf` was exactly that. What this case
  // adds to the reader's own suite is the count: it says the shipped set is both
  // complete and non-empty, so a reader handed nothing cannot pass it.
  const unseeded = unseededCarrierCalls()
  expect(unseeded).toHaveLength(0)
  expect(Object.keys(CARRIER_SOURCES).length).toBeGreaterThan(0)
})

it('answers a carrier fetch from the page’s own runtime, so every seeded function resolved', async () => {
  const page = await bootShell()
  // The parameters are the ones the product sends: a host, and a request whose
  // body carries the Remote envelope. A function missing from the emitted
  // sources throws here, before any surface has a chance to hide it.
  const answered = await page.evaluate(async () => {
    const runtime = window['__TAURI_INTERNALS__']
    if (runtime === undefined) throw new Error('the page carries no runtime object')
    const request = {
      path: '/api/session/list',
      method: 'POST',
      body: JSON.stringify({ type: 'client-request', rpcId: '1', payload: { args: {} } }),
      headers: [],
    }
    const value = await runtime.invoke('carrier_fetch', { host: 'dev-1', request })
    const recorded = window.deeptailRecordedCalls ?? []
    return { value: JSON.stringify(value), endpoints: recorded.map((call) => call.endpoint) }
  })
  await page.close()
  // The carrier answers a server-response envelope, and the read is recorded
  // under the endpoint the request named — which is what the seeding being
  // complete looks like from outside.
  expect(answered.value).toContain('server-response')
  expect(answered.endpoints).toContain('session/list')
}, 60_000)

it('seats the roster the shell boots against', async () => {
  const page = await bootShell()
  // The rows are the product's own path through the seeded IPC: two sessions
  // reach the roster only if `list_hosts`, `carrier_fetch` and the mux all
  // answered, so this is the end the seeding exists for.
  const seated = await page.locator('[data-deeptail-session]').count()
  await page.close()
  expect(seated).toBe(2)
}, 60_000)
