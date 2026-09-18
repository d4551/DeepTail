/**
 * Choosing a harness host from the tailnet, end to end through the real bundle.
 * Assertions are on rendered text, roles and native commands actually invoked.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import type { Page } from 'playwright'
import { type AnswerTable, type Harness, startHarness, textOf } from './harness.ts'
import {
  clickAction,
  connectTailnet,
  field,
  type OpenOptions,
  openConnectForm,
  openMachineList,
  openPicker,
  state,
  submitPairing,
  tailnetDevice,
  waitForAction,
  waitForState,
} from './page-steps.ts'
import { defects, VIEWPORTS } from './structure-page.ts'
import { AUDIT_VIEWS, describeViolations, realizeView } from './surfaces.ts'
import { pointerFlags } from './viewports.ts'

let harness: Harness

/** One tailnet screen, opened at the view a case is measuring. */
type Screen = (view?: OpenOptions) => Promise<Page>

/**
 * Open the connect form: the tailnet with no credential stored.
 * @param view - the viewport and palette the case is measured under.
 * @param extra - answer-table overrides for the case.
 * @returns the page, showing the connect form.
 */
async function connectForm(view?: OpenOptions, extra: Partial<AnswerTable> = {}): Promise<Page> {
  const page = await openPicker(harness, { tailnetConnected: false, tailnetDevices: DEVICES, ...extra }, view)
  await openConnectForm(page)
  return page
}

/**
 * Open the machine list: the tailnet with a credential already stored.
 * @param view - the viewport and palette the case is measured under.
 * @param extra - answer-table overrides for the case.
 * @returns the page, showing the machine list.
 */
async function machineList(view?: OpenOptions, extra: Partial<AnswerTable> = {}): Promise<Page> {
  const page = await openPicker(harness, { tailnetConnected: true, tailnetDevices: DEVICES, ...extra }, view)
  await openMachineList(page)
  return page
}

/**
 * Open the pair form: a machine chosen from the stored tailnet.
 * @param view - the viewport and palette the case is measured under.
 * @returns the page, showing the pair form.
 */
async function pairForm(view?: OpenOptions): Promise<Page> {
  const page = await machineList(view)
  await page.locator(tailnetDevice('ts-1')).click()
  await waitForAction(page, 'pair-submit')
  return page
}

/** Every screen the aggregate cases below measure. */
const TAILNET_SCREENS: readonly Screen[] = [connectForm, machineList, pairForm]

/**
 * Open each screen at each view, and collect what a measurement found.
 *
 * Three cases below drive the same screens: one audits them, one compares their
 * structural rules against the picker they are painted into, and one holds
 * their controls to the touch floor. The screen × view walk is stated once, so
 * a screen added to `TAILNET_SCREENS` is measured by all three rather than by
 * whichever of them remembered it.
 * @param views - the views to open every screen at.
 * @param flags - the harness pointer flags one view opens with.
 * @param measure - what to measure on the opened page, as a report line, empty
 * when it found nothing.
 * @returns every non-empty report line.
 */
async function screensReport<View extends { readonly label: string }>(
  views: readonly View[],
  flags: (view: View) => OpenOptions,
  measure: (page: Page, view: View) => Promise<string>,
): Promise<readonly string[]> {
  const lines = await Promise.all(
    TAILNET_SCREENS.flatMap((open) =>
      views.map(async (view) => {
        const page = await open(flags(view))
        const found = await measure(page, view)
        await page.close()
        return found
      }),
    ),
  )
  return lines.filter((line) => line !== '')
}

/**
 * Every finding the structural check reports, as `rule: detail`. The keyboard
 * goes in play first: the ring rule reads the ring an element paints while it is
 * focused, and the engine paints `:focus-visible` for a keyboard reader.
 */
async function findingsOn(page: Page, coarse: boolean): Promise<readonly string[]> {
  await page.keyboard.press('Tab')
  return (await defects(page, coarse)).split('\n').filter((line) => line !== '')
}

function ruleOf(finding: string): string {
  return finding.slice(0, finding.indexOf(':'))
}

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
  const page = await connectForm()
  expect(await page.locator(field('kind-apiKey')).isChecked()).toBe(true)
  expect(await page.locator(field('api-key')).count()).toBe(1)
  await harness.shoot(page, 'tailnet-connect')
  expect(await harness.commands(page)).toContain('tailscale_connected')
  expect(await harness.commands(page)).not.toContain('tailscale_devices')
  await page.close()
})

it('collects an OAuth client when that kind is chosen', async () => {
  const page = await connectForm()
  await page.locator(field('kind-oauthClient')).check()
  expect(await page.locator(field('client-id')).count()).toBe(1)
  expect(await page.locator(field('client-secret')).count()).toBe(1)
  expect(await page.locator(field('api-key')).count()).toBe(0)
  await page.close()
})

it('refuses an empty credential without asking Tailscale', async () => {
  const page = await connectForm()
  await connectTailnet(page)
  expect(await textOf(page, state('tailnet-error'))).toContain('Fill in every field')
  expect(await harness.commands(page)).not.toContain('tailscale_connect')
  await page.close()
})

