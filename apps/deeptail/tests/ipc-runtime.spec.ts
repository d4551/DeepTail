/**
 * The page's own socket and the commands behind it, driven in a real engine.
 *
 * The unit suites answer a runtime object in this process; in Chromium the page
 * gets its runtime from the scripted IPC, installed as an init script before any
 * module of the bundle runs, and the carrier the shell boots registers its socket
 * through it. What only a real page can prove is the delivery half: a frame the
 * mux pushes reaches the socket the page opened, the roster the page holds moves
 * because of it, and a command the scripted backend does not carry is refused
 * where the promise lives — inside the page.
 *
 * The runtime's own members and the identifier it mints are held in
 * `ipc-runtime.browser.spec.ts`; the channel the library builds in
 * `ipc-runtime.unit.spec.ts`; and the carrier socket's handover in
 * `ipc-runtime-carrier.unit.spec.ts`.
 *
 * @module
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { fleet, oneHost } from './fixtures.ts'
import { type Harness, startHarness, textOf } from './harness.ts'
import { openShell, openShellWithRoster } from './surfaces.ts'
import { until } from './wait.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('holds one socket registration per paired host, so two hosts are two identifiers', async () => {
  const page = await openShell(harness, fleet({ muxHosts: ['dev-1', 'lab-2'] }))
  await page.waitForSelector('[data-deeptail-session]')
  const registrations = await page.evaluate(() => window.deeptailCallbackRegistrations?.() ?? 0)
  await page.close()
  // One host, one socket: the registrations the page holds for itself are the
  // sockets' — the probe's own are taken only by the case that mints them.
  expect(registrations).toBe(2)
}, 60_000)

it('moves the roster when the mux pushes a session over the page’s own socket', async () => {
  const page = await openShell(harness, oneHost({ muxHosts: ['dev-1'] }))
  await page.waitForSelector('[data-deeptail-session]')
  const before = await page.locator('[data-deeptail-session]').count()
  await harness.forward(page, 'api-session/added', [
    { sessionId: 's-pushed', updatedAt: Date.now(), running: true, blank: false },
  ])
  await page.waitForSelector('[data-deeptail-session="s-pushed"]')
  // The row is the frame's own, seated beside the row the boot read wrote: the
  // socket delivered into the roster the page already held. A frame carries no
  // title, so the row says so rather than inventing one.
  const after = await page.locator('[data-deeptail-session]').count()
  expect(after).toBe(before + 1)
  expect(await textOf(page, '[data-deeptail-session="s-pushed"] .session-title')).toBe('Untitled session')
  // And the roster stays live on the next frame the mux pushes, which is what
  // says the delivery was the socket's and not a one-shot repaint.
  await harness.forward(page, 'api-session/removed', ['s-pushed'])
  await until(async () => (await page.locator('[data-deeptail-session="s-pushed"]').count()) === 0)
  await page.close()
}, 60_000)

it('refuses a command the script does not carry, where the promise lives', async () => {
  const page = await openShellWithRoster(harness)
  const outcome = await page.evaluate(() => window.deeptailCommandOutcome?.('carrier_teleport'))
  await page.close()
  // The refusal is the backend's own: an answered nothing would read as a
  // command the wire carries, and the page would run on a socket that lies.
  expect(outcome?.settled).toBe('rejected')
  expect(outcome?.message).toContain('no carrier is scripted for')
}, 60_000)

it('delivers a frame for an identifier the page never registered to nothing', async () => {
  const page = await openShellWithRoster(harness)
  const delivered = await page.evaluate(() => window.deeptailDeliver?.('no-such-identifier', 'probe'))
  const registrations = await page.evaluate(() => window.deeptailCallbackRegistrations?.() ?? 0)
  await page.close()
  // A frame for an identifier nothing registered is a wire the page never
  // opened: the delivery lands nowhere, and the count of what the runtime holds
  // says the refusal was the delivery's and not a registration lost.
  expect(delivered).toBe(false)
  expect(registrations).toBe(1)
}, 60_000)
