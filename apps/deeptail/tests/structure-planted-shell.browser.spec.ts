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

import { plantProbe } from './structure-planted-probe.ts'
import { type Planted, plantedSuite } from './structure-planted-runner.ts'

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
    plant: async (page) => {
      await page.evaluate(() => {
        const script = document.createElement('script')
        script.dataset.deeptailProbe = 'script'
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
        script.dataset.deeptailProbe = 'src-script'
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
        script.dataset.deeptailProbe = 'body-script'
        script.src = '/body-helper.js'
        document.body.append(script)
      })
    },
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
        inner.dataset.deeptailAction = 'drawer-dismiss'
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
        loose.dataset.deeptailProbe = 'loose-main'
        const elsewhere = document.createElement('div')
        elsewhere.dataset.deeptailShell = ''
        elsewhere.dataset.deeptailProbe = 'outside-shell'
        elsewhere.append(document.createElement('main'))
        document.body.append(loose, elsewhere)
      })
    },
    reports: ['nested-surface', 'stray-main', 'shell-outside-mount'],
    drop: ['nested-surface', 'loose-main', 'outside-shell'],
  },
]

plantedSuite(SHELL_SHAPES)
