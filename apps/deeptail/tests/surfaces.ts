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
import { PHONE_VIEWPORT, TABLET_VIEWPORT } from './viewports.ts'

/** One width × palette the a11y suite must actually open, not merely list. */
const AUDIT_VIEWS = [
  { label: 'mobile light', mobile: true, dark: false, width: PHONE_VIEWPORT.width },
  { label: 'mobile dark', mobile: true, dark: true, width: PHONE_VIEWPORT.width },
  { label: 'tablet light', tablet: true, dark: false, width: TABLET_VIEWPORT.width },
  { label: 'tablet dark', tablet: true, dark: true, width: TABLET_VIEWPORT.width },
  { label: 'desktop light', dark: false, width: undefined },
  { label: 'desktop dark', dark: true, width: undefined },
] as const

/**
 * Render a violation set as a failure message a reader can act on.
 * @param violations - what axe reported.
 * @returns one line per offending node.
 */
export function describeViolations(violations: readonly Violation[]): string {
  return violations
    .map(
      (violation) => `${violation.id} (${violation.impact}): ${violation.help}\n    ${violation.nodes.join('\n    ')}`,
    )
    .join('\n  ')
}

/**
 * Audit the page as it stands and refuse any violation.
 *
 * One audit, one assertion, shared by every surface: the page each case has
 * arranged is measured exactly as the operator would meet it.
 * @param harness - the suite's browser harness, which owns the axe builder.
 * @param page - the page to audit, left open for the caller to dismiss.
 */
export async function expectNoViolations(harness: Harness, page: Page): Promise<void> {
  expect(describeViolations(await harness.audit(page))).toBe('')
}

/**
 * Audit one arranged surface at mobile, tablet and desktop, in both palettes.
 *
 * Tablet is opened through the harness (`tablet: true`), not by resizing a
 * desktop page: a resize would keep the fine pointer and the audit would
 * claim a width it never actually emulated.
 * @param harness - the suite's browser harness.
 * @param open - opens the surface under one view and leaves it ready to audit.
 */
/**
 * Open the drawer when this width seats the roster behind it.
 * @param page - the page showing the shell.
 */
export async function openDrawerIfPresent(page: Page): Promise<void> {
  const drawer = page.locator('[data-deeptail-action="drawer"]')
  if (await drawer.isVisible()) await drawer.click()
}

export async function expectNoViolationsAtEachWidth(
  harness: Harness,
  open: (view: { mobile?: boolean; tablet?: boolean; dark?: boolean }) => Promise<Page>,
): Promise<void> {
  const found: string[] = []
  const widths: number[] = []
  for (const view of AUDIT_VIEWS) {
    const page = await open(view)
    const size = page.viewportSize()?.width
    if (view.width !== undefined) expect(size).toBe(view.width)
    if (size !== undefined) widths.push(size)
    const violations = describeViolations(await harness.audit(page))
    if (violations !== '') found.push(`${view.label} (${String(size)}): ${violations}`)
    await page.close()
  }
  expect(widths).toContain(PHONE_VIEWPORT.width)
  expect(widths).toContain(TABLET_VIEWPORT.width)
  expect(found).toEqual([])
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
