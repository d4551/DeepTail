/**
 * The compose sheet: where the operator lands, what a refused draft costs, and
 * where the outcome of a send is told.
 *
 * Every assertion is on rendered text, roles and the calls that reached the
 * host. The only substitution is the Tauri IPC boundary, which no browser
 * provides.
 */

import { afterAll, beforeAll, beforeEach, expect, it } from 'bun:test'
import { type Harness, startHarness } from './harness.ts'
import { openComposeSheet } from './surfaces.ts'
import { until } from './wait.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

/** The page object a harness case drives. */
type SheetPage = Awaited<ReturnType<Harness['open']>>

/**
 * The sheet the case is driving, opened over the running session's row.
 *
 * Stated once as a hook rather than in every case: seven cases want the same
 * sheet, and two of them want it over a host that refuses the send instead. The
 * refusal cases reassign this before they use it.
 */
let page: SheetPage

beforeEach(async () => {
  page = await openComposeSheet(harness)
})

/** The sheet's draft field. */
function draftField(sheet: SheetPage): ReturnType<SheetPage['locator']> {
  return sheet.locator('[data-deeptail-field="message"]')
}

/** The sheet's send control. */
function sendControl(sheet: SheetPage): ReturnType<SheetPage['locator']> {
  return sheet.locator('[data-deeptail-action="compose-send"]')
}

/** The sheet's steer control. */
function steerControl(sheet: SheetPage): ReturnType<SheetPage['locator']> {
  return sheet.locator('[data-deeptail-action="compose-steer"]')
}

/**
 * Fill the draft and send it.
 * @param sheet - the page the sheet is open on.
 * @param draft - the text to send.
 */
async function sendDraft(sheet: SheetPage, draft: string): Promise<void> {
  await draftField(sheet).fill(draft)
  await sendControl(sheet).click()
}

/** The sheet's refusal strip. */
function refusalStrip(sheet: SheetPage): ReturnType<SheetPage['locator']> {
  return sheet.locator('[data-deeptail-state="compose-error"]')
}

/**
 * Wait until the sheet has closed.
 * @param sheet - the page the sheet was open on.
 */
async function sheetClosed(sheet: SheetPage): Promise<void> {
  await sheet.locator('[data-deeptail-dialog]').waitFor({ state: 'detached' })
}

it('opens with the operator in the draft field, named by its visible label', async () => {
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
  await sendControl(page).click()
  expect(await page.locator('[data-deeptail-state="compose-error"]').textContent()).toContain('Type something to send.')
  // The refusal is about this field, so the field says so and takes focus back.
  expect(await page.locator('[data-deeptail-field="message"]').getAttribute('aria-invalid')).toBe('true')
  expect(await page.evaluate(() => document.activeElement instanceof HTMLTextAreaElement)).toBe(true)
  expect((await harness.calls(page)).filter((call) => call.endpoint === 'session/prompt')).toEqual([])
  await page.close()
})

it('sends on Enter and keeps Shift+Enter a newline', async () => {
  const field = page.locator('[data-deeptail-field="message"]')
  await field.fill('line one')
  await field.press('Shift+Enter')
  // A newline is editing, not sending: nothing may reach the host for it.
  expect((await harness.calls(page)).filter((call) => call.endpoint === 'session/prompt')).toEqual([])
  await field.press('Enter')
  await sheetClosed(page)
  const sent = (await harness.calls(page)).filter((call) => call.endpoint === 'session/prompt')
  expect(sent.length).toBe(1)
  expect(sent[0]?.args['mode']).toBe('queue')
  expect(sent[0]?.args['content']).toEqual([{ type: 'text', text: 'line one\n' }])
  await page.close()
})

it('hands the sheet back, draft intact, when a send is refused', async () => {
  page = await openComposeSheet(harness, { remoteErrors: { 'session/prompt': 'agent busy' } })
  await sendDraft(page, 'please rerun the tests')
  await refusalStrip(page).waitFor({ state: 'visible' })
  expect(await refusalStrip(page).textContent()).toContain('agent busy')
  // A failed send must not cost the operator what they typed, nor leave the
  // sheet dark: the controls are live again for the retry.
  expect(await page.locator('[data-deeptail-field="message"]').inputValue()).toBe('please rerun the tests')
  expect(await page.locator('[data-deeptail-action="compose-send"]').isDisabled()).toBe(false)
  expect(await steerControl(page).isDisabled()).toBe(false)
  expect(await page.locator('[data-deeptail-field="message"]').isDisabled()).toBe(false)
  await page.close()
})

it('holds the sheet still while a send is in flight', async () => {
  page = await openComposeSheet(harness, { remotePending: ['session/prompt'] })
  await sendDraft(page, 'hold the line')
  // The read never settles, so the held state is observable rather than a
  // frame wide: one send cannot be raced by a second.
  expect(await page.locator('[data-deeptail-field="message"]').isDisabled()).toBe(true)
  expect(await page.locator('[data-deeptail-action="compose-send"]').isDisabled()).toBe(true)
  expect(await steerControl(page).isDisabled()).toBe(true)
  expect(await page.getByRole('button', { name: 'Cancel' }).isDisabled()).toBe(true)
  expect(await page.locator('[data-deeptail-dialog] .modal-body').getAttribute('aria-busy')).toBe('true')
  await page.close()
})

it('tells a refused send through the live region once the sheet has gone', async () => {
  page = await openComposeSheet(harness, { remoteErrors: { 'session/prompt': 'agent busy' } })
  await draftField(page).fill('escape mid flight')
  // Escape closes the sheet at any time, including mid-flight. The click and
  // the key are delivered in one pass so the dismissal is ordered before the
  // refusal lands: a failure reported into a detached strip would be lost, and
  // this is the path that catches it.
  await page.evaluate(() => {
    const send = document.querySelector('[data-deeptail-action="compose-send"]')
    send?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  })
  await sheetClosed(page)
  // The refusal is delivered on the harness's own turn, which can land after
  // the dismissal this test already observed, so the announcement is waited
  // for rather than read once: a single read races the delivery and reports
  // the region as silent while the words are still in flight.
  await until(async () => {
    const spoken = await page.locator('.main > [role="status"]').textContent()
    return spoken?.includes('Send failed: agent busy') === true
  })
  await page.close()
})

it('announces a landed send through the live region', async () => {
  await sendDraft(page, 'announce the send')
  await sheetClosed(page)
  // The sheet closes before the announcement: the live region sits inside the
  // root the dialog holds inert, and a mutation made while inert is never
  // spoken. The announcement is the success case's whole outcome on screen.
  expect(await page.locator('.main > [role="status"]').textContent()).toBe('Sent to Refactor the loader.')
  expect(await page.locator('.main > [role="status"]').getAttribute('aria-live')).toBe('polite')
  await page.close()
})
