/**
 * Planted defects the structure checks must report by name, and then drop.
 *
 * A check that stays quiet on a clean page is indistinguishable from a check
 * that cannot fire. Each rule below is given something to find, then the
 * probe is removed and the page is clean again.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import type { Page } from 'playwright'
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
  document.querySelector('[data-deeptail-probe="${probe}-sheet"]')?.remove()
  return document.querySelector('[data-deeptail-probe="${probe}"]') === null
})()`

/**
 * Plant a labelled button of a known CSS-pixel box, beating UA padding.
 * @param page - the page under test.
 * @param probe - probe id, also used for the injected sheet.
 * @param px - width and height to force.
 */
async function plantTarget(page: Page, probe: string, px: number): Promise<void> {
  await page.evaluate(
    (args: { probe: string; px: number }) => {
      const button = document.createElement('button')
      button.textContent = 'probe'
      button.dataset.deeptailProbe = args.probe
      document.querySelector('[data-deeptail-shell] main')?.append(button)
      const sheet = document.createElement('style')
      sheet.dataset.deeptailProbe = `${args.probe}-sheet`
      const size = String(args.px)
      sheet.textContent = `[data-deeptail-probe="${args.probe}"]{box-sizing:border-box;width:${size}px;height:${size}px;min-width:${size}px;min-height:${size}px;max-width:${size}px;max-height:${size}px;padding:0;border:0;margin:0;font-size:1px;line-height:1;overflow:hidden}`
      document.head.append(sheet)
    },
    { probe, px },
  )
}

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

it('reports a sourced helper script hanging off a product surface', async () => {
  const page = await openShell(harness)
  await page.evaluate(() => {
    const script = document.createElement('script')
    script.dataset.deeptailProbe = 'src-script'
    script.src = '/one-off-helper.js'
    document.querySelector('[data-deeptail-shell]')?.append(script)
  })
  const found = await defects(page)
  expect(found).toContain('inline-script')
  expect(found).toContain('one-off-helper.js')
  expect(await page.evaluate<boolean>(DROP('src-script'))).toBe(true)
  expect(await defects(page)).toBe('')
  await page.close()
})

it('reports a sourced helper script appended to the document body', async () => {
  const page = await openShell(harness)
  await page.evaluate(() => {
    const script = document.createElement('script')
    script.dataset.deeptailProbe = 'body-script'
    script.src = '/body-helper.js'
    document.body.append(script)
  })
  const found = await defects(page)
  expect(found).toContain('inline-script')
  expect(found).toContain('body-helper.js')
  expect(await page.evaluate<boolean>(DROP('body-script'))).toBe(true)
  expect(await defects(page)).toBe('')
  await page.close()
})

it('reports a control under the WCAG 2.5.8 24px floor', async () => {
  const page = await openShell(harness)
  await plantTarget(page, 'tiny', 23)
  const found = await defects(page)
  expect(found).toContain('target-size')
  expect(found).toContain('under 24')
  expect(await page.evaluate<boolean>(DROP('tiny'))).toBe(true)
  expect(await defects(page)).toBe('')
  await page.close()
})

it('reports a control under the Apple HIG 44px floor on a coarse pointer', async () => {
  const page = await openShell(harness, {}, { mobile: true })
  await plantTarget(page, 'short', 43)
  const found = await defects(page, true)
  expect(found).toContain('target-size')
  expect(found).toContain('under 44')
  expect(await page.evaluate<boolean>(DROP('short'))).toBe(true)
  expect(await defects(page, true)).toBe('')
  await page.close()
})
