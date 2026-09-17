/**
 * The dialog contract, and the one frame that owns it: `src/ui/modal.ts` is
 * where a dialog declares itself modal, named, focused, dismissed by Escape and
 * the mask, and handing focus back to the control that opened it, with the rest
 * of the document out of the tree. `tests/ui-dom.spec.ts` proves no second frame.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import type { Page } from 'playwright'
import { ACTIONS } from '../src/actions/registry.ts'
import { dataSelector } from '../src/markers.ts'
import { fleet } from './fixtures.ts'
import { type Harness, startHarness } from './harness.ts'
import { defects } from './structure-page.ts'
import { openDrawerIfPresent } from './surfaces.ts'
import { REFLOW_VIEWPORT } from './viewports.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

/** The dialog root the shared frame portals to `document.body`. */
const DIALOG = dataSelector('dialog')

/** The sheets the product opens, and how a case reaches each one. */
const SHEETS: readonly (readonly [string, (page: Page) => Promise<void>])[] = [
  ['new session', (page) => page.locator(dataSelector('action', ACTIONS['session.spawn'].marker)).click()],
  [
    'compose',
    async (page) => {
      const row = page.locator(`${dataSelector('host', 'dev-1')}${dataSelector('session', 's-running')}`)
      await row.waitFor({ state: 'visible' })
      // The row's actions ride behind a hover on a fine pointer.
      await row.hover()
      await row.locator(dataSelector('action', ACTIONS['session.message'].marker)).click()
    },
  ],
]

/**
 * Each dismissal a case drives, and the control focus lands on. The compose
 * sheet is closed by the mask alone: its trigger is a row action revealed by a
 * hover, so the pointer is over the mask when it closes and the frame hands
 * focus to the row's own control.
 */
const DISMISSALS: readonly (readonly [string, 'Escape' | 'mask', string])[] = [
  ['compose', 'mask', ACTIONS['session.open'].marker],
  ['new session', 'Escape', ACTIONS['session.spawn'].marker],
  ['new session', 'mask', ACTIONS['session.spawn'].marker],
]

/** Open the shell at the WCAG reflow floor, where the sidebar is a drawer. */
async function openedAtFloor(): Promise<Page> {
  const page = await harness.open(fleet(), {
    mobile: true,
    width: REFLOW_VIEWPORT.width,
    height: REFLOW_VIEWPORT.height,
  })
  await page.waitForSelector('[data-deeptail-shell]')
  await openDrawerIfPresent(page)
  return page
}

/** Every rule name the structural check reports on a page. */
async function rulesOn(page: Page): Promise<readonly string[]> {
  const lines = (await defects(page)).split('\n').filter((line) => line !== '')
  return lines.map((line) => line.slice(0, line.indexOf(':')))
}

it('opens every sheet through the one frame, named, modal, and holding focus', async () => {
  const held = await Promise.all(
    SHEETS.map(async ([label, open]) => {
      const page = await openedAtFloor()
      await open(page)
      const dialog = page.locator(DIALOG)
      await dialog.waitFor({ state: 'visible' })
      const frame = await dialog.evaluate((node) => {
        const id = node.getAttribute('aria-labelledby') ?? ''
        const heading = [...node.querySelectorAll('[id]')].find((one) => one.id === id)
        const outer = node.parentElement
        const behind = [...document.body.children].filter((child) => child !== outer)
        return {
          role: node.getAttribute('role') ?? '',
          modal: node.getAttribute('aria-modal') ?? '',
          name: heading?.textContent ?? '',
          // Named by the heading it shows, so the name cannot drift from it.
          named: heading !== undefined && node.contains(heading),
          // Focus moves into the dialog, and every sibling of the frame's root
          // is inert, so nothing behind it can take that focus away.
          focus: node.contains(document.activeElement),
          behind: behind.length > 0 && behind.every((child) => child instanceof HTMLElement && child.inert),
        }
      })
      const byName = await page.getByRole('dialog', { name: frame.name }).count()
      const findings = await rulesOn(page)
      await page.close()
      return [
        label,
        frame.role,
        frame.modal,
        frame.named && frame.name !== '',
        byName,
        frame.focus,
        frame.behind,
        findings.includes('dialog-contract'),
        findings.includes('overlay-contract'),
      ]
    }),
  )
  expect(held).toEqual([
    ['new session', 'dialog', 'true', true, 1, true, true, false, false],
    ['compose', 'dialog', 'true', true, 1, true, true, false, false],
  ])
})

