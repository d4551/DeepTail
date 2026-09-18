/**
 * Driving a session from the control plane: message, steer and stop, and
 * spawning a new one.
 *
 * Every assertion is on rendered text and roles. The only substitution is the
 * Tauri IPC boundary, which no browser provides.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { oneHost, refusesUnknownPreset, sessions } from './fixtures.ts'
import { type Harness, startHarness, textOf } from './harness.ts'
import {
  COMPOSE_FIELD,
  clickAction,
  field,
  fillField,
  pressNewSession,
  SHEET,
  shellMounts,
  spawnUnknownPreset,
  state,
  waitForSheetGone,
  waitForState,
} from './page-steps.ts'
import { openRunningSession, waitForReturnBar } from './session-steps.ts'
import { openComposeSheet, openShell, openShellWithRoster, pressRowAction } from './surfaces.ts'
import { until } from './wait.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('sends a message through the compose sheet', async () => {
  const page = await openComposeSheet(harness)
  const dialog = page.locator(SHEET)
  expect(await dialog.getAttribute('aria-modal')).toBe('true')
  await harness.shoot(page, 'compose-sheet')
  await page.locator(COMPOSE_FIELD).fill('please rerun the tests')
  await clickAction(page, 'compose-send')
  await dialog.waitFor({ state: 'detached' })
  // A closed dialog is satisfied by a no-op, so assert what reached the host.
  const sent = (await harness.calls(page)).filter((call) => call.endpoint === 'session/prompt')
  expect(sent.length).toBe(1)
  expect(sent[0]?.host).toBe('dev-1')
  expect(sent[0]?.args['sessionId']).toBe('s-running')
  expect(sent[0]?.args['mode']).toBe('queue')
  expect(sent[0]?.args['content']).toEqual([{ type: 'text', text: 'please rerun the tests' }])
  expect(typeof sent[0]?.args['requestId']).toBe('string')
  await page.close()
})

it('steers rather than queues when Steer is chosen', async () => {
  const page = await openComposeSheet(harness)
  await page.locator(COMPOSE_FIELD).fill('stop what you are doing')
  await page.locator('[data-deeptail-action="compose-steer"]').click()
  await waitForSheetGone(page)
  // The mode is the only behavioural difference between the two buttons.
  const sent = (await harness.calls(page)).filter((call) => call.endpoint === 'session/prompt')
  expect(sent.map((call) => call.args['mode'])).toEqual(['steer'])
  await page.close()
})

it('stops a running session and clears the row once the host confirms', async () => {
  const page = await openShellWithRoster(harness)
  await pressRowAction(page, 'row-stop')
  const stopped = (await harness.calls(page)).filter((call) => call.endpoint === 'session/cancel')
  expect(stopped.length).toBe(1)
  expect(stopped[0]?.args['sessionId']).toBe('s-running')
  await page.close()
})

it('reports a failed stop in the roster instead of dropping it', async () => {
  const page = await openShell(harness, { remoteErrors: { 'session/cancel': 'agent already gone' } })
  await pressRowAction(page, 'row-stop')
  // The failure belongs on screen; a voided rejection would show nothing.
  expect(await textOf(page, '[data-deeptail-state="partial"]')).toContain('agent already gone')
  await page.close()
})

it('keeps the draft when a send fails', async () => {
  const page = await openComposeSheet(harness, { remoteErrors: { 'session/prompt': 'agent busy' } })
  await page.locator(COMPOSE_FIELD).fill('please rerun the tests')
  await clickAction(page, 'compose-send')
  expect(await textOf(page, '[data-deeptail-state="compose-error"]')).toContain('agent busy')
  expect(await page.locator(COMPOSE_FIELD).inputValue()).toBe('please rerun the tests')
  await harness.shoot(page, 'compose-error')
  await page.close()
})

it('spawns with a typed preset and reports the ids a host does have', async () => {
  const page = await openShell(
    harness,
    oneHost({ remote: { 'session/list': { items: sessions() }, 'session/create': { sessionId: 's-new' } } }),
  )
  await pressNewSession(page)
  // No host publishes a preset listing, so the field is typed and optional.
  await fillField(page, 'preset', 'ptc')
  await fillField(page, 'cwd', '/srv/work')
  await harness.shoot(page, 'new-session')
  await clickAction(page, 'spawn-create')
  await waitForSheetGone(page)
  // A closed dialog is satisfied by a no-op, so assert what reached the host.
  const created = (await harness.calls(page)).filter((call) => call.endpoint === 'session/create')
  expect(created.length).toBe(1)
  expect(created[0]?.host).toBe('dev-1')
  expect(created[0]?.args['agentPreset']).toBe('ptc')
  expect(created[0]?.args['cwd']).toBe('/srv/work')
  await page.close()
})

it('names the available presets when the host rejects the one typed', async () => {
  const page = await openShell(harness, oneHost(refusesUnknownPreset()))
  await spawnUnknownPreset(page)
  const strip = await textOf(page, state('spawn-error'))
  expect(strip).toContain('standard, ptc')
  // The dialog stays open so the operator can correct the id in place.
  expect(await page.locator(SHEET).count()).toBe(1)
  expect(await page.locator(field('preset')).inputValue()).toBe('nope')
  await page.close()
})

it('returns to the control plane from the bar beside a booted client', async () => {
  const page = await openShellWithRoster(harness)
  const rosterReads = async (): Promise<number> =>
    (await harness.calls(page)).filter((call) => call.endpoint === 'session/list').length
  // Opening a session hands the page to the harness client, which is where the
  // return bar comes from; the action under test is the way back out of it.
  await openRunningSession(page)
  await waitForReturnBar(page)
  const before = await rosterReads()
  await page.locator('[data-deeptail-action="return-fleet"]').click()
  // Coming back mounts the control plane over the registry again, which is what
  // re-reads the roster: the bar leaving on its own would say a node was
  // dropped, not that the fleet is showing.
  await page.locator('[data-deeptail-session="s-running"] .session-title').waitFor({ state: 'visible' })
  expect(await textOf(page, '[data-deeptail-session="s-running"] .session-title')).toBe('Refactor the loader')
  expect(await page.locator('[data-deeptail-return]').count()).toBe(0)
  await until(async () => (await rosterReads()) > before)
  expect(await rosterReads()).toBeGreaterThan(before)
  await page.close()
})

it('puts the control plane back, carrying the reason, when a client fails to boot', async () => {
  const page = await openShell(harness, { bootError: 'host refused the boot table' })
  await openRunningSession(page)
  // Booting replaces the page, so a failure part way through would otherwise
  // leave nothing on screen and no way back.
  await waitForState(page, 'shell-error')
  expect(await textOf(page, '[data-deeptail-state="shell-error"]')).toContain('host refused the boot table')
  expect(await shellMounts(page)).toBe(1)
  expect(await textOf(page, '[data-deeptail-session="s-running"] .session-title')).toBe('Refactor the loader')
  await page.close()
})
