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

/**
 * Open the shell view one case plants under.
 *
 * The mutable harness is read here rather than inside the closures the
 * registration loop creates: a function a loop creates may not name a binding
 * a later turn can change, so the harness never appears inside the loop.
 * @param view - the viewport and palette the case runs under; absent is the wide fine-pointer roster.
 * @returns the page, showing the shell.
 */
function openPlanted(view?: Parameters<Harness['open']>[1]): Promise<Page> {
  return openShell(harness, {}, view)
}

/** Drop the probe element a previous evaluation planted. */
const DROP = (probe: string): string => `(() => {
  document.querySelector('[data-deeptail-probe="${probe}"]')?.remove()
  document.querySelector('[data-deeptail-probe="${probe}-sheet"]')?.remove()
  return document.querySelector('[data-deeptail-probe="${probe}"]') === null
})()`

/** One probe element to plant: its id, its tag, its hooks and where it sits. */
interface Probe {
  readonly probe: string
  /** The tag to create; a button unless the case is about something else. */
  readonly tag?: string
  readonly hooks?: Readonly<Record<string, string>>
  /** The one place a probe is seated: the shell itself, or its main pane. */
  readonly into?: 'shell' | 'main'
}

/**
 * Plant one probe element, with whatever hooks the case is about.
 * @param page - the page under test.
 * @param spec - what to create and where to seat it.
 */
async function plantProbe(page: Page, spec: Probe): Promise<void> {
  await page.evaluate((args: Probe) => {
    const node = document.createElement(args.tag ?? 'button')
    node.dataset['deeptailProbe'] = args.probe
    for (const [name, value] of Object.entries(args.hooks ?? {})) node.setAttribute(name, value)
    const root = '[data-deeptail-shell]'
    const where = args.into === 'shell' ? root : `${root} main`
    document.querySelector(where)?.append(node)
  }, spec)
}

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
      button.dataset['deeptailProbe'] = args.probe
      document.querySelector('[data-deeptail-shell] main')?.append(button)
      const sheet = document.createElement('style')
      sheet.dataset['deeptailProbe'] = `${args.probe}-sheet`
      const size = String(args.px)
      sheet.textContent = `[data-deeptail-probe="${args.probe}"]{box-sizing:border-box;width:${size}px;height:${size}px;min-width:${size}px;min-height:${size}px;max-width:${size}px;max-height:${size}px;padding:0;border:0;margin:0;font-size:1px;line-height:1;overflow:hidden}`
      document.head.append(sheet)
    },
    { probe, px },
  )
}

/** One planted defect: what is put on the page, what the check must name, and what it drops. */
interface PlantedCase {
  /** The rule the case proves, as the case title. */
  readonly label: string
  /** The view to open under; absent is the wide fine-pointer roster. */
  readonly view?: Parameters<Harness['open']>[1]
  /** Hold the page to the pointer's own touch floor while measuring. */
  readonly strict?: boolean
  /** Put the defect on the page. */
  readonly plant: (page: Page) => Promise<void>
  /** The check's names the page must carry while the probe is planted. */
  readonly reports: readonly string[]
  /** The probes to drop; a case that styled a product element drops nothing. */
  readonly drop?: readonly string[]
}

