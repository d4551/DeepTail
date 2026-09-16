/**
 * The dialog contract, and the one frame that owns it.
 *
 * A dialog is a contract, not a box: it declares itself modal, it is named by
 * the heading it shows, focus moves into it and nothing behind it can take that
 * focus away, Escape and the mask dismiss it, focus goes back to the control
 * that opened it, and the rest of the document leaves the tree for its
 * lifetime. `src/ui/modal.ts` holds all of that in one place. These cases drive
 * both sheets the product opens through it, report a dialog or an overlay built
 * outside it, and read the shipped modules to prove no second frame exists.
 *
 * Every case opens a dialog at the box WCAG 2.2 SC 1.4.10 names unless its own
 * comment says otherwise: every taller viewport seats a dialog whole whatever
 * it does, so none of them can tell a dialog that manages its own overflow from
 * one that overhangs the screen, nor a frame whose focus handling only holds on
 * the wide layout.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import type { Page } from 'playwright'
import { repositoryFiles } from '../../../scripts/source-tree.ts'
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

/** The control that opens and closes the drawer. */
const DRAWER = dataSelector('action', ACTIONS['drawer.toggle'].marker)

/** One sheet the product opens, and how a case reaches it. */
interface Sheet {
  readonly label: string
  /** The registry marker the control that opens it carries. */
  readonly trigger: string
  readonly open: (page: Page) => Promise<void>
}

const SHEETS: readonly Sheet[] = [
  {
    label: 'new session',
    trigger: ACTIONS['session.spawn'].marker,
    open: (page) => page.locator(dataSelector('action', ACTIONS['session.spawn'].marker)).click(),
  },
  {
    label: 'compose',
    trigger: ACTIONS['session.message'].marker,
    open: async (page) => {
      const row = page.locator(`${dataSelector('host', 'dev-1')}${dataSelector('session', 's-running')}`)
      await row.waitFor({ state: 'visible' })
      // The row's actions ride behind a hover on a fine pointer.
      await row.hover()
      await row.locator(dataSelector('action', ACTIONS['session.message'].marker)).click()
    },
  },
]

/**
 * Open the shell at the WCAG reflow floor, with the roster showing.
 *
 * On this width the sidebar is a drawer, which is the shape the frame has to
 * handle and the one a wider page never asks it for.
 * @returns the page, showing the shell at the floor.
 */
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
    SHEETS.map(async (sheet) => {
      const page = await openedAtFloor()
      await sheet.open(page)
      const dialog = page.locator(DIALOG)
      await dialog.waitFor({ state: 'visible' })
      const frame = await dialog.evaluate((node) => {
        const heading = document.getElementById(node.getAttribute('aria-labelledby') ?? '')
        const outer = node.parentElement
        const behind = [...document.body.children].filter((child) => child !== outer)
        return {
          role: node.getAttribute('role') ?? '',
          modal: node.getAttribute('aria-modal') ?? '',
          name: heading?.textContent ?? '',
          // Named by the heading it shows, so the name and the visible title
          // cannot drift apart.
          named: heading !== null && node.contains(heading),
          // Focus moves into the dialog rather than being left on the control
          // that opened it, and nothing else can take it: every sibling of the
          // frame's own root is inert, so there is no trap to escape.
          focus: node.contains(document.activeElement),
          behind: behind.length > 0 && behind.every((child) => child instanceof HTMLElement && child.inert),
        }
      })
      const byName = await page.getByRole('dialog', { name: frame.name }).count()
      const findings = await rulesOn(page)
      await page.close()
      return [
        sheet.label,
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
    SHEETS.flatMap((sheet) =>
      (['Escape', 'mask'] as const).map(async (how) => {
        const page = await harness.open(fleet())
        await page.waitForSelector('[data-deeptail-shell]')
        await sheet.open(page)
        const dialog = page.locator(DIALOG)
        await dialog.waitFor({ state: 'visible' })
        // The mask covers the viewport and the dialog sits over its middle, so
        // the press lands on a corner of the mask rather than on the dialog.
        if (how === 'Escape') await page.keyboard.press('Escape')
        else await page.locator('.modal-mask').click({ position: { x: 4, y: 4 } })
        await dialog.waitFor({ state: 'detached' })
        const returned = await page.evaluate(
          (marker) =>
            document.activeElement instanceof HTMLElement &&
            document.activeElement.dataset['deeptailAction'] === marker,
          sheet.trigger,
        )
        await page.close()
        return [sheet.label, how, returned]
      }),
    ),
  )
  expect(dismissed).toEqual([
    ['new session', 'Escape', true],
    ['new session', 'mask', true],
    ['compose', 'Escape', true],
    ['compose', 'mask', true],
  ])
})

