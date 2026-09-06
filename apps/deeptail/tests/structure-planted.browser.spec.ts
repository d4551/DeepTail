/**
 * Planted defects the structure checks must report by name, and then drop.
 *
 * A check that stays quiet on a clean page is indistinguishable from a check
 * that cannot fire. Each rule below is given something to find, then the
 * probe is removed and the page is clean again.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { type Harness, startHarness } from './harness.ts'
import { defects } from './structure-page.ts'
import { openShell } from './surfaces.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

/** Drop the probe element a previous evaluation planted. */
const DROP = (probe: string): string => `(() => {
  document.querySelector('[data-deeptail-probe="${probe}"]')?.remove()
  return document.querySelector('[data-deeptail-probe="${probe}"]') === null
})()`

it('reports nested interactive controls', async () => {
  const page = await openShell(harness)
  await page.evaluate(() => {
    const link = document.createElement('a')
    link.href = '#probe'
    link.dataset.deeptailProbe = 'nested'
    const inner = document.createElement('button')
    inner.textContent = 'inner'
    link.append(inner)
    document.querySelector('[data-deeptail-shell]')?.append(link)
  })
  const found = await defects(page)
  expect(found).toContain('nested-interactive')
  expect(await page.evaluate<boolean>(DROP('nested'))).toBe(true)
  expect(await defects(page)).toBe('')
  await page.close()
})

it('reports a skipped heading level', async () => {
  const page = await openShell(harness)
  await page.evaluate(() => {
    const heading = document.createElement('h5')
    heading.textContent = 'skipped'
    heading.dataset.deeptailProbe = 'heading'
    document.querySelector('[data-deeptail-shell] main')?.append(heading)
  })
  const found = await defects(page)
  expect(found).toContain('heading-skip')
  expect(await page.evaluate<boolean>(DROP('heading'))).toBe(true)
  expect(await defects(page)).toBe('')
  await page.close()
})

it('reports a group of controls under no name', async () => {
  const page = await openShell(harness)
  await page.evaluate(() => {
    const group = document.createElement('fieldset')
    group.dataset.deeptailProbe = 'group'
    const input = document.createElement('input')
    input.type = 'radio'
    input.name = 'probe'
    group.append(input)
    document.querySelector('[data-deeptail-shell]')?.append(group)
  })
  const found = await defects(page)
  expect(found).toContain('unnamed-group')
  expect(await page.evaluate<boolean>(DROP('group'))).toBe(true)
  expect(await defects(page)).toBe('')
  await page.close()
})

it('reports physical text alignment', async () => {
  const page = await openShell(harness)
  await page.addStyleTag({ content: '[data-deeptail-shell] .main-title { text-align: left; }' })
  const found = await defects(page)
  expect(found).toContain('alignment')
  await page.close()
})

it('reports a nested grid', async () => {
  const page = await openShell(harness)
  await page.evaluate(() => {
    const inner = document.createElement('div')
    inner.dataset.deeptailProbe = 'grid'
    inner.className = 'main-body'
    document.querySelector('[data-deeptail-shell]')?.append(inner)
  })
  await page.addStyleTag({ content: '[data-deeptail-probe="grid"] { display: grid; }' })
  const found = await defects(page)
  expect(found).toContain('nested-grid')
  expect(await page.evaluate<boolean>(DROP('grid'))).toBe(true)
  expect(await defects(page)).toBe('')
  await page.close()
})

it('reports a layout table with no header', async () => {
  const page = await openShell(harness)
  await page.evaluate(() => {
    const table = document.createElement('table')
    table.dataset.deeptailProbe = 'table'
    const row = table.insertRow()
    row.insertCell().textContent = 'layout'
    document.querySelector('[data-deeptail-shell]')?.append(table)
  })
  const found = await defects(page)
  expect(found).toContain('layout-table')
  expect(await page.evaluate<boolean>(DROP('table'))).toBe(true)
  expect(await defects(page)).toBe('')
  await page.close()
})

it('reports a second shell, and a shell nested in a shell', async () => {
  const page = await openShell(harness)
  await page.evaluate(() => {
    const extra = document.createElement('div')
    extra.dataset.deeptailShell = ''
    extra.dataset.deeptailProbe = 'shell'
    document.querySelector('[data-deeptail-shell]')?.append(extra)
  })
  const found = await defects(page)
  expect(found).toContain('nested-shell')
  expect(found).toContain('split-shell')
  expect(await page.evaluate<boolean>(DROP('shell'))).toBe(true)
  expect(await defects(page)).toBe('')
  await page.close()
})

it('reports an inline script inside a product surface', async () => {
  const page = await openShell(harness)
  await page.evaluate(() => {
    const script = document.createElement('script')
    script.dataset.deeptailProbe = 'script'
    script.textContent = 'void 0'
    document.querySelector('[data-deeptail-shell]')?.append(script)
  })
  const found = await defects(page)
  expect(found).toContain('inline-script')
  expect(await page.evaluate<boolean>(DROP('script'))).toBe(true)
  expect(await defects(page)).toBe('')
  await page.close()
})