it('lists the tailnet once a credential is accepted', async () => {
  const page = await connectForm()
  await connectTailnet(page, 'tskey-api-example')
  expect(await textOf(page, tailnetDevice('ts-1'))).toContain('workstation')
  expect(await page.locator(tailnetDevice('ts-2')).isDisabled()).toBe(true)
  expect(await textOf(page, tailnetDevice('ts-2'))).toContain('approve')
  await harness.shoot(page, 'tailnet-machines')
  await page.close()
})

it('carries the refusal from Tailscale rather than an empty tailnet', async () => {
  const page = await connectForm(undefined, {
    tailnetError: 'Tailscale rejected the credential (HTTP 401)',
  })
  await connectTailnet(page, 'tskey-api-stale')
  const strip = page.locator(state('tailnet-error'))
  await strip.waitFor({ state: 'visible' })
  expect(await strip.textContent()).toContain('HTTP 401')
  await page.close()
})

it('goes straight to the machines when a credential is already stored', async () => {
  const page = await machineList()
  expect(await harness.commands(page)).toContain('tailscale_devices')
  expect(await harness.commands(page)).not.toContain('tailscale_connect')
  await page.close()
})

it('asks for the token, not a URL, for a machine chosen from the tailnet', async () => {
  const page = await pairForm()
  const token = page.locator(field('link'))
  expect(await token.getAttribute('type')).toBe('text')
  expect(await token.inputValue()).toBe('')
  expect(await page.locator(field('name')).inputValue()).toBe('workstation')
  await page.close()
})

it('refuses an empty token without pairing', async () => {
  const page = await pairForm()
  await submitPairing(page)
  expect(await textOf(page, state('pair-error'))).toContain('token')
  expect(await harness.commands(page)).not.toContain('pair_host')
  await page.close()
})

it('pairs a tailnet machine with the token composed onto its own origin', async () => {
  const page = await machineList(undefined, {
    paired: { id: 'ts-paired', label: 'workstation', origin: 'http://workstation.tail1234.ts.net:3080' },
  })
  await page.locator(tailnetDevice('ts-1')).click()
  await submitPairing(page, 'launch-token-value')
  expect(await harness.commands(page)).toContain('pair_host')
  await page.close()
})

it('drops the credential when the tailnet is disconnected', async () => {
  const page = await machineList()
  await clickAction(page, 'tailnet-forget')
  await waitForState(page, 'empty')
  expect(await harness.commands(page)).toContain('tailscale_forget')
  await page.close()
})

it('says so plainly when the tailnet has no pairable machine', async () => {
  const page = await machineList(undefined, { tailnetDevices: [] })
  const status = page.locator('.status[role="status"]')
  expect(await status.textContent()).toContain('No pairable machines')
  await page.close()
})

it('has no WCAG violations on every tailnet screen at mobile, tablet and desktop, in both palettes', async () => {
  const found = await screensReport(
    AUDIT_VIEWS,
    (view) => view,
    async (page) => describeViolations(await harness.audit(page)),
  )
  expect(found).toEqual([])
}, 60_000)

it('adds no structural rule to the picker screen it is opened from, at every width', async () => {
  // The tailnet screens are painted into the picker's own card, so the empty
  // picker it replaces is the account of what that card already reports. The
  // comparison is by rule, and the failure names the elements the added rule
  // reported, so the case says which rule these screens introduced and to what.
  const found = await screensReport(VIEWPORTS, pointerFlags, async (page, viewport) => {
    const baseline = await openPicker(harness)
    await realizeView(baseline, viewport)
    const settled = new Set((await findingsOn(baseline, viewport.coarse)).map((line) => ruleOf(line)))
    await baseline.close()
    await realizeView(page, viewport)
    const added = (await findingsOn(page, viewport.coarse)).filter((line) => !settled.has(ruleOf(line)))
    return added.length === 0 ? '' : `${viewport.label}: ${added.join('; ')}`
  })
  expect(found).toEqual([])
})

it('clears the platform touch minimum on every tailnet screen, on a phone and a tablet', async () => {
  const found = await screensReport(
    VIEWPORTS.filter((viewport) => viewport.coarse),
    pointerFlags,
    async (page, viewport) => {
      await realizeView(page, viewport)
      const under = (await defects(page, true)).split('\n').filter((line) => line.startsWith('target-size:'))
      return under.length === 0 ? '' : `${viewport.label}: ${under.join('; ')}`
    },
  )
  expect(found).toEqual([])
})

it("sends the token the viewer typed, composed onto the machine's own origin", async () => {
  // Asserting that pair_host was called says nothing about what it was called
  // with, so the whole link is written out here.
  const page = await pairForm()
  await submitPairing(page, 'launch-token-value')
  const paired = await page.evaluate(() => window.deeptailPairedLinks ?? [])
  // Building the expectation by calling the function under test cancels itself:
  // composing against any other origin moves both sides together, so the case
  // passes while a device token goes to a host the viewer never chose.
  expect(paired).toEqual(['http://workstation.tail1234.ts.net:3080/?token=launch-token-value'])
  await page.close()
})
