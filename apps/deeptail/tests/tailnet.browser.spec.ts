/**
 * Choosing a harness host from the tailnet, end to end through the real bundle.
 * Assertions are on rendered text, roles, and native commands actually invoked.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import type { Page } from 'playwright'
import { type AnswerTable, type Harness, startHarness, textOf } from './harness.ts'
import { defects, VIEWPORTS } from './structure-page.ts'
import { AUDIT_VIEWS, describeViolations, realizeView } from './surfaces.ts'
import { pointerFlags } from './viewports.ts'

let harness: Harness

/**
 * Open the picker with nothing paired, which is where the tailnet is offered.
 * @param extra - answer-table overrides for the case.
 * @param view - viewport and palette; `true` is the phone touch context.
 */
async function openPicker(
  extra: Partial<AnswerTable>,
  view: boolean | { mobile?: boolean; tablet?: boolean; dark?: boolean; width?: number; height?: number } = false,
): Promise<Page> {
  const options = view === true ? { mobile: true } : view === false ? {} : view
  const page = await harness.open({ hosts: [], ...extra }, options)
  if (typeof view === 'object' && view.width !== undefined && view.height !== undefined) {
    await realizeView(page, { width: view.width, height: view.height })
  }
  await page.waitForSelector('[data-deeptail-picker]')
  return page
}

/** Open the connect form: the tailnet with no credential stored. */
async function connectForm(
  view: boolean | { mobile?: boolean; tablet?: boolean; dark?: boolean } = false,
): Promise<Page> {
  const page = await openPicker({ tailnetConnected: false, tailnetDevices: DEVICES }, view)
  await page.locator('[data-deeptail-action="tailnet"]').click()
  await page.locator('[data-deeptail-view="tailnet-connect"]').waitFor({ state: 'visible' })
  return page
}

/** Open the machine list: the tailnet with a credential already stored. */
async function machineList(
  view: boolean | { mobile?: boolean; tablet?: boolean; dark?: boolean } = false,
): Promise<Page> {
  const page = await openPicker({ tailnetConnected: true, tailnetDevices: DEVICES }, view)
  await page.locator('[data-deeptail-action="tailnet"]').click()
  await page.locator('[data-deeptail-tailnet-device="ts-1"]').waitFor({ state: 'visible' })
  return page
}

/** Open the pair form: a machine chosen from the stored tailnet. */
async function pairForm(view: boolean | { mobile?: boolean; tablet?: boolean; dark?: boolean } = false): Promise<Page> {
  const page = await machineList(view)
  await page.locator('[data-deeptail-tailnet-device="ts-1"]').click()
  await page.locator('[data-deeptail-action="pair-submit"]').waitFor({ state: 'visible' })
  return page
}

/** Every Tauri command the page has invoked, in order. */
function invokedCommands(page: Page): Promise<readonly string[]> {
  return page.evaluate(() => window.deeptailInvokedCommands ?? [])
}

/** Two machines: one pairable, one already paired under a known origin. */
const DEVICES = [
  {
    id: 'ts-1',
    label: 'workstation',
    origin: 'http://workstation.tail1234.ts.net:3080',
    os: 'linux',
    lastSeen: '2026-09-02T05:00:00Z',
    tags: ['tag:harness'],
    authorized: true,
    paired: false,
  },
  {
    id: 'ts-2',
    label: 'lab',
    origin: 'http://lab.tail1234.ts.net:3080',
    os: 'macOS',
    lastSeen: '2026-09-02T04:00:00Z',
    tags: [],
    authorized: false,
    paired: false,
  },
]

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('asks for a credential when none is stored, and never lists before it has one', async () => {
  const page = await openPicker({ tailnetConnected: false, tailnetDevices: DEVICES })
  await page.locator('[data-deeptail-action="tailnet"]').click()
  await page.locator('[data-deeptail-view="tailnet-connect"]').waitFor({ state: 'visible' })
  // Both credential kinds are offered, and the API key is the one the form opens on.
  expect(await page.locator('[data-deeptail-field="kind-apiKey"]').isChecked()).toBe(true)
  expect(await page.locator('[data-deeptail-field="api-key"]').count()).toBe(1)
  await harness.shoot(page, 'tailnet-connect')
  const invoked = await invokedCommands(page)
  expect(invoked).toContain('tailscale_connected')
  expect(invoked).not.toContain('tailscale_devices')
  await page.close()
})

