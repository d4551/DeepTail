/**
 * The vocabulary every browser suite drives the page through: one spelling per
 * control, and one named step per thing a case does to one.
 *
 * Without it the same Playwright line lands in two or three suites — the same
 * selector, the same wait, the same two-field refusal sequence — so a renamed
 * marker has to be found in each of them, and a screen ends up reached one way
 * in one suite and another way in the next. Arrangements that open or audit a
 * whole surface live beside this in `surfaces.ts`; this module is the layer
 * under them.
 *
 * @module
 */

import type { Page } from 'playwright'
import type { Harness } from './harness.ts'
import type { AnswerTable } from './tauri-ipc.ts'

/** How a case asks for the page it wants: viewport, palette, direction, locale. */
export type OpenOptions = Parameters<Harness['open']>[1]

/**
 * The registry overrides a picker case states.
 *
 * The picker is what the product shows while nothing is paired, so the hosts it
 * boots over are stated here rather than by each case: no picker case can boot
 * over a paired fleet, which is the one substitution that would move it onto
 * the shell without the case noticing.
 */
export type PickerFixture = Omit<Partial<AnswerTable>, 'hosts' | 'remote'>

/** The picker screen, shown while no host is paired. */
const PICKER = '[data-deeptail-picker]'

/** The sheet a modal renders into, present only while one is open. */
export const SHEET = '[data-deeptail-dialog]'

/** The compose sheet's draft field. */
export const COMPOSE_FIELD = '[data-deeptail-field="message"]'

/** The picker's own call to action, which opens the pairing form. */
export const PAIR_BUTTON = 'button.button-primary'

/** The screen the tailnet opens on while it holds no credential. */
const TAILNET_CONNECT = '[data-deeptail-view="tailnet-connect"]'

/**
 * The selector for one machine row in the tailnet's own list.
 * @param id - the machine's id, or nothing for every row the list seats.
 * @returns the selector a case can wait on, read or press.
 */
export function tailnetDevice(id?: string): string {
  return id === undefined ? '[data-deeptail-tailnet-device]' : `[data-deeptail-tailnet-device="${id}"]`
}

/**
 * The selector for one session's row.
 *
 * A roster seats one row per session, and a case that reads a row's own parts
 * names the session it means here rather than spelling the attribute out — the
 * same way it names an action, a state or a field.
 * @param id - the session's id, or nothing for every row a roster seats.
 * @returns the selector a case can wait on, read or press.
 */
export function sessionRow(id?: string): string {
  return id === undefined ? '[data-deeptail-session]' : `[data-deeptail-session="${id}"]`
}

/**
 * The selector for one named control action.
 * @param name - the action as the registry declares it.
 * @returns the selector a case can wait on or press.
 */
export function action(name: string): string {
  return `[data-deeptail-action="${name}"]`
}

/**
 * The selector for one named state.
 * @param name - the state as the surface draws it.
 * @returns the selector a case can wait on.
 */
export function state(name: string): string {
  return `[data-deeptail-state="${name}"]`
}

/**
 * The selector for one named form field.
 * @param name - the field as the form declares it.
 * @returns the selector a case can type into.
 */
export function field(name: string): string {
  return `[data-deeptail-field="${name}"]`
}

/**
 * How many live shell mounts the page is carrying.
 *
 * A boot that half-applied its table, or a client that failed to open, can
 * leave the control plane mounted twice — and a second mount is invisible to
 * every read except a count, so the count is what the suites assert on.
 * @param page - the page under test.
 * @returns the number of shell mounts.
 */
export function shellMounts(page: Page): Promise<number> {
  return page.locator('[data-deeptail-shell]').count()
}

/**
 * Press one named action.
 * @param page - the page drawing the control.
 * @param name - the action to press.
 */
export async function clickAction(page: Page, name: string): Promise<void> {
  await page.locator(action(name)).click()
}

/**
 * Type into one named field, replacing whatever is in it.
 * @param page - the page drawing the field.
 * @param name - the field to type into.
 * @param value - what to type.
 */
export async function fillField(page: Page, name: string, value: string): Promise<void> {
  await page.locator(field(name)).fill(value)
}

/**
 * Wait until one named state is on the page, where a reader could see it.
 * @param page - the page drawing the state.
 * @param name - the state to wait for.
 */
export async function waitForState(page: Page, name: string): Promise<void> {
  await page.locator(state(name)).waitFor({ state: 'visible' })
}

/**
 * Wait until one named action is on the page, where a reader could press it.
 * @param page - the page drawing the control.
 * @param name - the action to wait for.
 */