const CASES: readonly PlantedCase[] = [
  {
    label: 'reports nested interactive controls',
    plant: async (page) => {
      await page.evaluate(() => {
        const link = document.createElement('a')
        link.href = '#probe'
        link.dataset['deeptailProbe'] = 'nested'
        const inner = document.createElement('button')
        inner.textContent = 'inner'
        link.append(inner)
        document.querySelector('[data-deeptail-shell]')?.append(link)
      })
    },
    reports: ['nested-interactive'],
    drop: ['nested'],
  },
  {
    label: 'reports a skipped heading level',
    plant: async (page) => {
      await page.evaluate(() => {
        const heading = document.createElement('h5')
        heading.textContent = 'skipped'
        heading.dataset['deeptailProbe'] = 'heading'
        document.querySelector('[data-deeptail-shell] main')?.append(heading)
      })
    },
    reports: ['heading-skip'],
    drop: ['heading'],
  },
  {
    label: 'reports a group of controls under no name',
    plant: async (page) => {
      await page.evaluate(() => {
        const group = document.createElement('fieldset')
        group.dataset['deeptailProbe'] = 'group'
        const input = document.createElement('input')
        input.type = 'radio'
        input.name = 'probe'
        group.append(input)
        document.querySelector('[data-deeptail-shell]')?.append(group)
      })
    },
    reports: ['unnamed-group'],
    drop: ['group'],
  },
  {
    label: 'reports physical text alignment',
    plant: async (page) => {
      const side = ['lef', 't'].join('')
      await page.addStyleTag({ content: `[data-deeptail-shell] .main-title { text-align: ${side}; }` })
    },
    reports: ['alignment'],
  },
  {
    label: 'reports a nested grid',
    plant: async (page) => {
      await page.evaluate(() => {
        const inner = document.createElement('div')
        inner.dataset['deeptailProbe'] = 'grid'
        inner.className = 'main-body'
        document.querySelector('[data-deeptail-shell]')?.append(inner)
      })
      await page.addStyleTag({ content: '[data-deeptail-probe="grid"] { display: grid; }' })
    },
    reports: ['nested-grid'],
    drop: ['grid'],
  },
  {
    label: 'reports a layout table with no header',
    plant: async (page) => {
      await page.evaluate(() => {
        const table = document.createElement('table')
        table.dataset['deeptailProbe'] = 'table'
        const row = table.insertRow()
        row.insertCell().textContent = 'layout'
        document.querySelector('[data-deeptail-shell]')?.append(table)
      })
    },
    reports: ['layout-table'],
    drop: ['table'],
  },
  {
    label: 'reports a second shell, and a shell nested in a shell',
    plant: (page) =>
      plantProbe(page, { probe: 'shell', tag: 'div', into: 'shell', hooks: { 'data-deeptail-shell': '' } }),
    reports: ['nested-shell', 'split-shell'],
    drop: ['shell'],
  },
  {
    label: 'reports an inline script inside a product surface',
    plant: async (page) => {
      await page.evaluate(() => {
        const script = document.createElement('script')
        script.dataset['deeptailProbe'] = 'script'
        script.textContent = 'void 0'
        document.querySelector('[data-deeptail-shell]')?.append(script)
      })
    },
    reports: ['inline-script'],
    drop: ['script'],
  },
  {
    label: 'reports a sourced helper script hanging off a product surface',
    plant: async (page) => {
      await page.evaluate(() => {
        const script = document.createElement('script')
        script.dataset['deeptailProbe'] = 'src-script'
        script.src = '/one-off-helper.js'
        document.querySelector('[data-deeptail-shell]')?.append(script)
      })
    },
    reports: ['inline-script', 'one-off-helper.js'],
    drop: ['src-script'],
  },
  {
    label: 'reports a sourced helper script appended to the document body',
    plant: async (page) => {
      await page.evaluate(() => {
        const script = document.createElement('script')
        script.dataset['deeptailProbe'] = 'body-script'
        script.src = '/body-helper.js'
        document.body.append(script)
      })
    },
    reports: ['inline-script', 'body-helper.js'],
    drop: ['body-script'],
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
        line.dataset['deeptailProbe'] = 'wide-line'
        line.textContent = 'w'.repeat(240)
        document.querySelector('[data-deeptail-shell] main')?.append(line)
      })
    },
    reports: ['off-scale-measure'],
    drop: ['wide-line'],
  },
  {
    label: 'reports the controls the shipped action registry does not reach',
    plant: async (page) => {
      await plantProbe(page, { probe: 'unknown-action', hooks: { 'data-deeptail-action': 'not-a-declared-action' } })
      await plantProbe(page, { probe: 'twice-bound', hooks: { 'data-deeptail-action': 'drawer drawer-toggle' } })
      await plantProbe(page, { probe: 'unreachable', tag: 'div', hooks: { 'data-deeptail-action': 'drawer' } })
      await page.evaluate(() => {
        const inner = document.createElement('button')
        inner.setAttribute('data-deeptail-action', 'drawer-dismiss')
        document.querySelector('[data-deeptail-probe="unreachable"]')?.append(inner)
      })
    },
    reports: [
      'unwired-action',
      'which the shipped registry does not declare',
      'names 2 actions (drawer, drawer-toggle)',
      'without being a control a keyboard reaches',
      'nested-action',
      'one press runs both',
    ],
    drop: ['unknown-action', 'twice-bound', 'unreachable'],
  },
  {
    label: 'stays silent for a hidden control the registry declares',
    plant: (page) =>
      plantProbe(page, { probe: 'declared-action', hooks: { 'data-deeptail-action': 'drawer', hidden: '' } }),
    reports: [],
    drop: ['declared-action'],
  },
  {
    label: 'reports a surface seated inside another, and a shell seated outside the mount',
    plant: async (page) => {
      await plantProbe(page, { probe: 'nested-surface', tag: 'div', hooks: { 'data-deeptail-picker': '' } })
      await page.evaluate(() => {
        const loose = document.createElement('main')
        loose.dataset['deeptailProbe'] = 'loose-main'
        const elsewhere = document.createElement('div')
        elsewhere.dataset['deeptailShell'] = ''
        elsewhere.dataset['deeptailProbe'] = 'outside-shell'
        elsewhere.append(document.createElement('main'))
        document.body.append(loose, elsewhere)
      })
    },
    reports: ['nested-surface', 'stray-main', 'shell-outside-mount'],
    drop: ['nested-surface', 'loose-main', 'outside-shell'],
  },
  {
    label: 'reports type off the ladder inside a shadow root, and inside a nested pane',
    plant: async (page) => {
      await page.evaluate(() => {
        const host = document.createElement('div')
        host.dataset['deeptailProbe'] = 'shadow-host'
        const root = host.attachShadow({ mode: 'open' })
        const sheet = new CSSStyleSheet()
        sheet.replaceSync('p { font-size: 15px; }')
        root.adoptedStyleSheets = [sheet]
        const shadowed = document.createElement('p')
        shadowed.id = 'shadow-off'
        shadowed.textContent = 'Roster'
        root.append(shadowed)
        const outer = document.createElement('div')
        outer.dataset['deeptailProbe'] = 'scrolling-pane'
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
        paint.dataset['deeptailProbe'] = 'scrolling-pane-sheet'
        paint.textContent = `[data-deeptail-probe="scrolling-pane"], [data-deeptail-probe="scrolling-pane"] .main-body { overflow-y: auto; } [data-deeptail-probe="scrolling-pane"] .main-title { font-size: 15px; }`
        document.head.append(paint)
      })
    },
    reports: ['off-scale-type', 'p#shadow-off', 'p#scroll-off'],
    drop: ['shadow-host', 'scrolling-pane'],
  },
]