it('collects an OAuth client when that kind is chosen', async () => {
  const page = await openPicker({ tailnetConnected: false })
  await page.locator('[data-deeptail-action="tailnet"]').click()
  await page.locator('[data-deeptail-field="kind-oauthClient"]').check()
  expect(await page.locator('[data-deeptail-field="client-id"]').count()).toBe(1)
  expect(await page.locator('[data-deeptail-field="client-secret"]').count()).toBe(1)
  expect(await page.locator('[data-deeptail-field="api-key"]').count()).toBe(0)
  await page.close()
})

it('refuses an empty credential without asking Tailscale', async () => {
  const page = await openPicker({ tailnetConnected: false })
  await page.locator('[data-deeptail-action="tailnet"]').click()
  await page.locator('[data-deeptail-action="tailnet-connect"]').click()
  expect(await textOf(page, '[data-deeptail-state="tailnet-error"]')).toContain('Fill in every field')
  const invoked = await invokedCommands(page)
  expect(invoked).not.toContain('tailscale_connect')
  await page.close()
})

it('lists the tailnet once a credential is accepted', async () => {
  const page = await openPicker({ tailnetConnected: false, tailnetDevices: DEVICES })
  await page.locator('[data-deeptail-action="tailnet"]').click()
  await page.locator('[data-deeptail-field="api-key"]').fill('tskey-api-example')
  await page.locator('[data-deeptail-action="tailnet-connect"]').click()
  await page.locator('[data-deeptail-tailnet-device="ts-1"]').waitFor({ state: 'visible' })
  expect(await textOf(page, '[data-deeptail-tailnet-device="ts-1"]')).toContain('workstation')
  // An unapproved machine is listed so its absence does not read as a missing
  // machine, and disabled because pairing it cannot succeed.
  expect(await page.locator('[data-deeptail-tailnet-device="ts-2"]').isDisabled()).toBe(true)
  expect(await textOf(page, '[data-deeptail-tailnet-device="ts-2"]')).toContain('approve')
  await harness.shoot(page, 'tailnet-machines')
  await page.close()
})

it('carries the refusal from Tailscale rather than an empty tailnet', async () => {
  const page = await openPicker({
    tailnetConnected: false,
    tailnetError: 'Tailscale rejected the credential (HTTP 401)',
  })
  await page.locator('[data-deeptail-action="tailnet"]').click()
  await page.locator('[data-deeptail-field="api-key"]').fill('tskey-api-stale')
  await page.locator('[data-deeptail-action="tailnet-connect"]').click()
  const strip = page.locator('[data-deeptail-state="tailnet-error"]')
  await strip.waitFor({ state: 'visible' })
  expect(await strip.textContent()).toContain('HTTP 401')
  await page.close()
})

it('goes straight to the machines when a credential is already stored', async () => {
  const page = await openPicker({ tailnetConnected: true, tailnetDevices: DEVICES })
  await page.locator('[data-deeptail-action="tailnet"]').click()
  await page.locator('[data-deeptail-tailnet-device="ts-1"]').waitFor({ state: 'visible' })
  const invoked = await invokedCommands(page)
  expect(invoked).toContain('tailscale_devices')
  expect(invoked).not.toContain('tailscale_connect')
  await page.close()
})

it('asks for the token, not a URL, for a machine chosen from the tailnet', async () => {
  const page = await openPicker({ tailnetConnected: true, tailnetDevices: DEVICES })
  await page.locator('[data-deeptail-action="tailnet"]').click()
  await page.locator('[data-deeptail-tailnet-device="ts-1"]').click()
  await page.locator('[data-deeptail-action="pair-submit"]').waitFor({ state: 'visible' })
  // The machine is already chosen, so the origin is not offered as a field.
  const token = page.locator('[data-deeptail-field="link"]')
  expect(await token.getAttribute('type')).toBe('text')
  expect(await token.inputValue()).toBe('')
  // Its own hostname is the name it will be filed under.
  expect(await page.locator('[data-deeptail-field="name"]').inputValue()).toBe('workstation')
  await page.close()
})

it('refuses an empty token without pairing', async () => {
  const page = await openPicker({ tailnetConnected: true, tailnetDevices: DEVICES })
  await page.locator('[data-deeptail-action="tailnet"]').click()
  await page.locator('[data-deeptail-tailnet-device="ts-1"]').click()
  await page.locator('[data-deeptail-action="pair-submit"]').click()
  expect(await textOf(page, '[data-deeptail-state="pair-error"]')).toContain('token')
  const invoked = await invokedCommands(page)
  expect(invoked).not.toContain('pair_host')
  await page.close()
})

