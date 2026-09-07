/**
 * WCAG 2.2 AA over the error surfaces the matrix in a11y.browser.spec.ts
 * does not open: spawn, shell-boot, pair, and tailnet-connect refusals.
 */

import { afterAll, beforeAll, it } from 'bun:test'
import { oneHost } from './fixtures.ts'
import { type Harness, startHarness } from './harness.ts'
import { expectNoViolationsAtEachWidth, openShellWithDrawer } from './surfaces.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('has no WCAG violations on a spawn refusal at every designed width, in both palettes', async () => {
  await expectNoViolationsAtEachWidth(harness, async (view) => {
    const page = await openShellWithDrawer(
      harness,
      oneHost({
        remoteErrors: { 'session/create': 'no such preset' },
        remoteErrorCodes: { 'session/create': 'agent-preset-not-found' },
        remoteErrorDetails: { 'session/create': { available: ['standard', 'ptc'] } },
      }),
      view,
    )
    await page.locator('[data-deeptail-action="new-session"]').click()
    await page.locator('[data-deeptail-dialog]').waitFor({ state: 'visible' })
    await page.locator('[data-deeptail-field="preset"]').fill('nope')
    await page.locator('[data-deeptail-action="spawn-create"]').click()
    await page.locator('[data-deeptail-state="spawn-error"]').waitFor({ state: 'visible' })
    return page
  })
}, 180_000)

it('has no WCAG violations on a shell-error at every designed width, in both palettes', async () => {
  await expectNoViolationsAtEachWidth(harness, async (view) => {
    const page = await openShellWithDrawer(harness, oneHost({ bootError: 'host refused the boot table' }), view)
    await page.locator('[data-deeptail-session="s-running"] .session-open').click()
    await page.locator('[data-deeptail-state="shell-error"]').waitFor({ state: 'visible' })
    return page
  })
}, 180_000)

it('has no WCAG violations on a pairing refusal at every designed width, in both palettes', async () => {
  await expectNoViolationsAtEachWidth(harness, async (view) => {
    const page = await harness.open({ hosts: [] }, view)
    await page.waitForSelector('[data-deeptail-picker]')
    await page.getByRole('button', { name: 'Pair a host' }).click()
    await page.locator('[data-deeptail-field="link"]').fill('not a link')
    await page.locator('[data-deeptail-action="pair-submit"]').click()
    await page.locator('[data-deeptail-state="pair-error"]').waitFor({ state: 'visible' })
    return page
  })
}, 180_000)

it('has no WCAG violations on a tailnet connect refusal at every designed width, in both palettes', async () => {
  await expectNoViolationsAtEachWidth(harness, async (view) => {
    const page = await harness.open({ hosts: [], tailnetConnected: false }, view)
    await page.waitForSelector('[data-deeptail-picker]')
    await page.locator('[data-deeptail-action="tailnet"]').click()
    await page.locator('[data-deeptail-action="tailnet-connect"]').click()
    await page.locator('[data-deeptail-state="tailnet-error"]').waitFor({ state: 'visible' })
    return page
  })
}, 180_000)
