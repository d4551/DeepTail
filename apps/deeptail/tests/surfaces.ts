/**
 * The page choreography every browser suite shares: open the shell over a
 * fixture, wait until it is showing, and — for the accessibility suite — audit
 * what is showing. One module, so the suites cannot drift on how a page is
 * opened or what "clean" means.
 *
 * @module
 */

import { expect } from 'bun:test'
import type { Page } from 'playwright'
import { fleet } from './fixtures.ts'
import type { Harness, Violation } from './harness.ts'
import { pointerFlags, VIEWPORTS, type Viewport } from './viewports.ts'

/** One designed width × palette the a11y suite must actually open, not merely list. */
export interface AuditView {
  readonly label: string
  readonly dark: boolean
  readonly width: number
  readonly height: number
  readonly mobile?: true
  readonly tablet?: true
}

/** Every `VIEWPORTS` row in both palettes. Tablet/phone keep a coarse pointer. */
export const AUDIT_VIEWS: readonly AuditView[] = VIEWPORTS.flatMap((viewport) =>
  ([false, true] as const).map((dark) => auditView(viewport, dark)),
)

/**
 * One designed width in one palette.
 * @param viewport - the designed width.
 * @param dark - whether the palette is the dark one.
 * @returns the row the audit opens.
 */
function auditView(viewport: Viewport, dark: boolean): AuditView {
  const label = `${viewport.label} ${dark ? 'dark' : 'light'}`
  const size = { label, dark, width: viewport.width, height: viewport.height }
  const pointer = pointerFlags(viewport)
  if (pointer.tablet === true) return { ...size, tablet: true }
  return pointer.mobile === true ? { ...size, mobile: true } : size
}

/**
 * Size the page to a designed width after opening with the matching pointer,
 * then let what is moving finish moving.
 *
 * Coarse rows open through `{ mobile: true }` / `{ tablet: true }` (hasTouch).
 *
 * The shell's drawer carries a transform transition, and a resize restarts
 * layout under it. An audit taken during one measures a frame no reader is
 * ever shown — a panel part-way across the viewport, and a colour axe samples
 * through whatever it is still sliding over, which is how a strip at eleven to
 * one was reported as failing contrast. Everything running is awaited first,
 * and then one frame, so what is audited is what a reader would be looking at.
 * A spinner never finishes and is not waited for.
 * @param page - the page just opened.
 * @param view - the width and height to realize.
 */
export async function realizeView(page: Page, view: AuditView): Promise<void> {
  await page.setViewportSize({ width: view.width, height: view.height })
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.allSettled([...document.getAnimations()].map((animation) => animation.finished))
    await page.evaluate()
  })
}

/**
 * Audit one page and describe every violation it carries.
 * @param harness - the suite's browser harness.
 * @param page - the page under audit.
 * @returns an empty string when the page is clean, otherwise one line per
 * violation, each naming the rule, the nodes and the fix axe suggests.
 */
export async function auditLines(harness: Harness, page: Page): Promise<string> {
  return describeViolations(await harness.audit(page))
}

/**
 * Expect one page to carry no WCAG violation.
 * @param harness - the suite's browser harness.
 * @param page - the page under audit.
 */
export async function expectNoViolations(harness: Harness, page: Page): Promise<void> {
  expect(describeViolations(await harness.audit(page))).toBe('')
}

/**
 * Describe every violation an audit found, one line each, or nothing.
 * @param violations - the violations axe reported.
 * @returns the report, empty when nothing was found.
 */
export function describeViolations(violations: readonly Violation[]): string {
  return violations
    .map(({ id, nodes }) => `${id}: ${nodes.map((node) => node.target.join(' ')).join(', ')}`)
    .join('\n')
}

/**
 * Open the drawer when this width seats the roster behind it.
 * @param page - the page showing the shell.
 */
export async function openDrawerIfPresent(page: Page): Promise<void> {
  const drawer = page.locator('[data-deeptail-action="drawer"]')
  if (await drawer.isVisible()) await drawer.click()
}

/**
 * Open the empty picker and drive it to its pairing form.
 *
 * The a11y suite audits this page and the error suite drives its refusal off
 * it, so the choreography is stated once here and neither suite can drift on
 * how the form is reached.
 * @param harness - the suite's browser harness.
 * @param view - the viewport and palette the case is measured under.
 * @returns the page, showing the pairing form.
 */