it('pairs a tailnet machine with the token composed onto its own origin', async () => {
  const page = await openPicker({
    tailnetConnected: true,
    tailnetDevices: DEVICES,
    paired: { id: 'ts-paired', label: 'workstation', origin: 'http://workstation.tail1234.ts.net:3080' },
  })
  await page.locator('[data-deeptail-action="tailnet"]').click()
  await page.locator('[data-deeptail-tailnet-device="ts-1"]').click()
  await page.locator('[data-deeptail-field="link"]').fill('launch-token-value')
  await page.locator('[data-deeptail-action="pair-submit"]').click()
  const invoked = await invokedCommands(page)
  expect(invoked).toContain('pair_host')
  await page.close()
})

it('drops the credential when the tailnet is disconnected', async () => {
  const page = await openPicker({ tailnetConnected: true, tailnetDevices: DEVICES })
  await page.locator('[data-deeptail-action="tailnet"]').click()
  await page.locator('[data-deeptail-action="tailnet-forget"]').click()
  await page.locator('[data-deeptail-state="empty"]').waitFor({ state: 'visible' })
  const invoked = await invokedCommands(page)
  expect(invoked).toContain('tailscale_forget')
  await page.close()
})

it('says so plainly when the tailnet has no pairable machine', async () => {
  const page = await openPicker({ tailnetConnected: true, tailnetDevices: [] })
  await page.locator('[data-deeptail-action="tailnet"]').click()
  const status = page.locator('.status[role="status"]')
  await status.waitFor({ state: 'visible' })
  expect(await status.textContent()).toContain('No pairable machines')
  await page.close()
})

it('has no WCAG violations on every tailnet screen at mobile, tablet and desktop, in both palettes', async () => {
  // The screens the picker gained were in neither the accessibility suite nor
  // the structural one, so two surfaces shipped without the coverage every
  // other surface has. Tablet must be opened as a touch context, not a resize.
  // The pair form is a third view: choosing a machine replaces the list.
  const audits = await Promise.all(
    [connectForm, machineList, pairForm].flatMap((open) =>
      AUDIT_VIEWS.map(async (view) => {
        const page = await open(view)
        const violations = await harness.audit(page)
        await page.close()
        return violations
      }),
    ),
  )
  const found = audits.flat()
  expect(found, describeViolations(found)).toEqual([])
}, 180_000)

it('has no structural defects on every tailnet screen, at every width', async () => {
  const checked = await Promise.all(
    [connectForm, machineList, pairForm].flatMap((open) =>
      VIEWPORTS.map(async (viewport) => {
        const page = await open(pointerFlags(viewport))
        await realizeView(page, viewport)
        const found = await defects(page, viewport.coarse)
        await page.close()
        return found === '' ? '' : `${viewport.label}: ${found}`
      }),
    ),
  )
  expect(checked.filter((line) => line !== '')).toEqual([])
})

it('clears the platform touch minimum on every tailnet screen, on a phone and a tablet', async () => {
  // The 44px floor is what a finger needs, and it is applied where a finger is:
  // `pointer: coarse` only holds once the context emulates a touch device, so a
  // desktop page measured against it would be testing a pairing that does not
  // exist. Tablet is the other coarse pointer this product ships to.
  const checked = await Promise.all(
    [connectForm, machineList, pairForm].flatMap((open) =>
      VIEWPORTS.filter((viewport) => viewport.coarse).map(async (viewport) => {
        const page = await open(pointerFlags(viewport))
        await realizeView(page, viewport)
        const found = await defects(page, true)
        await page.close()
        return found
      }),
    ),
  )
  expect(checked.filter((line) => line !== '')).toEqual([])
})

it("sends the token the viewer typed, composed onto the machine's own origin", async () => {
  // Asserting that pair_host was called says nothing about what was passed to
  // it: the composition could substitute any token and the case would pass.
  const page = await openPicker({ tailnetConnected: true, tailnetDevices: DEVICES })
  await page.locator('[data-deeptail-action="tailnet"]').click()
  await page.locator('[data-deeptail-tailnet-device="ts-1"]').click()
  await page.locator('[data-deeptail-field="link"]').fill('launch-token-value')
  await page.locator('[data-deeptail-action="pair-submit"]').click()
  const paired = await page.evaluate(() => window.deeptailPairedLinks ?? [])
  // The whole link, written out. Building the expectation by calling the
  // function under test cancels itself: composing against any other origin
  // moves both sides together, so the case passes while a device token goes to
  // a host the viewer never chose.
  expect(paired).toEqual(['http://workstation.tail1234.ts.net:3080/?token=launch-token-value'])
  await page.close()
})
