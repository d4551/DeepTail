/**
 * Planted defects in what the page's markup and boxes are, which the structure
 * checks must report by name and then drop.
 *
 * A check that stays quiet on a clean page is indistinguishable from a check
 * that cannot fire. Each rule below is given something to find, then the probe
 * is removed and the page is clean again.
 *
 * This file is the table of shapes: the harness, the case loop and the seating
 * of a probe are in `structure-planted-runner.ts`, and the shapes a document's
 * own seating and wiring are read by are in
 * `structure-planted-shell.browser.spec.ts`.
 */

import { expect, it } from 'bun:test'
import { defects } from './structure-page.ts'
import { DROP, openPlanted, type Planted, plantedSuite, plantTarget } from './structure-planted-runner.ts'

/** Every shape a check must report, and every lookalike it must stay silent for. */
const MARKUP_SHAPES: readonly Planted[] = [
  {
    label: 'reports a control nested inside another control',
    plant: async (page) => {
      await page.evaluate(() => {
        const outer = document.createElement('button')
        outer.setAttribute('data-deeptail-probe', 'nest-outer')
        const inner = document.createElement('button')
        inner.setAttribute('data-deeptail-probe', 'nest-inner')
        outer.append(inner)
        document.querySelector('[data-deeptail-shell] main')?.append(outer)
      })
    },
    reports: ['nested-interactive'],
    drop: ['nest-outer'],
  },
  {
    label: 'reports a heading level skipped, and a second h1',
    plant: async (page) => {
      await page.evaluate(() => {
        const heading = document.createElement('h3')
        heading.setAttribute('data-deeptail-probe', 'skip-h3')
        heading.textContent = 'Skipped'
        const extra = document.createElement('h1')
        extra.setAttribute('data-deeptail-probe', 'extra-h1')
        extra.textContent = 'Also'
        document.querySelector('[data-deeptail-shell] main')?.append(heading, extra)
      })
    },
    reports: ['many-h1', 'heading-skip'],
    drop: ['skip-h3', 'extra-h1'],
  },
  {
    label: 'reports an ARIA reference that reaches nothing',
    plant: async (page) => {
      await page.evaluate(() => {
        const node = document.createElement('div')
        node.setAttribute('data-deeptail-probe', 'dangling')
        node.setAttribute('aria-controls', 'nowhere-at-all')
        document.querySelector('[data-deeptail-shell] main')?.append(node)
      })
    },
    reports: ['dangling-aria-reference'],
    drop: ['dangling'],
  },
  {
    label: 'reports a list owning something that is not a list item',
    plant: async (page) => {
      await page.evaluate(() => {
        const list = document.createElement('div')
        list.setAttribute('data-deeptail-probe', 'bad-list')
        list.setAttribute('role', 'list')
        const stray = document.createElement('div')
        stray.textContent = 'not an item'
        list.append(stray)
        document.querySelector('[data-deeptail-shell] main')?.append(list)
      })
    },
    reports: ['list-owns-non-item'],
    drop: ['bad-list'],
  },
  {
    label: 'reports a group of controls under no name',
    plant: async (page) => {
      await page.evaluate(() => {
        const group = document.createElement('fieldset')
        group.setAttribute('data-deeptail-probe', 'bare-fieldset')
        group.append(document.createElement('input'))
        document.querySelector('[data-deeptail-shell] main')?.append(group)
      })
    },
    reports: ['unnamed-group'],
    drop: ['bare-fieldset'],
  },
  {
    label: 'reports a class no shipped sheet defines',
    plant: async (page) => {
      await page.evaluate(() => {
        const node = document.createElement('div')
        node.setAttribute('data-deeptail-probe', 'stray-class')
        node.className = 'not-a-shipped-class'
        document.querySelector('[data-deeptail-shell] main')?.append(node)
      })
    },
    reports: ['unknown-class'],
    drop: ['stray-class'],
  },
  {
    label: 'reports a table with no header used as a layout grid',
    plant: async (page) => {
      await page.evaluate(() => {
        const table = document.createElement('table')
        table.setAttribute('data-deeptail-probe', 'table')
        const row = table.insertRow()
        row.insertCell().textContent = 'layout'
        document.querySelector('[data-deeptail-shell]')?.append(table)
      })
    },
    reports: ['layout-table'],
    drop: ['table'],
  },
  {
    label: 'reports a control under the WCAG 2.5.8 24px floor',
    plant: (page) => plantTarget(page, 'tiny', 23),
    reports: ['target-size', 'under 24'],
    drop: ['tiny'],
  },
  {
    label: 'reports a control under the Apple HIG 44px floor on a coarse pointer',
    view: { mobile: true },
    strict: true,
    plant: (page) => plantTarget(page, 'short', 43),
    reports: ['target-size', 'under 44'],
    drop: ['short'],
  },
  {
    label: 'reports a line past the measure the sheets declare',
    plant: async (page) => {
      await page.evaluate(() => {
        const line = document.createElement('p')
        line.setAttribute('data-deeptail-probe', 'wide-line')
        line.textContent = 'w'.repeat(240)
        document.querySelector('[data-deeptail-shell] main')?.append(line)
      })
    },
    reports: ['off-scale-measure'],
    drop: ['wide-line'],
  },
  {
    label: 'reports type off the ladder inside a shadow root, and inside a nested pane',
    plant: async (page) => {
      await page.evaluate(() => {
        const host = document.createElement('div')
        host.setAttribute('data-deeptail-probe', 'shadow-host')
        const root = host.attachShadow({ mode: 'open' })
        const sheet = new CSSStyleSheet()
        sheet.replaceSync('p { font-size: 15px; }')
        root.adoptedStyleSheets = [sheet]
        const shadowed = document.createElement('p')
        shadowed.id = 'shadow-off'
        shadowed.textContent = 'Roster'
        root.append(shadowed)
        const outer = document.createElement('div')
        outer.setAttribute('data-deeptail-probe', 'scrolling-pane')
        const inner = document.createElement('div')
        inner.className = 'main-body'
        const deep = document.createElement('p')
        deep.id = 'scroll-off'
        deep.className = 'main-title'
        deep.textContent = 'Roster'
        inner.append(deep)
        outer.append(inner)
        document.querySelector('[data-deeptail-shell] main')?.append(host, outer)
        const paint = document.createElement('style')
        paint.setAttribute('data-deeptail-probe', 'scrolling-pane-sheet')
        paint.textContent = `[data-deeptail-probe="scrolling-pane"], [data-deeptail-probe="scrolling-pane"] .main-body { overflow-y: auto; } [data-deeptail-probe="scrolling-pane"] .main-title { font-size: 15px; }`
        document.head.append(paint)
      })
    },
    reports: ['off-scale-type', 'p#shadow-off', 'p#scroll-off'],
    drop: ['shadow-host', 'scrolling-pane'],
  },
]

