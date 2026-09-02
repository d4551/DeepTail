/**
 * Reaching every control without a pointer, and with a finger.
 *
 * Every assertion is on rendered text and roles. The only substitution is the
 * Tauri IPC boundary, which no browser provides.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { fleet, oneHost } from './fixtures.ts'
import { type Harness, startHarness } from './harness.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('moves the roving tab stop across session rows', async () => {
  const page = await harness.open(oneHost())
  await page.waitForSelector('[data-deeptail-shell]')
  // Assert on the name the row actually speaks, not on a private attribute.
  const focusedName = () => page.evaluate(() => document.activeElement?.textContent?.trim() ?? null)
  await page.locator('[data-deeptail-session="s-running"] .session-open').focus()
  expect(await focusedName()).toContain('Refactor the loader')
  await page.keyboard.press('ArrowDown')
  expect(await focusedName()).toContain('Write the release notes')
  await page.keyboard.press('Home')
  expect(await focusedName()).toContain('Refactor the loader')
  await page.close()
})

it('reaches a row action with the keyboard alone and opens the sheet with Enter', async () => {
  const page = await harness.open(oneHost())
  await page.waitForSelector('[data-deeptail-shell]')
  // No pointer is used anywhere in this case: focusing the row must be
  // enough to reveal its actions, and Tab must be able to reach them.
  await page.locator('[data-deeptail-session="s-running"] .session-open').focus()
  const send = page.getByRole('button', { name: 'Message Refactor the loader' }).first()
  await send.waitFor({ state: 'visible' })
  // The actions share the row's tab stop, so they are reached along the row
  // rather than by leaving it: a hundred sessions stay a hundred stops.
  await page.keyboard.press('ArrowRight')
  expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe(
    'Message Refactor the loader',
  )
  await page.keyboard.press('Enter')
  const dialog = page.locator('[data-deeptail-dialog]')
  await dialog.waitFor({ state: 'visible' })
  // The dialog is named by the heading it shows, so the name and the visible
  // title can never drift apart.
  expect(
    await dialog.evaluate((node) => document.getElementById(node.getAttribute('aria-labelledby') ?? '')?.textContent),
  ).toBe('Refactor the loader')
  await page.close()
})

it('gives a row action a real touch target when the pointer is coarse', async () => {
  const page = await harness.open(oneHost(), { mobile: true })
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-action="drawer"]').click()
  const box = await page.locator('[data-deeptail-action="row-message"]').first().boundingBox()
  expect(box === null ? 0 : Math.round(box.height)).toBeGreaterThanOrEqual(44)
  await page.close()
})

it('keeps the closed drawer out of the tab order', async () => {
  const page = await harness.open(oneHost(), { mobile: true })
  await page.waitForSelector('[data-deeptail-shell]')
  // A translated drawer still holds its controls unless it is made inert.
  expect(
    await page.evaluate(() => {
      const sidebar = document.querySelector<HTMLElement>('#deeptail-sidebar')
      const first = sidebar?.querySelector('button')
      first?.focus()
      return document.activeElement === first
    }),
  ).toBe(false)
  await page.close()
})

it('leaves the permanent sidebar in the tab order on the wide layout', async () => {
  const page = await harness.open(oneHost())
  await page.waitForSelector('[data-deeptail-shell]')
  // Above the drawer width the sidebar is a column, not an overlay, so nothing
  // may take it out of the tree. A layout flag stuck on would make the whole
  // roster unreachable here while every narrow case still passed.
  expect(
    await page.evaluate(() => {
      const sidebar = document.querySelector<HTMLElement>('#deeptail-sidebar')
      const first = sidebar?.querySelector('button')
      first?.focus()
      return document.activeElement === first
    }),
  ).toBe(true)
  await page.close()
})

it('moves focus into the drawer it opens and back to the toggle on Escape', async () => {
  const page = await harness.open(oneHost(), { mobile: true })
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-action="drawer"]').click()
  // The sidebar precedes the toggle in the document, so revealing it without
  // moving focus would leave a keyboard user travelling backwards to reach it.
  await page.waitForFunction(() => document.activeElement?.closest('#deeptail-sidebar') !== null)
  expect(await page.evaluate(() => document.activeElement?.closest('#deeptail-sidebar') !== null)).toBe(true)
  await page.keyboard.press('Escape')
  expect(await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.deeptailAction)).toBe(
    'drawer',
  )
  await page.close()
})

it('keeps the whole roster to one stop in the page tab order, on touch too', async () => {
  const page = await harness.open(fleet(), { mobile: true })
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-action="drawer"]').click()
  await page.locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]').waitFor({ state: 'visible' })
  // The actions are permanently visible here, so without sharing the row's stop
  // every row would contribute two or three of its own.
  const stops = await page.evaluate(() => {
    const roster = document.querySelector('.roster')
    if (roster === null) return -1
    return [...roster.querySelectorAll<HTMLButtonElement>('button')].filter((node) => node.tabIndex >= 0).length
  })
  expect(stops).toBe(1)
  await page.close()
})

it('walks the row the way it is drawn when the script runs right to left', async () => {
  const page = await harness.open(oneHost(), { direction: 'rtl' })
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-session="s-running"] .session-open').focus()
  const send = page.getByRole('button', { name: 'Message Refactor the loader' }).first()
  await send.waitFor({ state: 'visible' })
  // Mirrored, the actions sit to the *left* of the row's own control, so the
  // key that reaches them is the one pointing at them. Following the markup
  // instead would walk every right-to-left reader backwards along the row.
  const box = await send.boundingBox()
  const openBox = await page.locator('[data-deeptail-session="s-running"] .session-open').boundingBox()
  expect((box?.x ?? 0) < (openBox?.x ?? 0)).toBe(true)
  await page.keyboard.press('ArrowLeft')
  expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe(
    'Message Refactor the loader',
  )
  // And the key pointing away from them goes back, rather than deeper in.
  await page.keyboard.press('ArrowRight')
  expect(await page.evaluate(() => document.activeElement?.className ?? null)).toBe('session-open')
  await page.close()
})