it('hands focus back to the control that opened each sheet', async () => {
  const dismissed = await Promise.all(
    DISMISSALS.map(async ([label, how]) => {
      const sheet = SHEETS.find(([name]) => name === label)
      if (sheet === undefined) throw new Error(`no sheet is called ${label}`)
      const page = await harness.open(fleet())
      await page.waitForSelector('[data-deeptail-shell]')
      await sheet[1](page)
      const dialog = page.locator(DIALOG)
      await dialog.waitFor({ state: 'visible' })
      // The dialog sits over the mask's middle, so the press lands on a corner.
      if (how === 'Escape') await page.keyboard.press('Escape')
      else await page.locator('.modal-mask').click({ position: { x: 4, y: 4 } })
      await dialog.waitFor({ state: 'detached' })
      const landed = await page.evaluate(() =>
        document.activeElement instanceof HTMLElement ? (document.activeElement.dataset['deeptailAction'] ?? '') : '',
      )
      await page.close()
      return `${label} ${how}: ${landed}`
    }),
  )
  expect(dismissed).toEqual(DISMISSALS.map(([label, how, marker]) => `${label} ${how}: ${marker}`))
})

it('lands focus on a reachable control when the frame closed the drawer its trigger sat in', async () => {
  // At the floor the frame dismisses the drawer it overlaps, which takes the
  // control that opened the sheet out of play with it, so the frame owes the
  // reader the control that holds that region instead.
  const page = await openedAtFloor()
  await page.locator(dataSelector('action', ACTIONS['session.message'].marker)).first().click()
  const dialog = page.locator(DIALOG)
  await dialog.waitFor({ state: 'visible' })
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'detached' })
  expect(
    await page.evaluate(() => {
      const active = document.activeElement
      return {
        reached: active instanceof HTMLElement && active !== document.body && active.closest('[inert]') === null,
        marker: active instanceof HTMLElement ? (active.dataset['deeptailAction'] ?? '') : '',
      }
    }),
  ).toEqual({ reached: true, marker: ACTIONS['drawer.toggle'].marker })
  await page.close()
})

it('seats every dialog inside the reflow floor, with its actions reachable', async () => {
  // Both sheets open over one frame, so a case that opened only one would pass
  // on a frame that had lost the containment for the other.
  const measured = await Promise.all(
    SHEETS.map(async ([label, open]) => {
      const page = await openedAtFloor()
      await open(page)
      const dialog = page.locator(DIALOG)
      await dialog.waitFor({ state: 'visible' })
      const reach = await dialog.evaluate((node) => {
        const actions = node.querySelector('.actions')
        if (actions === null) throw new Error('the open dialog has no action row')
        const box = node.getBoundingClientRect()
        const row = actions.getBoundingClientRect()
        const scroller = document.scrollingElement
        return {
          viewport: window.innerHeight,
          top: Math.round(box.top),
          bottom: Math.round(box.bottom),
          actionsTop: Math.round(row.top),
          actionsBottom: Math.round(row.bottom),
          // A `position: fixed` root overflows without giving the document
          // anything to scroll, so what leaves the screen cannot come back.
          documentScrolls: (scroller?.scrollHeight ?? 0) > (scroller?.clientHeight ?? 0),
        }
      })
      await page.close()
      // Nothing above the top, nothing below the bottom, the action row wholly
      // on screen, and the document never scrolling: the dialog absorbs its own
      // overflow rather than moving the shell under a modal.
      return [
        label,
        reach.top >= 0,
        reach.bottom <= reach.viewport,
        reach.actionsTop >= 0 && reach.actionsBottom <= reach.viewport,
        reach.documentScrolls,
      ]
    }),
  )
  expect(measured).toEqual([
    ['new session', true, true, true, false],
    ['compose', true, true, true, false],
  ])
})

