/**
 * The compose sheet: where the operator lands, what a refused draft costs, and
 * where the outcome of a send is told.
 *
 * Every assertion is on rendered text, roles and the calls that reached the
 * host. The only substitution is the Tauri IPC boundary, which no browser
 * provides.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { oneHost } from './fixtures.ts'
import { type Harness, startHarness } from './harness.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

/**
 * Open the compose sheet for the running session.
 * @param harness - the suite's browser harness.
 * @param extra - answer-table overrides for the case.
 * @returns the page showing the open sheet.
 */
async function openedSheet(
  harness: Harness,
  extra: Parameters<typeof oneHost>[0] = {},
): Promise<Awaited<ReturnType<Harness['open']>>> {
  const page = await harness.open(oneHost(extra))
  await page.waitForSelector('[data-deeptail-shell]')
  // The row actions ride behind a hover on a fine pointer, so the pointer is
  // what reveals them here; the keyboard route into the sheet is the row
  // suite's subject.
  await page.locator('[data-deeptail-session="s-running"]').hover()
  await page.locator('[data-deeptail-session="s-running"] [data-deeptail-action="row-message"]').click()
  await page.locator('[data-deeptail-dialog]').waitFor({ state: 'visible' })
  return page
}

/**
 * The page's live region, which every outcome the sheet tells is written into.
 * @param page - the page showing the shell.
 * @returns the region's locator.
 */
function liveRegion(page: Awaited<ReturnType<Harness['open']>>): ReturnType<Harness['open']> extends never
  ? never
  : ReturnType<Awaited<ReturnType<Harness['open']>>['locator']> {
  return page.locator('.main > [role="status"]')
}

it('opens with the operator in the draft field, named by its visible label', async () => {
  const page = await openedSheet(harness)
  // The sheet asks for one thing, so that is where focus lands rather than on
  // the dialog frame or the first button.
  const landed = await page.evaluate(() => ({
    field: document.activeElement instanceof HTMLTextAreaElement,
    editable: document.activeElement instanceof HTMLTextAreaElement ? !document.activeElement.disabled : false,
  }))
  expect(landed).toEqual({ field: true, editable: true })
  // The label element is what names the field, so the name survives the first
  // keystroke — a placeholder is gone the moment anything is typed.
  await page.locator('[data-deeptail-field="message"]').fill('rerun the failing specs')
  expect(await page.getByLabel('Message to send').inputValue()).toBe('rerun the failing specs')
  // The failure strip is named as the field's description before it says
  // anything, so a refusal spoken into it is attributed to this field.
  expect(await page.locator('[data-deeptail-field="message"]').getAttribute('aria-describedby')).toBe(
    'deeptail-compose-error',
  )
  await page.close()
})

it('refuses an empty draft without reaching the host', async () => {
  const page = await openedSheet(harness)
  await page.locator('[data-deeptail-action="compose-send"]').click()
  expect(await page.locator('[data-deeptail-state="compose-error"]').textContent()).toContain(
    'Type something to send.',
  )
  // The refusal is about this field, so the field says so and takes focus back.
  expect(await page.locator('[data-deeptail-field="message"]').getAttribute('aria-invalid')).toBe('true')
  expect(await page.evaluate(() => document.activeElement instanceof HTMLTextAreaElement)).toBe(true)
  expect((await harness.calls(page)).filter((call) => call.endpoint === 'session/prompt')).toEqual([])
  await page.close()
})

it('sends on Enter and keeps Shift+Enter a newline', async () => {
  const page = await openedSheet(harness)
  const field = page.locator('[data-deeptail-field="message"]')
  await field.fill('line one')
  await field.press('Shift+Enter')
  // A newline is editing, not sending: nothing may reach the host for it.
  expect((await harness.calls(page)).filter((call) => call.endpoint === 'session/prompt')).toEqual([])
  await field.press('Enter')
  await page.locator('[data-deeptail-dialog]').waitFor({ state: 'detached' })
  const sent = (await harness.calls(page)).filter((call) => call.endpoint === 'session/prompt')
  expect(sent.length).toBe(1)
  expect(sent[0]?.args['mode']).toBe('queue')
  expect(sent[0]?.args['content']).toEqual([{ type: 'text', text: 'line one\n' }])
  await page.close()
})

