/**
 * The doubles the structure-helper suites share: a finding collector and a
 * marked surface.
 *
 * Every check the page runs reports through one `Report` callback, and every
 * scope selector matches an element marked as a product surface. Both suites
 * build their markup from the same two pieces, so they read them from here
 * rather than carrying copies.
 *
 * @module
 */

import type { Report, StructureFinding } from '../apps/deeptail/tests/structure-report.ts'

/**
 * A finding collector, the way the page hands one to each check.
 * @returns the findings collected so far, and the report callback.
 */
export function collector(): { readonly findings: StructureFinding[]; readonly add: Report } {
  const findings: StructureFinding[] = []
  return {
    findings,
    add: (rule, detail) => {
      findings.push({ rule, detail })
    },
  }
}

/**
 * One element marked as a product surface, so a scope selector matches it.
 * @param tag - the tag to create.
 * @returns the marked element.
 */
export function surface(tag: string): HTMLElement {
  const node = document.createElement(tag)
  node.dataset.structureScope = ''
  return node
}
