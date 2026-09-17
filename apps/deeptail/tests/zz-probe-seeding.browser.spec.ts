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
import { oneHost } from './fixtures.ts'
import { type Harness, startHarness } from './harness.ts'
import { unseededCarrierCalls } from './zz-probe-seeding.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('seeds every carrier function another seeded function calls, so none arrives undefined', () => {
  // The hole read without a page, and at the level it opened at: the reader
  // compares the calls the emitted sources make against what they carry, so a
  // helper that is called and not seeded is named here rather than surfacing as
  // a `ReferenceError` three layers up. `hostOf` was exactly that.
  expect(unseededCarrierCalls()).toEqual([])
})

it('answers a carrier fetch from the page’s own runtime, so every seeded function resolved', async () => {
  const page = await harness.open(oneHost())
  // The parameters are the ones the product sends: a host, and a request whose
  // body carries the Remote envelope. A function missing from the emitted
  // sources throws here, before any surface has a chance to hide it.
  const answered = await page.evaluate(async () => {
    const runtime = window.__TAURI_INTERNALS__
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
  const page = await harness.open(oneHost())
  await page.waitForSelector('[data-deeptail-shell]')
  // The rows are the product's own path through the seeded IPC: two sessions
  // reach the roster only if `list_hosts`, `carrier_fetch` and the mux all
  // answered, so this is the end the seeding exists for.
  await page.locator('[data-deeptail-session="s-running"]').waitFor({ state: 'visible' })
  const seated = await page.locator('[data-deeptail-session]').count()
  await page.close()
  expect(seated).toBe(2)
}, 60_000)
