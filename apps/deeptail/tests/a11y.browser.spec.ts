/**
 * WCAG 2.2 AA conformance over every surface the product shows.
 *
 * The rules are axe-core's published set, run against the real built bundle in
 * Chromium. Nothing here restates a rule in local code, so a surface cannot be
 * made to pass by rewriting the check: the only way to clear a violation is to
 * fix the markup.
 *
 * The surfaces are named and arranged in `a11y-surfaces.ts`, which is the same
 * list the `a11y` script audits under every rule axe enables, so a surface
 * cannot be asserted here and absent from that audit.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { expectNoViolations, expectNoViolationsAtEachWidth } from './a11y-audit.ts'
import { SHOWN_SURFACES } from './a11y-surfaces.ts'
import { type Harness, startHarness, WCAG_TAGS } from './harness.ts'
import { describeViolations, openShell } from './surfaces.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

for (const surface of SHOWN_SURFACES) {
  it(`has no WCAG violations on ${surface.name} at every designed width, in both palettes`, async () => {
    await expectNoViolationsAtEachWidth(harness, surface)
  }, 180_000)
}

it('keeps a level-one heading on the shell before the drawer is opened', async () => {
  // The phone layout hides the sidebar, so the page's one heading must live in
  // the main header: a page whose only heading vanishes with the layout has
  // none at all once the drawer closes. axe flags this as page-has-heading-one;
  // asserting it directly names the element the rule is about.
  const page = await openShell(harness, {}, { mobile: true })
  const headings = page.locator('.main-header h1')
  expect(await headings.count()).toBe(1)
  expect(await headings.first().evaluate((node) => getComputedStyle(node).visibility)).toBe('visible')
  await page.close()
})

it('holds axe to the published WCAG 2.2 AA tags', () => {
  expect([...WCAG_TAGS]).toEqual(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
})

it('reports an unlabeled control as a WCAG violation', async () => {
  const page = await openShell(harness)
  await page.evaluate(() => {
    const button = document.createElement('button')
    button.dataset['deeptailProbe'] = 'unlabeled'
    document.querySelector('[data-deeptail-shell]')?.append(button)
  })
  const found = await harness.audit(page)
  expect(describeViolations(found)).not.toBe('')
  expect(found.some((violation) => violation.id === 'button-name')).toBe(true)
  await page.evaluate(() => document.querySelector('[data-deeptail-probe="unlabeled"]')?.remove())
  await expectNoViolations(harness, page)
  await page.close()
})
