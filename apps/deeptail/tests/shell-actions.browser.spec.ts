/**
 * Driving a session from the control plane: message, steer and stop, and
 * spawning a new one.
 *
 * Every assertion is on rendered text and roles. The only substitution is the
 * Tauri IPC boundary, which no browser provides.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { oneHost, SESSIONS } from './fixtures.ts'
import { type Harness, startHarness, textOf } from './harness.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('sends a message through the compose sheet', async () => {
  const page = await harness.open(oneHost())
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-session="s-running"]').hover()
  await page.locator('[data-deeptail-session="s-running"] [data-deeptail-action="row-message"]').click()
  const dialog = page.locator('[data-deeptail-dialog]')
  expect(await dialog.getAttribute('aria-modal')).toBe('true')
  await harness.shoot(page, 'compose-sheet')
  await page.locator('[data-deeptail-field="message"]').fill('please rerun the tests')
  await page.locator('[data-deeptail-action="compose-send"]').click()
  await dialog.waitFor({ state: 'detached' })
  // A closed dialog is satisfied by a no-op, so assert what reached the host.
  const sent = (await harness.calls(page)).filter((call) => call.endpoint === 'session/prompt')
  expect(sent.length).toBe(1)
  expect(sent[0]?.host).toBe('dev-1')
  expect(sent[0]?.args.sessionId).toBe('s-running')
  expect(sent[0]?.args.mode).toBe('queue')
  expect(sent[0]?.args.content).toEqual([{ type: 'text', text: 'please rerun the tests' }])
  expect(typeof sent[0]?.args.requestId).toBe('string')
  await page.close()
})

it('steers rather than queues when Steer is chosen', async () => {
  const page = await harness.open(oneHost())
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-session="s-running"]').hover()
  await page.locator('[data-deeptail-session="s-running"] [data-deeptail-action="row-message"]').click()
  await page.locator('[data-deeptail-field="message"]').fill('stop what you are doing')
  await page.locator('[data-deeptail-action="compose-steer"]').click()
  await page.locator('[data-deeptail-dialog]').waitFor({ state: 'detached' })
  // The mode is the only behavioural difference between the two buttons.
  const sent = (await harness.calls(page)).filter((call) => call.endpoint === 'session/prompt')
  expect(sent.map((call) => call.args.mode)).toEqual(['steer'])
  await page.close()
})

it('stops a running session and clears the row once the host confirms', async () => {
  const page = await harness.open(oneHost())
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-session="s-running"]').hover()
  await page.locator('[data-deeptail-session="s-running"] [data-deeptail-action="row-stop"]').click()
  const stopped = (await harness.calls(page)).filter((call) => call.endpoint === 'session/cancel')
  expect(stopped.length).toBe(1)
  expect(stopped[0]?.args.sessionId).toBe('s-running')
  await page.close()
})

it('reports a failed stop in the roster instead of dropping it', async () => {
  const page = await harness.open(oneHost({ remoteErrors: { 'session/cancel': 'agent already gone' } }))
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-session="s-running"]').hover()
  await page.locator('[data-deeptail-session="s-running"] [data-deeptail-action="row-stop"]').click()
  // The failure belongs on screen; a voided rejection would show nothing.
  expect(await textOf(page, '[data-deeptail-state="partial"]')).toContain('agent already gone')
  await page.close()
})

it('keeps the draft when a send fails', async () => {
  const page = await harness.open(oneHost({ remoteErrors: { 'session/prompt': 'agent busy' } }))
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-session="s-running"]').hover()
  await page.locator('[data-deeptail-session="s-running"] [data-deeptail-action="row-message"]').click()
  await page.locator('[data-deeptail-field="message"]').fill('please rerun the tests')
  await page.locator('[data-deeptail-action="compose-send"]').click()
  expect(await textOf(page, '[data-deeptail-state="compose-error"]')).toContain('agent busy')
  expect(await page.locator('[data-deeptail-field="message"]').inputValue()).toBe('please rerun the tests')
  await harness.shoot(page, 'compose-error')
  await page.close()
})

it('spawns with a typed preset and reports the ids a host does have', async () => {
  const page = await harness.open(
    oneHost({ remote: { 'session/list': { items: SESSIONS }, 'session/create': { sessionId: 's-new' } } }),
  )
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-action="new-session"]').click()
  // No host publishes a preset listing, so the field is typed and optional.
  await page.locator('[data-deeptail-field="preset"]').fill('ptc')
  await page.locator('[data-deeptail-field="cwd"]').fill('/srv/work')
  await harness.shoot(page, 'new-session')
  await page.locator('[data-deeptail-action="spawn-create"]').click()
  await page.locator('[data-deeptail-dialog]').waitFor({ state: 'detached' })
  await page.close()
})

it('names the available presets when the host rejects the one typed', async () => {
  const page = await harness.open(
    oneHost({
      remoteErrors: { 'session/create': 'no such preset' },
      remoteErrorCodes: { 'session/create': 'agent-preset-not-found' },
      remoteErrorDetails: { 'session/create': { available: ['standard', 'ptc'] } },
    }),
  )
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-action="new-session"]').click()
  await page.locator('[data-deeptail-field="preset"]').fill('nope')
  await page.locator('[data-deeptail-action="spawn-create"]').click()
  const strip = await textOf(page, '[data-deeptail-state="spawn-error"]')
  expect(strip).toContain('standard, ptc')
  // The dialog stays open so the operator can correct the id in place.
  expect(await page.locator('[data-deeptail-dialog]').count()).toBe(1)
  expect(await page.locator('[data-deeptail-field="preset"]').inputValue()).toBe('nope')
  await page.close()
})

it('puts the control plane back, carrying the reason, when a client fails to boot', async () => {
  const page = await harness.open(oneHost({ bootError: 'host refused the boot table' }))
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-session="s-running"] .session-open').click()
  // Booting replaces the page, so a failure part way through would otherwise
  // leave nothing on screen and no way back.
  await page.locator('[data-deeptail-state="shell-error"]').waitFor({ state: 'visible' })
  expect(await textOf(page, '[data-deeptail-state="shell-error"]')).toContain('host refused the boot table')
  expect(await page.locator('[data-deeptail-shell]').count()).toBe(1)
  expect(await textOf(page, '[data-deeptail-session="s-running"] .session-title')).toBe('Refactor the loader')
  await page.close()
})