/** The defects planted inside the open dialog, and the finding each raises. */
const PLANTED: readonly (readonly [string, string])[] = [
  ['nested-scroll', 'which also scrolls'],
  ['overlapping-targets', 'overlapping'],
]

/**
 * Put one structural defect inside the open dialog's own scroller. The
 * nested-scroll rule stopped counting editable controls and the overlap rule
 * measures painted boxes, and each exclusion must keep reporting the shape it
 * is named for.
 * @param page - the page showing the spawn dialog.
 * @param rule - which defect to plant.
 */
async function plantInsideDialog(page: Page, rule: string): Promise<void> {
  if (rule === 'nested-scroll') {
    // A stylesheet and a data attribute, not an inline style and not a class:
    // the class vocabulary is the shipped sheets.
    await page.addStyleTag({ content: '[data-deeptail-probe="pane"] { overflow-y: auto; block-size: 20px; }' })
    await page.evaluate(() => {
      const pane = document.createElement('div')
      pane.dataset['deeptailProbe'] = 'pane'
      document.querySelector('.modal-body')?.append(pane)
    })
    return
  }
  // Pinned to the top of the body's visible box, where the pane paints both.
  await page.addStyleTag({
    content:
      '[data-deeptail-dialog] .modal-body { position: relative; } [data-deeptail-dialog] .modal-body .input, [data-deeptail-dialog] .modal-body .select { position: absolute; inset-block-start: 0; inset-inline-start: 0; inline-size: 80px; block-size: 30px; margin: 0; }',
  })
}

it('still reports a defect planted inside the dialog’s own scroller', async () => {
  // Each rule is clean on this dialog before anything is planted, so what the
  // case reports afterwards is the defect it planted.
  const checked = await Promise.all(
    PLANTED.map(async ([rule, detail]) => {
      const page = await openedAtFloor()
      await page.locator(dataSelector('action', ACTIONS['session.spawn'].marker)).click()
      await page.locator(DIALOG).waitFor({ state: 'visible' })
      const before = await rulesOn(page)
      await plantInsideDialog(page, rule)
      const found = await defects(page)
      await page.close()
      return [rule, before.includes(rule), found.includes(rule), found.includes(detail)]
    }),
  )
  expect(checked).toEqual([
    ['nested-scroll', false, true, true],
    ['overlapping-targets', false, true, true],
  ])
})

it('reports a dialog and an overlay built outside the frame, and drops them', async () => {
  const page = await openedAtFloor()
  expect(await rulesOn(page)).not.toContain('dialog-contract')
  expect(await rulesOn(page)).not.toContain('overlay-contract')
  // A dialog assembled where the frame is not, and a full-viewport layer no
  // frame owns: each is the second contract this rule names, and neither is
  // reported while the promise its author did remember keeps axe quiet.
  await page.evaluate(() => {
    const rogue = document.createElement('div')
    rogue.dataset['deeptailProbe'] = 'rogue'
    rogue.setAttribute('role', 'dialog')
    rogue.setAttribute('aria-modal', 'true')
    rogue.textContent = 'Rogue'
    document.body.append(rogue)
    const overlay = document.createElement('div')
    overlay.dataset['deeptailProbe'] = 'overlay'
    overlay.setAttribute('role', 'presentation')
    document.body.append(overlay)
  })
  await page.addStyleTag({ content: '[data-deeptail-probe="overlay"] { position: fixed; inset: 0; }' })
  const found = await defects(page)
  expect(found).toContain('dialog-contract')
  expect(found).toContain('the shared frame did not build')
  expect(found).toContain('overlay-contract')
  await page.evaluate(() => {
    for (const probe of ['rogue', 'overlay']) document.querySelector(`[data-deeptail-probe="${probe}"]`)?.remove()
  })
  const dropped = await rulesOn(page)
  expect(dropped).not.toContain('dialog-contract')
  expect(dropped).not.toContain('overlay-contract')
  await page.close()
})
