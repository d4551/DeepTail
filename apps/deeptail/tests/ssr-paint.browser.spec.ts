/**
 * The shipped document, as the webview loads it.
 *
 * The unit suite drives the painter. This suite reads the bytes the build
 * wrote and the tree a real engine makes of them, so a first paint that
 * existed only as a string a unit test assembled cannot answer here.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { oneHost } from './fixtures.ts'
import { type Harness, startHarness } from './harness.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('ships one main landmark and the named shell in the built page', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8')
  expect(html.includes('<main')).toBe(true)
  expect(html.includes('data-deeptail-shell')).toBe(true)
  expect(html.includes('<div id="root"></div>')).toBe(false)
  expect([...html.matchAll(/<script\b/gu)]).toHaveLength(1)
})

it('adopts that chrome and fires the drawer toggle', async () => {
  const page = await harness.open(oneHost(), { mobile: true })
  await page.waitForSelector('[data-deeptail-shell]')
  expect(await page.locator('main').count()).toBe(1)
  const toggle = page.locator('.drawer-toggle')
  await toggle.click()
  expect(await toggle.getAttribute('aria-expanded')).toBe('true')
  await page.close()
})