it('hands the sheet back, draft intact, when a send is refused', async () => {
  const page = await openedSheet(harness, { remoteErrors: { 'session/prompt': 'agent busy' } })
  await page.locator('[data-deeptail-field="message"]').fill('please rerun the tests')
  await page.locator('[data-deeptail-action="compose-send"]').click()
  await page.locator('[data-deeptail-state="compose-error"]').waitFor({ state: 'visible' })
  expect(await page.locator('[data-deeptail-state="compose-error"]').textContent()).toContain('agent busy')
  // A failed send must not cost the operator what they typed, nor leave the
  // sheet dark: the controls are live again for the retry.
  expect(await page.locator('[data-deeptail-field="message"]').inputValue()).toBe('please rerun the tests')
  expect(await page.locator('[data-deeptail-action="compose-send"]').isDisabled()).toBe(false)
  expect(await page.locator('[data-deeptail-action="compose-steer"]').isDisabled()).toBe(false)
  expect(await page.locator('[data-deeptail-field="message"]').isDisabled()).toBe(false)
  await page.close()
})

it('holds the sheet still while a send is in flight', async () => {
  const page = await openedSheet(harness, { remotePending: ['session/prompt'] })
  await page.locator('[data-deeptail-field="message"]').fill('please rerun the tests')
  await page.locator('[data-deeptail-action="compose-send"]').click()
  // The read never settles, so the held state is observable rather than a
  // frame wide: one send cannot be raced by a second.
  expect(await page.locator('[data-deeptail-field="message"]').isDisabled()).toBe(true)
  expect(await page.locator('[data-deeptail-action="compose-send"]').isDisabled()).toBe(true)
  expect(await page.locator('[data-deeptail-action="compose-steer"]').isDisabled()).toBe(true)
  expect(await page.getByRole('button', { name: 'Cancel' }).isDisabled()).toBe(true)
  expect(await page.locator('[data-deeptail-dialog] .modal-body').getAttribute('aria-busy')).toBe('true')
  await page.close()
})

it('tells a refused send through the live region once the sheet has gone', async () => {
  const page = await openedSheet(harness, { remoteErrors: { 'session/prompt': 'agent busy' } })
  await page.locator('[data-deeptail-field="message"]').fill('please rerun the tests')
  // Escape closes the sheet at any time, including mid-flight. The click and
  // the key are delivered in one pass so the dismissal is ordered before the
  // refusal lands: a failure reported into a detached strip would be lost, and
  // this is the path that catches it.
  await page.evaluate(() => {
    const send = document.querySelector('[data-deeptail-action="compose-send"]')
    send?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  })
  await page.locator('[data-deeptail-dialog]').waitFor({ state: 'detached' })
  expect(await page.locator('.main > [role="status"]').textContent()).toContain('Send failed: agent busy')
  await page.close()
})

it('announces a landed send through the live region', async () => {
  const page = await openedSheet(harness)
  await page.locator('[data-deeptail-field="message"]').fill('please rerun the tests')
  await page.locator('[data-deeptail-action="compose-send"]').click()
  await page.locator('[data-deeptail-dialog]').waitFor({ state: 'detached' })
  // The sheet closes before the announcement: the live region sits inside the
  // root the dialog holds inert, and a mutation made while inert is never
  // spoken. The announcement is the success case's whole outcome on screen.
  expect(await page.locator('.main > [role="status"]').textContent()).toBe('Sent to Refactor the loader.')
  expect(await page.locator('.main > [role="status"]').getAttribute('aria-live')).toBe('polite')
  await page.close()
})
