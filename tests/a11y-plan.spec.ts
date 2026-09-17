/**
 * The arrangements the accessibility audit sets out to make.
 *
 * `scripts/a11y-audit.ts` prints its verdict only when every arrangement it
 * planned was made, so the plan is the audit's denominator: a surface dropped
 * from the plan is a surface the run never opens and never reports, while the
 * sentence it prints stays true. The plan is read here against the surface list
 * that declares what exists and the view list that declares where each is
 * designed to exist, so the three cannot drift.
 *
 * The audit itself is driven in `a11y-audit.browser.spec.ts`, which opens a real
 * browser. What is judged here is the part a mutation run can judge: the plan
 * the run is held to, read without opening anything.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { AUDITED_SURFACES, viewsOf } from '../apps/deeptail/tests/a11y-surfaces.ts'
import { AUDIT_VIEWS, type AuditView } from '../apps/deeptail/tests/surfaces.ts'
import { plannedArrangements } from '../scripts/a11y-audit.ts'

/**
 * The designed view one label names.
 * @param label - the label a plan entry carries.
 * @returns the view, refused when no designed view is called that.
 */
function viewNamed(label: string): AuditView {
  const found = AUDIT_VIEWS.find((view) => view.label === label)
  if (found === undefined) throw new Error(`deeptail: no designed view is called ${label}`)
  return found
}

describe('the arrangements the audit plans', () => {
  it('plans one arrangement for each surface at each view that surface exists on', () => {
    const plan = plannedArrangements()
    const expected = AUDITED_SURFACES.reduce((count, surface) => count + viewsOf(surface).length, 0)
    expect(plan.length).toBe(expected)
    // A plan of one arrangement per surface would reach this same count only if
    // each surface existed at one view, and the designed set is both palettes at
    // every width — so the multiplication is what this holds.
    expect(expected).toBeGreaterThan(AUDITED_SURFACES.length)
  })

  it('names the first surface first, at the first designed view, carrying that view’s box', () => {
    const [surface] = AUDITED_SURFACES
    const [view] = AUDIT_VIEWS
    const [first] = plannedArrangements()
    if (surface === undefined || view === undefined || first === undefined) {
      throw new Error('deeptail: the surface list or the designed view list states nothing to arrange')
    }
    expect(first).toEqual({ surface: surface.name, view: view.label, width: view.width, height: view.height })
  })

  it('carries the surface, the view label and the box of the view it names, and nothing else', () => {
    for (const planned of plannedArrangements()) {
      const view = viewNamed(planned.view)
      expect([planned.view, planned.width]).toEqual([view.label, view.width])
      expect(planned.height).toBe(view.height)
      expect(Object.keys(planned).toSorted()).toEqual(['height', 'surface', 'view', 'width'])
    }
  })

  it('keeps each surface’s arrangements together, in the order the surface list declares them', () => {
    const order = [...new Set(plannedArrangements().map((planned) => planned.surface))]
    expect(order).toEqual(AUDITED_SURFACES.map((surface) => surface.name))
  })

  it('plans a surface limited to one kind of view at that kind of view alone, and at all of them', () => {
    const limited = AUDITED_SURFACES.find((surface) => surface.only !== undefined)
    if (limited === undefined) throw new Error('deeptail: no surface states a kind of view it is limited to')
    const admits = limited.only
    if (admits === undefined) throw new Error('deeptail: the limited surface states no kind of view')
    const planned = plannedArrangements().filter((one) => one.surface === limited.name)
    const designed = AUDIT_VIEWS.filter((view) => admits(view)).map((view) => view.label)
    expect(planned.map((one) => one.view)).toEqual(designed)
    // A filter that admitted everything, or nothing, would answer the line above
    // for a different reason than the one this case is about.
    expect(planned.length).toBeGreaterThan(0)
    expect(planned.length).toBeLessThan(AUDIT_VIEWS.length)
  })
})