export async function openPairingForm(harness: Harness, view: AuditView): Promise<Page> {
  const page = await harness.open({ hosts: [] }, view)
  await page.waitForSelector('[data-deeptail-picker]')
  await page.getByRole('button', { name: 'Pair a host' }).click()
  await page.locator('[data-deeptail-field="link"]').waitFor({ state: 'visible' })
  return page
}

/**
 * Audit one arranged surface at mobile, tablet and desktop, in both palettes.
 * @param harness - the suite's browser harness.
 * @param open - opens the surface under one view and leaves it ready to audit.
 */
export async function expectNoViolationsAtEachWidth(
  harness: Harness,
  open: (view: AuditView) => Promise<Page>,
): Promise<void> {
  const results = await Promise.all(
    AUDIT_VIEWS.map(async (view) => {
      const page = await open(view)
      await realizeView(page, view)
      const size = page.viewportSize()
      const violations = describeViolations(await harness.audit(page))
      await page.close()
      return { label: view.label, size, violations }
    }),
  )
  const realized = results.flatMap((result) =>
    result.size === null || result.size === undefined
      ? []
      : [`${result.label} ${String(result.size.width)}x${String(result.size.height)}`],
  )
  const found = results
    .filter((result) => result.violations !== '')
    .map((result) => `${result.label} (${String(result.size?.width)}): ${result.violations}`)
  expect(realized.toSorted()).toEqual(
    AUDIT_VIEWS.map((view) => `${view.label} ${String(view.width)}x${String(view.height)}`).toSorted(),
  )
  expect(found).toEqual([])
}

/**
 * Audit one driven surface at every designed width, in both palettes.
 *
 * The shell is opened over the fixture with the roster shown, the case drives
 * it to the state under audit, and what is showing is audited and closed. The
 * open-drive-audit shape is stated once here; a case contributes only the
 * fixture and the driving it needs.
 * @param harness - the suite's browser harness.
 * @param fixture - the registry the page boots against.
 * @param drive - drives the opened page to the state under audit, under the
 * view it is being opened for.
 */
export async function auditShellAtEachWidth(
  harness: Harness,
  fixture: Parameters<typeof fleet>[0],
  drive: (page: Page, view: AuditView) => Promise<void>,
): Promise<void> {
  await expectNoViolationsAtEachWidth(harness, async (view) => {
    const page = await openShellWithDrawer(harness, fixture, view)
    await drive(page, view)
    return page
  })
}

/**
 * Open the shell over a fleet fixture and wait until it is showing.
 * @param harness - the suite's browser harness.
 * @param fixture - the registry the page boots against.
 * @param view - the viewport and palette the case is measured under.
 * @returns the page, showing the shell.
 */
export async function openShell(
  harness: Harness,
  fixture: Parameters<typeof fleet>[0] = {},
  view?: Parameters<Harness['open']>[1],
): Promise<Page> {
  const page = await harness.open(fleet(fixture), view)
  await page.waitForSelector('[data-deeptail-shell]')
  return page
}

/**
 * Open the shell and show the roster, which on phone and tablet widths means
 * opening the drawer that seats it. Every suite that drives the shell with the
 * roster visible goes through `auditShellAtEachWidth`, which opens through
 * here; the shell suites that arrange one width at a time open through
 * `openShell` and call `openDrawerIfPresent` themselves.
 * @param harness - the suite's browser harness.
 * @param fixture - the registry the page boots against.
 * @param view - the viewport and palette the case is measured under.
 * @returns the page, showing the shell with the roster visible.
 */
async function openShellWithDrawer(
  harness: Harness,
  fixture: Parameters<typeof fleet>[0] = {},
  view?: Parameters<Harness['open']>[1],
): Promise<Page> {
  const page = await openShell(harness, fixture, view)
  await openDrawerIfPresent(page)
  return page
}

/**
 * Open the shell at one designed width with that width's pointer.
 * @param harness - the suite's browser harness.
 * @param viewport - the designed width.
 * @param fixture - the registry the page boots against.
 * @param extra - palette and writing-direction overrides.
 */
export async function openShellAt(
  harness: Harness,
  viewport: Viewport,
  fixture: Parameters<typeof fleet>[0] = {},
  extra?: Parameters<Harness['open']>[1],
): Promise<Page> {
  const page = await harness.open(fleet(fixture), { ...extra, ...pointerFlags(viewport) })
  await page.waitForSelector('[data-deeptail-shell]')
  await realizeView(page, viewport)
  return page
}
