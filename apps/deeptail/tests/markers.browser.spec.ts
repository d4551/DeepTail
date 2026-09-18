/**
 * Every control the registry declares, drawn where the registry says it is.
 *
 * `tests/actions.spec.ts` holds one direction: no page may write a marker as a
 * literal, so a control that is not in the registry cannot be drawn. The
 * `placement` each row declares says which surface should carry it.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import type { Page } from 'playwright'
import { ACTION_LIST } from '../src/actions/registry.ts'

import { type Harness, startHarness } from './harness.ts'
import { clickAction, openConnectForm, openPairForm, openPicker, pressNewSession } from './page-steps.ts'
import { openBootNotice, openRunningSession, waitForReturnBar } from './session-steps.ts'
import { openComposeSheet, openShell, openShellWithRoster, waitForRoster } from './surfaces.ts'
import { showSwitcher } from './switcher.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

/** Every `data-deeptail-action` the page is currently drawing. */
function drawn(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-deeptail-action]')].map(
      (node) => node.dataset['deeptailAction'] ?? '',
    ),
  )
}

/**
 * Every marker the product draws, gathered from each surface the registry
 * places one on.
 * @returns the markers, deduplicated.
 */
async function everyMarkerDrawn(): Promise<Set<string>> {
  const found = new Set<string>()
  const gather = async (page: Page): Promise<void> => {
    for (const marker of await drawn(page)) found.add(marker)
  }
  await gatherFromShell(gather)
  await gatherFromPicker(gather)
  await gather(await openBootNotice(harness))
  return found
}

/**
 * The surfaces the shell owns: its sidebar, its drawer, a roster row, the
 * connection menu, and the two dialogs a row and the sidebar open.
 * @param gather - collects the markers one page is drawing.
 */
async function gatherFromShell(gather: (page: Page) => Promise<void>): Promise<void> {
  // sidebar, drawer, roster-row, connection-menu.
  let page = await openShell(harness, { remoteStatuses: { 'lab-2:session/list': 401 } })
  await waitForRoster(page)
  await showSwitcher(page)
  await gather(page)
  await page.close()

  // compose-sheet.
  page = await openComposeSheet(harness)
  await gather(page)
  await page.close()

  // new-session.
  page = await openShell(harness)
  await pressNewSession(page)
  await gather(page)
  await page.close()
}

/**
 * The surfaces the picker owns: its own screen, the pairing form, and the
 * tailnet in both of its states.
 * @param gather - collects the markers one page is drawing.
 */
async function gatherFromPicker(gather: (page: Page) => Promise<void>): Promise<void> {
  // picker, picker-form.
  let page = await openPicker(harness)
  await gather(page)
  await openPairForm(page)
  await gather(page)
  await page.close()

  // tailnet, in both of its states: the connect form and the machine list.
  page = await openPicker(harness, { tailnetConnected: false, tailnetDevices: [] })
  await openConnectForm(page)
  await gather(page)
  await page.close()

  page = await openPicker(harness, { tailnetConnected: true, tailnetDevices: [] })
  await clickAction(page, 'tailnet')
  await gather(page)
  await page.close()

  await gather(await openBootNotice(harness))

  // return: the bar the shell appends beside a booted client.
  page = await openShellWithRoster(harness)
  await openRunningSession(page)
  await waitForReturnBar(page)
  await gather(page)
  await page.close()
}

it('draws every marker the registry declares, on the surface it places it', async () => {
  const found = await everyMarkerDrawn()
  const declared = ACTION_LIST.map((action) => action.marker).toSorted()
  const missing = declared.filter((marker) => !found.has(marker))
  expect(missing).toEqual([])
}, 60_000)

it('draws no marker the registry does not declare', async () => {
  const found = await everyMarkerDrawn()
  const declared = new Set<string>(ACTION_LIST.map((action) => action.marker))
  expect([...found].filter((marker) => !declared.has(marker)).toSorted()).toEqual([])
}, 60_000)
