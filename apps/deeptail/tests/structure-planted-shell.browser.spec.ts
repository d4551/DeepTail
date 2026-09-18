/**
 * Planted defects in what a document seats and what its controls are wired to,
 * which the structure checks must report by name and then drop.
 *
 * A check that stays quiet on a clean page is indistinguishable from a check
 * that cannot fire. Each rule below is given something to find, then the probe
 * is removed and the page is clean again.
 *
 * This file is the table of shapes: the harness, the case loop and the seating
 * of a probe are in `structure-planted-runner.ts`, and the shapes the page's
 * own markup and boxes are read by are in
 * `structure-planted.browser.spec.ts`.
 */

import type { Page } from 'playwright'
import { plantProbe } from './structure-planted-probe.ts'
import { type Planted, plantedSuite } from './structure-planted-runner.ts'

/** One probe script: the id it is marked with, and the source it loads. */
interface ProbeScript {
  /** The `data-deeptail-probe` id, which is also how it is dropped. */
  readonly probe: string
  /** The helper it loads, or nothing for an inline script. */
  readonly src?: string
  /** Where it lands: inside the shell by default, on the body when asked. */
  readonly into?: 'body'
}

/**
 * Plant one probe script, inline or sourced.
 *
 * The three script shapes below differ only in the id, the source and where the
 * script lands, so the planting is stated once and each shape contributes those
 * three rather than restating the element it is about.
 * @param page - the page under test.
 * @param spec - the id to mark the script with, and the source it loads.
 */
async function plantScript(page: Page, spec: ProbeScript): Promise<void> {
  await page.evaluate((args: ProbeScript) => {
    const script = document.createElement('script')
    script.dataset['deeptailProbe'] = args.probe
    if (args.src === undefined) script.textContent = 'void 0'
    else script.src = args.src
    const where = args.into === 'body' ? document.body : document.querySelector('[data-deeptail-shell]')
    where?.append(script)
  }, spec)
}

/** Every shape a check must report, and every lookalike it must stay silent for. */
const SHELL_SHAPES: readonly Planted[] = [
  {
    label: 'reports a second shell, and a shell nested in a shell',
    plant: (page) => plantProbe(page, { probe: 'shell', tag: 'div', into: 'shell', shell: true }),
    reports: ['nested-shell', 'split-shell'],
    drop: ['shell'],
  },
  {
    label: 'reports an inline script inside a product surface',
    plant: (page) => plantScript(page, { probe: 'script' }),
    reports: ['inline-script'],
    drop: ['script'],
  },
  {
    label: 'reports a sourced helper script hanging off a product surface',
    plant: (page) => plantScript(page, { probe: 'src-script', src: '/one-off-helper.js' }),
    reports: ['inline-script', 'one-off-helper.js'],
    drop: ['src-script'],
  },
  {
    label: 'reports a sourced helper script appended to the document body',
    plant: (page) => plantScript(page, { probe: 'body-script', src: '/body-helper.js', into: 'body' }),
    reports: ['inline-script', 'body-helper.js'],
    drop: ['body-script'],
  },
  {
    label: 'reports the controls the shipped action registry does not reach',
    plant: async (page) => {
      await Promise.all([
        plantProbe(page, { probe: 'unknown-action', action: 'not-a-declared-action' }),
        plantProbe(page, { probe: 'twice-bound', action: 'drawer drawer-toggle' }),
        plantProbe(page, { probe: 'unreachable', tag: 'div', action: 'drawer' }),
      ])
      await page.evaluate(() => {
        const inner = document.createElement('button')
        inner.dataset['deeptailAction'] = 'drawer-dismiss'
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
    plant: (page) => plantProbe(page, { probe: 'declared-action', action: 'drawer', hidden: true }),
    reports: [],
    drop: ['declared-action'],
  },
  {
    label: 'reports a surface seated inside another, and a shell seated outside the mount',
    plant: async (page) => {
      await plantProbe(page, { probe: 'nested-surface', tag: 'div', picker: true })
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
]

plantedSuite(SHELL_SHAPES)
