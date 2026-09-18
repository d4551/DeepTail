/**
 * The case both accessibility suites register for every surface they audit.
 *
 * `a11y.browser.spec.ts` registers it over the surfaces the product shows, and
 * `a11y-errors.browser.spec.ts` over the refusals it reports. The case, the
 * name it is registered under, and the budget it runs within are one thing
 * here, so neither suite can stand behind a weaker case than the other.
 *
 * The body is built by a helper that takes the surface as an argument rather
 * than written where the registration happens: a case written inside the walk
 * over the surfaces closes over the surface the walk is moving on, which is the
 * shape the loop-function rule refuses.
 *
 * @module
 */

import { it } from 'bun:test'
import { expectNoViolationsAtEachWidth } from './a11y-audit.ts'
import type { AuditedSurface } from './a11y-surfaces.ts'
import type { Harness } from './harness.ts'

/** How long one surface's case may run: one browser page per designed width. */
const CASE_BUDGET_MS = 60_000

/**
 * The body of one surface's case.
 *
 * The harness is read when the case runs rather than closed over: a suite
 * starts it in `beforeAll`, which runs after every case has been registered.
 * @param harnessAt - reads the suite's harness.
 * @param surface - the surface the case arranges and audits.
 * @returns the case body.
 */
function caseBody(harnessAt: () => Harness, surface: AuditedSurface): () => Promise<void> {
  return () => expectNoViolationsAtEachWidth(harnessAt(), surface)
}

/**
 * Register one case per surface: no WCAG violation at any designed width it
 * exists on, in either palette.
 * @param surfaces - the surfaces to register a case for.
 * @param harnessAt - reads the suite's harness.
 */
export function casesOverEachSurface(surfaces: readonly AuditedSurface[], harnessAt: () => Harness): void {
  for (const surface of surfaces) {
    it(
      `has no WCAG violations on ${surface.name} at every designed width, in both palettes`,
      caseBody(harnessAt, surface),
      CASE_BUDGET_MS,
    )
  }
}
