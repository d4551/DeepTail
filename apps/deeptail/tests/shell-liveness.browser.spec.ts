/**
 * The live roster: rows that arrive, leave and change over the host's event
 * stream rather than through a re-read.
 *
 * Every assertion is on rendered text and roles. The only substitution is the
 * Tauri IPC boundary, which no browser provides.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { oneHost } from './fixtures.ts'
import { type Harness, startHarness, textOf } from './harness.ts'
import { action, sessionRow } from './page-steps.ts'
import { RUNNING_ROW, waitForLiveShell } from './surfaces.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('adds a row from a forwarded roster event without re-reading the list', async () => {
  const page = await harness.open(
    oneHost({
      muxHosts: ['dev-1'],
      muxEvents: [
        {
          event: 'api-session/added',
          args: [
            {
              sessionId: 's-live',
              updatedAt: Date.now(),
              running: false,
              blank: false,
              projections: { values: { title: 'Arrived over the stream' } },
            },
          ],
        },
      ],
    }),
  )
  await waitForLiveShell(page)
  // The row can only come from the mux: session/list never returned it.
  expect(await textOf(page, `${sessionRow('s-live')} .session-title`)).toBe('Arrived over the stream')
  await page.close()
})

it('removes a row when the host forwards a removal', async () => {
  const page = await harness.open(
    oneHost({
      muxHosts: ['dev-1'],
      muxEvents: [{ event: 'api-session/removed', args: ['s-idle'] }],
    }),
  )
  await waitForLiveShell(page)
  await page.locator(sessionRow('s-idle')).waitFor({ state: 'detached' })
  expect(await page.locator(RUNNING_ROW).count()).toBe(1)
  await page.close()
})

it('reports a host online once its stream is ready, and unreachable when it drops', async () => {
  const ready = await harness.open(oneHost({ muxHosts: ['dev-1'] }))
  await waitForLiveShell(ready)
  expect(await textOf(ready, '.connection-trigger')).toContain('Online')
  await ready.close()

  const dropped = await harness.open(oneHost({ muxHosts: ['dev-1'], muxClose: ['dev-1'] }))
  await waitForLiveShell(dropped)
  expect(await textOf(dropped, '.connection-trigger')).toContain('Unreachable')
  await dropped.close()
})

it('turns a running row idle when the host forwards its status', async () => {
  const page = await harness.open(
    oneHost({
      muxHosts: ['dev-1'],
      muxEvents: [{ event: 'api-session/status', args: ['s-running', false] }],
    }),
  )
  await waitForLiveShell(page)
  // Stop is offered only while a session runs, so its absence is the proof.
  await page.locator(`${RUNNING_ROW} ${action('row-stop')}`).waitFor({ state: 'detached' })
  expect(await textOf(page, `${RUNNING_ROW} .visually-hidden`)).toBe('Idle')
  await page.close()
})

it('keeps keyboard focus on a row when the roster rebuilds beneath it', async () => {
  const page = await harness.open(oneHost({ muxHosts: ['dev-1'] }))
  await waitForLiveShell(page)
  await page.locator(`${sessionRow('s-idle')} .session-open`).focus()
  // The event arrives after focus lands, so the rebuild it causes is the thing
  // under test rather than something that already happened.
  await harness.forward(page, 'api-session/added', [
    {
      sessionId: 's-live',
      updatedAt: Date.now(),
      running: false,
      blank: false,
      projections: { values: { title: 'Arrived over the stream' } },
    },
  ])
  await page.locator(sessionRow('s-live')).waitFor({ state: 'attached' })
  expect(await page.evaluate(() => document.activeElement?.textContent?.trim() ?? null)).toContain(
    'Write the release notes',
  )
  // The roving stop moved with the row, so the next arrow key continues from
  // here. The row it has to land on is read from the roster's own order rather
  // than restated, and the assertion names it: a rebuild that dropped focus on
  // the floor would leave nothing focused.
  const order = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-deeptail-session]')].map(
      (row) => row.dataset['deeptailSession'] ?? '',
    ),
  )
  expect(order).toContain('s-idle')
  expect(order.length).toBeGreaterThan(1)
  const follows = order[(order.indexOf('s-idle') + 1) % order.length] ?? ''
  expect(follows).not.toBe('')
  await page.keyboard.press('ArrowDown')
  expect(
    await page.evaluate(
      () => document.activeElement?.closest<HTMLElement>('[data-deeptail-session]')?.dataset['deeptailSession'] ?? null,
    ),
  ).toBe(follows)
  await page.close()
})