plantedSuite(MARKUP_SHAPES)

it('reports every box adrift on a line, and a row seated by a physical alignment', async () => {
  const page = await openPlanted()
  await page.evaluate(() => {
    const row = document.createElement('div')
    row.id = 'adrift-row'
    row.setAttribute('data-deeptail-probe', 'adrift-row')
    row.append(document.createElement('div'), document.createElement('div'), document.createElement('div'))
    const physical = document.createElement('div')
    physical.id = 'physical-row'
    physical.setAttribute('data-deeptail-probe', 'physical-row')
    document.querySelector('[data-deeptail-shell] main')?.append(row, physical)
    const sheet = document.createElement('style')
    sheet.setAttribute('data-deeptail-probe', 'adrift-row-sheet')
    const box = ['40', 'px'].join('')
    const side = ['ri', 'ght'].join('')
    sheet.textContent = `[data-deeptail-probe="adrift-row"]{display:flex} [data-deeptail-probe="adrift-row"]>div{height:${box}} [data-deeptail-probe="adrift-row"]>div:nth-child(2){position:relative;top:5px} [data-deeptail-probe="adrift-row"]>div:nth-child(3){position:relative;top:10px} [data-deeptail-probe="physical-row"]{justify-items:${side}}`
    document.head.append(sheet)
  })
  const found = await defects(page)
  // Two boxes are off the line their lead sits on, so the container is
  // reported twice: one finding names a third of the row.
  expect(found.split('\n').filter((line) => line.startsWith('sibling-misalignment')).length).toBe(2)
  expect(found).toContain('seats its row with the physical justify-items')
  const probes = ['adrift-row', 'physical-row']
  const dropped = await Promise.all(probes.map((probe) => page.evaluate<boolean>(DROP(probe))))
  for (const gone of dropped) expect(gone).toBe(true)
  expect(await defects(page)).toBe('')
  await page.close()
})