for (const planted of CASES) {
  it(planted.label, async () => {
    const page = await openPlanted(planted.view)
    expect(await defects(page, planted.strict === true)).toBe('')
    await planted.plant(page)
    const found = await defects(page, planted.strict === true)
    // A case with nothing to report asks the opposite question: the shape it
    // planted is the one that merely resembles a defect.
    if (planted.reports.length === 0) expect(found).toBe('')
    for (const reason of planted.reports) expect(found).toContain(reason)
    if (planted.drop !== undefined) {
      const dropped = await Promise.all(planted.drop.map((name) => page.evaluate<boolean>(DROP(name))))
      for (const gone of dropped) expect(gone).toBe(true)
      expect(await defects(page, planted.strict === true)).toBe('')
    }
    await page.close()
  })
}

it('reports every box adrift on a line, and a row seated by a physical alignment', async () => {
  const page = await openPlanted()
  await page.evaluate(() => {
    const row = document.createElement('div')
    row.id = 'adrift-row'
    row.dataset['deeptailProbe'] = 'adrift-row'
    row.append(document.createElement('div'), document.createElement('div'), document.createElement('div'))
    const physical = document.createElement('div')
    physical.id = 'physical-row'
    physical.dataset['deeptailProbe'] = 'physical-row'
    document.querySelector('[data-deeptail-shell] main')?.append(row, physical)
    const sheet = document.createElement('style')
    sheet.dataset['deeptailProbe'] = 'adrift-row-sheet'
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
  for (const probe of ['adrift-row', 'physical-row']) {
    expect(await page.evaluate<boolean>(DROP(probe))).toBe(true)
  }
  expect(await defects(page)).toBe('')
  await page.close()
})