export async function waitForAction(page: Page, name: string): Promise<void> {
  await page.locator(action(name)).waitFor({ state: 'visible' })
}

/**
 * Wait until the sheet a modal renders into is showing.
 * @param page - the page showing the sheet.
 */
export async function waitForSheet(page: Page): Promise<void> {
  await page.locator(SHEET).waitFor({ state: 'visible' })
}

/**
 * Wait until the sheet has gone.
 *
 * A sheet that closes is `detached`: the dialog is unmounted rather than
 * hidden, so a case asserting on the page behind it can rely on the surface
 * having left rather than on it being invisible.
 * @param page - the page that was showing the sheet.
 */
export async function waitForSheetGone(page: Page): Promise<void> {
  await page.locator(SHEET).waitFor({ state: 'detached' })
}

/**
 * Open the picker over a registry with no host paired.
 * @param harness - the suite's browser harness.
 * @param fixture - the registry overrides the case states.
 * @param view - the viewport and palette the case is measured under.
 * @returns the page, showing the picker.
 */
export async function openPicker(harness: Harness, fixture: PickerFixture = {}, view?: OpenOptions): Promise<Page> {
  const page = await harness.open({ hosts: [], ...fixture }, view)
  await page.locator(PICKER).waitFor({ state: 'visible' })
  return page
}

/**
 * Press the switch that opens a new session, and wait for its dialog.
 *
 * The switch is painted before JS binds it, so pressing it and moving on raced
 * the sheet it opens: the case then typed into a field that was not there yet.
 * @param page - the page showing the shell.
 */
export async function pressNewSession(page: Page): Promise<void> {
  await clickAction(page, 'new-session')
  await waitForSheet(page)
}

/**
 * Ask for another host from the connection menu's own item, which is how the
 * product reaches the picker once something is already paired.
 * @param page - the page showing the shell with its menu open.
 */
export async function choosePairHost(page: Page): Promise<void> {
  await page.getByRole('menuitem', { name: 'Pair a host' }).click()
  await page.locator(state('ready')).waitFor({ state: 'visible' })
}

/**
 * Open the pairing form on the picker the page is showing.
 * @param page - the page showing the picker.
 */
export async function openPairForm(page: Page): Promise<void> {
  await page.locator(PAIR_BUTTON).click()
  await page.locator(field('link')).waitFor({ state: 'visible' })
}

/**
 * Send the pairing form, pasting a link into it first when the case has one.
 * @param page - the page showing the form.
 * @param link - the link to paste, or nothing to send the form empty.
 */
export async function submitPairing(page: Page, link?: string): Promise<void> {
  if (link !== undefined) await fillField(page, 'link', link)
  await clickAction(page, 'pair-submit')
}

/**
 * Open the tailnet's own connect form from the picker.
 *
 * Which screen the tailnet opens depends on whether a credential is stored, so
 * there is one step per screen rather than one step taking a selector: a case
 * that reached the machine list through the connect form's name would be
 * measuring the wrong screen, and the wait is what says which one it is.
 * @param page - the page showing the picker.
 */
export async function openConnectForm(page: Page): Promise<void> {
  await clickAction(page, 'tailnet')
  await page.locator(TAILNET_CONNECT).waitFor({ state: 'visible' })
}

/**
 * Open the tailnet's own machine list from the picker.
 *
 * The list is either the machines it found or the answer it gives when there
 * are none, so the wait is for whichever of the two this tailnet settles on: a
 * case that waited for a row would hang on a tailnet with no pairable machine.
 * @param page - the page showing the picker.
 */
export async function openMachineList(page: Page): Promise<void> {
  const screen = page.locator(`${state('tailnet')}, .status[role="status"]`)
  await clickAction(page, 'tailnet')
  await screen.first().waitFor({ state: 'visible' })
}

/**
 * Ask the tailnet to accept the credential on its form.
 * @param page - the page showing the connect form.
 * @param credential - the credential to type, or nothing to send it empty.
 */
export async function connectTailnet(page: Page, credential?: string): Promise<void> {
  if (credential !== undefined) await fillField(page, 'api-key', credential)
  await clickAction(page, 'tailnet-connect')
}

/**
 * Ask for a session preset the host does not serve.
 *
 * Two suites state this refusal — the audit arranges it as a surface, and the
 * control-plane suite asserts what the strip says — so the ask is here and the
 * "no such preset" answer table lives with the fixtures.
 * @param page - the page showing the shell.
 */
export async function spawnUnknownPreset(page: Page): Promise<void> {
  await pressNewSession(page)
  await fillField(page, 'preset', 'nope')
  await clickAction(page, 'spawn-create')
}
