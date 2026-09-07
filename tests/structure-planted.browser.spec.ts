/**
 * Planted defects the structure checks must report by name, and then drop.
 *
 * A check that stays quiet on a clean page is indistinguishable from a check
 * that cannot fire. Each rule below is given something to find, then the
 * probe is removed and the page is clean again.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { type Harness, startHarness } from '../apps/deeptail/tests/harness.ts'
import { defects } from '../apps/deeptail/tests/structure-page.ts'
import { openShell } from '../apps/deeptail/tests/surfaces.ts'

type Page = Awaited<ReturnType<typeof openShell>>

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
    plant: async (page) => {
      await page.evaluate(() => {
        const extra = document.createElement('div')
        extra.dataset['deeptailShell'] = ''
        extra.dataset['deeptailProbe'] = 'shell'
        document.querySelector('[data-deeptail-shell]')?.append(extra)
      })
    },
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
]

for (const planted of CASES) {
  it(planted.label, async () => {
    const page = await openPlanted(planted.view)
    await planted.plant(page)
    const found = await defects(page, planted.strict === true)
    for (const reason of planted.reports) expect(found).toContain(reason)
    if (planted.drop !== undefined) {
      const dropped = await Promise.all(planted.drop.map((name) => page.evaluate<boolean>(DROP(name))))
      for (const gone of dropped) expect(gone).toBe(true)
      expect(await defects(page, planted.strict === true)).toBe('')
    }
    await page.close()
  })
}
