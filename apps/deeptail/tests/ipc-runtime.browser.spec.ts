/**
 * The runtime a real engine carries, and what the page's own socket makes of it.
 *
 * The unit suites answer a runtime object in this process; in Chromium the page
 * gets its runtime from the scripted IPC, installed as an init script before any
 * module of the bundle runs. That runtime is the page's own, so it has to behave
 * the way a webview's does — the four members the installed library resolves, and
 * an identifier `transformCallback` mints that the wire can carry.
 *
 * It was answering the callback itself rather than an identifier, which made the
 * page's runtime one a page constructing a real `Channel` could not cross on:
 * the identifier would have been a function, and a function is not something a
 * command can carry to Rust. Nothing said so, because `transformCallback`'s
 * answer was never sent anywhere — Playwright cannot return a function out of
 * `page.evaluate`, so the case read `undefined` and asserted the identifier was a
 * string off a value it had never received. Every reading below therefore happens
 * inside the page, and comes out as data.
 *
 * The socket the product builds is driven here too. `transport.ts` classes are
 * not exported, so the way to reach the socket is the page's own: the shell boots
 * a carrier for each paired host, and the mux it opens registers a callback under
 * an identifier. Both halves of that are read from the page rather than restated.
 *
 * @module
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { oneHost } from './fixtures.ts'
import { type Harness, type OpenedPage, startHarness } from './harness.ts'
import { openShellWithRoster } from './surfaces.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

/**
 * The page the runtime readings are taken from: the built shell, booted.
 *
 * The runtime itself exists before the bundle runs either way, but the socket's
 * registration only exists once the carrier has opened it, so what every reading
 * below wants is a page whose shell has seated.
 * @returns the loaded page, which the caller closes.
 */
function booted(): Promise<OpenedPage> {
  return openShellWithRoster(harness)
}

it('is installed before any module runs, so a page that boots has one to read', async () => {
  // Held back to the moment the parser asks for the entry, so what is read is
  // the runtime the page was served with rather than one a module left behind.
  const page = await harness.open(oneHost(), { entry: 'block' })
  const members = await page.evaluate(() => window.deeptailRuntimeMembers?.() ?? [])
  await page.close()
  expect(members).toContain('invoke')
}, 60_000)

it('exposes the four members the installed library resolves, and no fifth', async () => {
  const page = await booted()
  const members = await page.evaluate(() => window.deeptailRuntimeMembers?.() ?? [])
  await page.close()
  // `invoke` is the command boundary, `transformCallback` is how a channel
  // registers itself, `unregisterCallback` is how it gives the slot back, and
  // `convertFileSrc` is how the asset protocol turns a device path into a URL.
  // Four is what the installed release's own declaration carries; a runtime with
  // three is one the library would throw on the moment a page asked for an asset.
  expect(members).toEqual(['convertFileSrc', 'invoke', 'transformCallback', 'unregisterCallback'])
}, 60_000)

it('mints an identifier the wire can carry, holds the callback, and delivers through it', async () => {
  const page = await booted()
  // The whole interchange happens inside the page: a function cannot cross back
  // out through `page.evaluate`, so what a case reads is the report and never the
  // callback, and nothing here can assert against a value it did not receive.
  const observed = await page.evaluate(() => window.deeptailIdentifierReport?.())
  await page.close()
  // The identifier is what the backend is handed, so it has to be something the
  // wire carries: a string the runtime minted, not the callback it was given.
  expect(observed?.identifier).not.toBe('')
  expect(observed?.distinct).toBe(true)
  expect(observed?.second).not.toBe('')
  // Two registrations are two held callbacks, and a frame delivered for the
  // first identifier reaches the callback and no other.
  expect(observed?.registrations).toBe(2)
  expect(observed?.delivered).toBe(true)
  // A released identifier is one the runtime no longer holds, so a second
  // release reports nothing given back rather than an answer for nothing.
  expect(observed?.released).toBe(true)
  expect(observed?.afterRelease).toBe(false)
}, 60_000)

it('holds the callback the page’s own mux socket registered, which is what Rust addresses', async () => {
  const page = await booted()
  // The carrier opens one socket per paired host at boot, and that socket is
  // built by the shipped `Channel`, so the page's runtime holds a callback for
  // it before any frame arrives.
  const opened = await page.evaluate(() => {
    const registrations = window.deeptailCallbackRegistrations?.() ?? 0
    const reported = window.deeptailIdentifierReport?.()
    return { registrations, probeAdded: reported?.registrations ?? -1 }
  })
  const commands = await harness.commands(page)
  await page.close()
  // One host, one socket: the registration the page holds for itself is the
  // socket's, and the probe's own two registrations are counted apart from it.
  expect(commands).toContain('carrier_open_mux')
  expect(opened.registrations).toBeGreaterThanOrEqual(1)
  expect(opened.probeAdded).toBe(2)
}, 60_000)
