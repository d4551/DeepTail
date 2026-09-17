/**
 * The arrangements the accessibility suites drive, and what they assert.
 *
 * Every surface in `a11y-surfaces.ts` is arranged the same way here — open it,
 * settle it at one designed width, audit it, close it — so the cases and the
 * `a11y` audit cannot drift on what was measured, and the audit's report can
 * name exactly which arrangements it made.
 *
 * @module
 */

import { expect } from 'bun:test'
import type { Page } from 'playwright'
import { type AuditedSurface, viewsOf } from './a11y-surfaces.ts'
import { type RuleRun, type RuleSelection, type Violation, WCAG_RULES } from './audit.ts'
import type { Harness } from './harness.ts'
import { type AuditView, describeViolations, realizeView } from './surfaces.ts'

/** Which arrangement an entry names: the surface, and the view it was opened at. */
export interface ArrangementKey {
  /** The surface, as `a11y-surfaces.ts` names it. */
  readonly surface: string
  /** The view's label, which carries its width and palette. */
  readonly view: string
  readonly width: number
  readonly height: number
}

/** One arrangement the audit made: what it opened, and what axe found there. */
export interface AuditedArrangement extends ArrangementKey {
  /** The box the page was showing when it was audited, or null when none was reported. */
  readonly realized: { readonly width: number; readonly height: number } | null
  /** Every finding: what axe decided against, and what it could not decide. */
  readonly findings: readonly Violation[]
  /** Every rule selection run over the page, and how many rules each evaluated. */
  readonly runs: readonly RuleRun[]
  /** The axe-core release that decided it. */
  readonly engine: string
}

/**
 * Audit one surface at one designed width.
 * @param harness - the suite's browser harness.
 * @param surface - the surface to arrange.
 * @param view - the width and palette to measure it under.
 * @param selections - which of axe's rules to run.
 * @returns what was opened, and what axe found there.
 */
export async function auditArrangement(
  harness: Harness,
  surface: AuditedSurface,
  view: AuditView,
  selections: readonly RuleSelection[] = [WCAG_RULES],
): Promise<AuditedArrangement> {
  const page = await surface.arrange(harness, view)
  await realizeView(page, view)
  const realized = page.viewportSize()
  const evidence = await harness.auditEvidence(page, selections)
  await page.close()
  return {
    surface: surface.name,
    view: view.label,
    width: view.width,
    height: view.height,
    realized,
    findings: evidence.findings,
    runs: evidence.runs,
    engine: evidence.engine,
  }
}

/**
 * Audit one surface at every designed width it exists on.
 *
 * The arrangements run together, each on its own page: a shared page would
 * measure one palette and claim both.
 * @param harness - the suite's browser harness.
 * @param surface - the surface to arrange.
 * @param selections - which of axe's rules to run.
 * @returns one entry per arrangement, in the order the views are declared.
 */
export async function auditSurfaceAtEachView(
  harness: Harness,
  surface: AuditedSurface,
  selections: readonly RuleSelection[] = [WCAG_RULES],
): Promise<readonly AuditedArrangement[]> {
  return Promise.all(viewsOf(surface).map((view) => auditArrangement(harness, surface, view, selections)))
}

/**
 * Audit every surface at every designed width it exists on.
 * @param harness - the suite's browser harness.
 * @param surfaces - the surfaces to arrange.
 * @param selections - which of axe's rules to run.
 * @returns one entry per arrangement, in the order the surfaces are declared.
 */
export async function auditSurfacesAtEachView(
  harness: Harness,
  surfaces: readonly AuditedSurface[],
  selections: readonly RuleSelection[] = [WCAG_RULES],
): Promise<readonly AuditedArrangement[]> {
  const audited = await Promise.all(surfaces.map((surface) => auditSurfaceAtEachView(harness, surface, selections)))
  return audited.flat()
}

/**
 * Expect one page to carry no violation.
 * @param harness - the suite's browser harness.
 * @param page - the page under audit.
 */
export async function expectNoViolations(harness: Harness, page: Page): Promise<void> {
  expect(describeViolations(await harness.audit(page))).toBe('')
}

/**
 * Expect one surface to carry no violation at any designed width, in either
 * palette, and to have been measured at each of them.
 *
 * The sizes are read back from the engine rather than taken from the fixture: a
 * view the harness failed to realize would otherwise be audited at the previous
 * width and report clean for a box nobody designed.
 * @param harness - the suite's browser harness.
 * @param surface - the surface to arrange and audit.
 */
export async function expectNoViolationsAtEachWidth(harness: Harness, surface: AuditedSurface): Promise<void> {
  const results = await auditSurfaceAtEachView(harness, surface)
  const realized = results.flatMap(({ view, realized: size }) =>
    size === null ? [] : [`${view} ${String(size.width)}x${String(size.height)}`],
  )
  expect(realized.toSorted()).toEqual(
    viewsOf(surface)
      .map((view) => `${view.label} ${String(view.width)}x${String(view.height)}`)
      .toSorted(),
  )
  const found = results
    .filter(({ findings }) => findings.length > 0)
    .map(({ view, width, findings }) => `${view} (${String(width)}): ${describeViolations(findings)}`)
  expect(found).toEqual([])
}