it('lands focus on a reachable control when the frame closed the drawer its trigger sat in', async () => {
  // At the reflow floor the frame dismisses the drawer it overlaps, which takes
  // the control that opened the sheet out of play with it. Focus cannot go back
  // there, so the frame owes the reader a control that can be reached rather
  // than leaving focus on the document.
  const page = await openedAtFloor()
  await page.locator(DRAWER).click()
  await page.locator(dataSelector('action', ACTIONS['session.message'].marker)).first().click()
  const dialog = page.locator(DIALOG)
  await dialog.waitFor({ state: 'visible' })
  await page.keyboard.press('Escape')
  await dialog.waitFor({ state: 'detached' })
  expect(
    await page.evaluate(() => {
      const active = document.activeElement
      if (!(active instanceof HTMLElement) || active === document.body) return 'nothing'
      return active.closest('[inert]') === null ? 'a reachable control' : 'something out of play'
    }),
  ).toBe('a reachable control')
  await page.close()
})

it('seats every dialog inside the reflow floor, with its actions reachable', async () => {
  // Both sheets, because they are built by different modules over one frame:
  // the containment lives in the frame, and a case that opened only one of them
  // would pass on a frame that had lost it for the other.
  const measured = await Promise.all(
    SHEETS.map(async (sheet) => {
      const page = await openedAtFloor()
      await sheet.open(page)
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
          // anything to scroll, so what leaves the screen is not merely out of
          // sight — there is no gesture that brings it back.
          documentScrolls: (scroller?.scrollHeight ?? 0) > (scroller?.clientHeight ?? 0),
        }
      })
      await page.close()
      // Nothing above the top of the screen, nothing below the bottom, the
      // action row wholly on screen, and the document itself never scrolling:
      // the dialog absorbs its own overflow rather than moving the shell under
      // a modal.
      return [
        sheet.label,
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

it('still reports a pane that scrolls inside the dialog body', async () => {
  // The nested-scroll rule stopped counting editable controls, so that a dialog
  // may both scroll and hold a text field. This is the shape that exclusion
  // must not have blinded it to — a pane of layout inside the body's scroller,
  // which is what this sheet shipped once before it was fixed by making the
  // dialog clip rather than scroll. The rule is clean here before anything is
  // planted, so what the case reports after is the pane it planted.
  const page = await openedAtFloor()
  await page.locator(dataSelector('action', ACTIONS['session.spawn'].marker)).click()
  await page.locator(DIALOG).waitFor({ state: 'visible' })
  expect(await rulesOn(page)).not.toContain('nested-scroll')
  // A stylesheet and a data attribute, not an inline style and not a class:
  // the class vocabulary is the shipped sheets, and a strange class would be
  // reported by a different rule than the one under test.
  await page.addStyleTag({ content: '[data-deeptail-probe="pane"] { overflow-y: auto; block-size: 20px; }' })
  await page.evaluate(() => {
    const pane = document.createElement('div')
    pane.dataset['deeptailProbe'] = 'pane'
    pane.dataset['deeptailDialogProbe'] = ''
    document.querySelector('.modal-body')?.append(pane)
  })
  const found = await defects(page)
  expect(found).toContain('nested-scroll')
  expect(found).toContain('which also scrolls')
  await page.close()
})

it('still reports two controls that overlap inside the dialog’s own scroller', async () => {
  // The overlap rule now measures painted boxes rather than laid-out ones, so a
  // control scrolled out of a pane no longer reads as covering what is drawn
  // where its rectangle falls. That narrowing must not reach a pair really
  // drawn over each other *inside* the pane — both painted, both reachable, one
  // unusable where they meet. The rule is clean here before anything is planted.
  const page = await openedAtFloor()
  await page.locator(dataSelector('action', ACTIONS['session.spawn'].marker)).click()
  await page.locator(DIALOG).waitFor({ state: 'visible' })
  expect(await rulesOn(page)).not.toContain('overlapping-targets')
  // Pinned to the top of the body's visible box, where the pane paints them
  // both: an overlap a reader meets, not one only the layout has.
  await page.addStyleTag({
    content:
      '[data-deeptail-dialog] .modal-body { position: relative; } [data-deeptail-dialog] .modal-body .input, [data-deeptail-dialog] .modal-body .select { position: absolute; inset-block-start: 0; inset-inline-start: 0; inline-size: 80px; block-size: 30px; margin: 0; }',
  })
  expect(await defects(page)).toContain('overlapping-targets')
  await page.close()
})

it('reports a dialog and an overlay built outside the frame, and drops them', async () => {
  const page = await openedAtFloor()
  expect(await rulesOn(page)).not.toContain('dialog-contract')
  expect(await rulesOn(page)).not.toContain('overlay-contract')
  // A dialog assembled where the frame is not, and a full-viewport layer no
  // frame owns: each is the second contract this rule exists to name, and
  // neither is reported by a rule engine while the promise its author did
  // remember keeps axe quiet.
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

/** The module that owns the dialog contract. */
const FRAME_MODULE = 'apps/deeptail/src/ui/modal.ts'

/** One module, as the frame scan reads it. */
interface ModuleSource {
  readonly label: string
  readonly text: string
}

/**
 * What a dialog frame is built out of, as source: the role, the two boxes it
 * draws and the platform's own dialog method. A module carrying any of these is
 * building the contract itself, whatever it names the rest of it.
 */
const FRAME_SHAPES: readonly RegExp[] = [
  /role:\s*['"](?:alert)?dialog['"]/u,
  /role=["'](?:alert)?dialog["']/u,
  /['"]modal-dialog['"]/u,
  /['"]modal-mask['"]/u,
  /\.showModal\(/u,
]

/**
 * Every module that builds a dialog frame, other than the one that owns it.
 * @param modules - the shipped modules to read.
 * @param frame - the module exempted, which is the frame's own.
 * @returns the labels that build a frame of their own.
 */
function outsideTheFrame(modules: readonly ModuleSource[], frame: string): readonly string[] {
  return modules
    .filter((module) => module.label !== frame)
    .filter((module) => FRAME_SHAPES.some((shape) => shape.test(module.text)))
    .map((module) => module.label)
}

/**
 * Every shipped module the frame scan reads. The built bundle is generated from
 * these, so the page's own output is covered by what it was built from.
 * @returns the modules and the entry document.
 */
async function shippedModules(): Promise<readonly ModuleSource[]> {
  const files = [
    ...repositoryFiles(['.ts']).filter((file) => file.label.startsWith('apps/deeptail/src/')),
    ...repositoryFiles(['.html']).filter((file) => file.label === 'apps/deeptail/index.html'),
  ]
  return Promise.all(files.map(async (file) => ({ label: file.label, text: await Bun.file(file.path).text() })))
}

it('builds every dialog in the product through the one module that owns the frame', async () => {
  const shipped = await shippedModules()
  // The scan is proven to see a frame before its silence means anything: with
  // the exemption pointed at a module nobody wrote, it names the shipped frame.
  expect(outsideTheFrame(shipped, 'apps/deeptail/src/ui/nowhere.ts')).toEqual([FRAME_MODULE])
  expect(outsideTheFrame(shipped, FRAME_MODULE)).toEqual([])
})

it('names a module that builds a frame of its own', () => {
  // The planted case for the scan above: source that builds the contract
  // anywhere else is what it exists to report, and a module writing an aria
  // state of its own — `src/ui/dom.ts` writes every one of them — is not a frame.
  const planted = "const sheet = el('div', { role: 'dialog', aria: { modal: 'true' } })"
  expect(outsideTheFrame([{ label: 'apps/deeptail/src/ui/rogue-sheet.ts', text: planted }], FRAME_MODULE)).toEqual([
    'apps/deeptail/src/ui/rogue-sheet.ts',
  ])
  const factory = "node.setAttribute('aria-modal', aria.modal)"
  expect(outsideTheFrame([{ label: 'apps/deeptail/src/ui/dom.ts', text: factory }], FRAME_MODULE)).toEqual([])
})
