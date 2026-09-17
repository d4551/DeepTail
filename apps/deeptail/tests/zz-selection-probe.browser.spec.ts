/**
 * The two rule selections the audit runs, on a page carrying a defect they do
 * not agree about.
 *
 * axe's default rule set and the published WCAG tags are not nested: selecting
 * rules by tag reaches `target-size`, which is WCAG 2.2 SC 2.5.8 and which axe
 * ships switched off by default, and a run over the default set reaches rules
 * no tag here names. The audit therefore runs both and reports their findings
 * together, and this case holds it to that: the page below carries a target
 * below the 2.5.8 floor, and the audit's answer has to reach it.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { AUDIT_RULES, type AuditEvidence, EVERY_RULE, WCAG_RULES } from './audit.ts'
import { type Harness, startHarness } from './harness.ts'
import { openShell } from './surfaces.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

/**
 * Every finding one audit made, as one line per node.
 * @param evidence - what the audit found.
 * @returns the findings, one line each, in a stable order.
 */
function findingsOf(evidence: AuditEvidence): string[] {
  return evidence.findings
    .flatMap((finding) => finding.nodes.map((node) => `${finding.id}: ${node}`))
    .toSorted()
}

it('reaches a rule the default set alone leaves out, and reports both selections together', async () => {
  const page = await openShell(harness)
  // A pointer target below the floor SC 2.5.8 sets, at the smallest rung the
  // size scale carries: the shape the two selections disagree about, because
  // the tags reach `target-size` and the default set does not.
  await page.addStyleTag({
    content:
      '[data-deeptail-probe="tiny"] { inline-size: var(--dsh-space-1); block-size: var(--dsh-space-1); padding: 0; border: 0; }',
  })
  await page.evaluate(() => {
    const tiny = document.createElement('button')
    tiny.dataset['deeptailProbe'] = 'tiny'
    tiny.textContent = 'x'
    document.querySelector('[data-deeptail-shell]')?.append(tiny)
  })
  const tagged = await harness.auditEvidence(page, [WCAG_RULES])
  const alone = await harness.auditEvidence(page, [EVERY_RULE])
  const together = await harness.auditEvidence(page, AUDIT_RULES)
  await page.close()
  const byTags = findingsOf(tagged).filter((finding) => finding.startsWith('target-size:'))
  expect(byTags.length).toBeGreaterThan(0)
  // The audit's answer is both selections' answer, not one of them: an audit
  // holding a single selection would report less than the suites it stands
  // behind, and would print the same sentence.
  expect(findingsOf(together)).toContain(...byTags)
  expect(findingsOf(together)).toEqual([...new Set([...findingsOf(alone), ...findingsOf(tagged)])].toSorted())
}, 120_000)
