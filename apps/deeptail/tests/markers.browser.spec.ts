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

import { type AnswerTable, type Harness, startHarness } from './harness.ts'
import { openShell } from './surfaces.ts'

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
      (node) => node.dataset.deeptailAction ?? '',
    ),
  )
}

/** Open the picker with nothing paired, which is where the tailnet is offered. */
async function openPicker(extra: Partial<AnswerTable> = {}): Promise<Page> {
  const page = await harness.open({ hosts: [], ...extra })
  await page.waitForSelector('[data-deeptail-picker]')
  return page
}

/**
 * The boot notice, which is where the application falls back when it cannot
 * read the registry at all.
 * @returns the page, showing the notice.
 */
async function bootNotice(): Promise<Page> {
  const page = await harness.open({
    hosts: [],
    paired: { id: 'dev-1', label: 'Workstation', origin: 'https://harness.local:3080' },
    listError: 'the registry is unreadable',
    listErrorOn: [3, 5, 7],
  })
  await pairUntilNotice(page, 4)
  await page.locator('[data-deeptail-state="boot-error"]').waitFor({ state: 'visible' })
  return page
}

/**
 * Pair through the picker until the boot notice appears, or the rounds run out.
 *
 * Written as one round calling the next rather than as a loop: each round can
 * only begin once the one before it has been answered, and the application's
 * own retry count is what decides how many there are.
 * @param page - the page showing the picker.
 * @param roundsLeft - how many more times to pair before giving up.
 */
async function pairUntilNotice(page: Page, roundsLeft: number): Promise<void> {
  if (roundsLeft <= 0) return
  if ((await page.locator('[data-deeptail-state="boot-error"]').count()) > 0) return
  await page.waitForSelector('[data-deeptail-picker]')
  await page.getByRole('button', { name: 'Pair a host' }).click()
  await page.locator('[data-deeptail-field="link"]').waitFor({ state: 'visible' })
  await page.locator('[data-deeptail-field="link"]').fill('https://harness.local:3080/pair#token')
  await page.locator('[data-deeptail-action="pair-submit"]').click()
  await page.waitForTimeout(100)
  await pairUntilNotice(page, roundsLeft - 1)
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
  await gather(await bootNotice())
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
  await page.locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]').waitFor({ state: 'visible' })
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'visible' })
  await gather(page)
  await page.close()

  // compose-sheet.
  page = await openShell(harness)
  const row = page.locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]')
  await row.waitFor({ state: 'visible' })
  await row.hover()
  await row.locator('[data-deeptail-action="row-message"]').click()
  await page.locator('[data-deeptail-dialog]').waitFor({ state: 'visible' })
  await gather(page)
  await page.close()

  // new-session.
  page = await openShell(harness)
  await page.locator('[data-deeptail-action="new-session"]').click()
  await page.locator('[data-deeptail-dialog]').waitFor({ state: 'visible' })
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
  let page = await openPicker()
  await gather(page)
  await page.getByRole('button', { name: 'Pair a host' }).click()
  await page.locator('[data-deeptail-field="link"]').waitFor({ state: 'visible' })
  await gather(page)
  await page.close()

  // tailnet, in both of its states: the connect form and the machine list.
  page = await openPicker({ tailnetConnected: false, tailnetDevices: [] })
  await page.locator('[data-deeptail-action="tailnet"]').click()
  await page.locator('[data-deeptail-view="tailnet-connect"]').waitFor({ state: 'visible' })
  await gather(page)
  await page.close()

  page = await openPicker({ tailnetConnected: true, tailnetDevices: [] })
  await page.locator('[data-deeptail-action="tailnet"]').click()
  await gather(page)
  await page.close()

  await gather(await bootNotice())

  // return: the bar the shell appends beside a booted client.
  page = await openShell(harness)
  await page.locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]').waitFor({ state: 'visible' })
  await page.locator('[data-deeptail-action="row-open"]').first().click()
  await page.locator('[data-deeptail-return]').waitFor({ state: 'attached' })
  await gather(page)
  await page.close()
}

it('draws every marker the registry declares, on the surface it places it', async () => {
  const found = await everyMarkerDrawn()
  const declared = ACTION_LIST.map((action) => action.marker).toSorted()
  const missing = declared.filter((marker) => !found.has(marker))
  expect(missing).toEqual([])
}, 180_000)

it('draws no marker the registry does not declare', async () => {
  const found = await everyMarkerDrawn()
  const declared = new Set(ACTION_LIST.map((action) => action.marker))
  expect(
    [...found].filter((marker) => !declared.has(marker as (typeof ACTION_LIST)[number]['marker'])).toSorted(),
  ).toEqual([])
}, 180_000)
