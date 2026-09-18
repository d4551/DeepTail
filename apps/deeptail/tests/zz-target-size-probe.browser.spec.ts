/**
 * What the audit reports, held to what axe itself reports for the same rules.
 *
 * A selection's answer is axe's answer: the driver may not add a finding, and
 * may not swallow one. That is a property of the audit rather than of any one
 * page, so it is read here against a control planted into the shipped shell,
 * with the same selection asked of axe directly and of `auditEvidence`.
 *
 * The rule the two selections disagree about is `target-size` — WCAG 2.2 SC
 * 2.5.8 — which the published tags enable and axe's default set leaves switched
 * off. Which way axe decides it on any one control is axe's business; that the
 * tag selection reaches it at all, and that the audit reports exactly what axe
 * decided, is what these cases hold.
 *
 * @module
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import AxeBuilder from '@axe-core/playwright'
import { WCAG_RULES, WCAG_TAGS } from './audit-rules.ts'
import { type Harness, startHarness } from './harness.ts'
import { openShell } from './surfaces.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('reports what axe reports for the selection it was asked for, neither more nor less', async () => {
  const page = await openShell(harness)
  await page.evaluate(() => {
    const tiny = document.createElement('button')
    tiny.dataset['deeptailProbe'] = 'tiny'
    tiny.textContent = 'x'
    document.querySelector('[data-deeptail-shell]')?.append(tiny)
  })
  const planted = await page.locator('[data-deeptail-probe="tiny"]').count()
  const direct = await new AxeBuilder({ page }).withTags([...WCAG_TAGS, 'best-practice']).analyze()
  const audited = await harness.auditEvidence(page, [WCAG_RULES])
  await page.close()

  // The control is there, and the tag selection reaches the one rule the
  // default set leaves out: a selection that quietly ran the default set would
  // answer "no violations" over this page without ever reading the rule.
  expect(planted).toBe(1)
  expect(direct.passes.some((rule) => rule.id === 'target-size')).toBe(true)
  // Every violation axe reported for that selection is one the audit reports.
  // The audit walks more positions than this one pass does, so its answer may
  // hold more; it may not hold less.
  expect(
    direct.violations.map((rule) => rule.id).filter((id) => !audited.findings.some((one) => one.id === id)),
  ).toEqual([])
  // And a control axe decided in favour of is one the audit decides nothing
  // against, whatever axe's reasons for the control's box.
  expect(audited.findings.filter((finding) => finding.id === 'target-size')).toEqual([])
}, 60_000)
