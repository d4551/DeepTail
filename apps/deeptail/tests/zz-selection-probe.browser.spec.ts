/**
 * The selection the shipped audit runs, read against the selections the suites
 * behind it run.
 *
 * A surface audited under one tag set and a surface audited under the whole
 * default set answer different questions, and an audit that silently ran one of
 * them would print the same clean sentence either way. This probe plants a
 * defect that one selection can see and checks that the audit's own answer is
 * both selections' answer rather than one of them.
 *
 * @module
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import type { AuditEvidence } from './audit-evidence.ts'
import { AUDIT_RULES, EVERY_RULE, WCAG_RULES } from './audit-rules.ts'
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
 * One evidence record's findings, as the lines an audit prints.
 * @param evidence - what the audit returned.
 * @returns one line per finding, in the order axe reported them.
 */
function findingsOf(evidence: AuditEvidence): string[] {
  return evidence.findings.map((violation) => `${violation.id}: ${violation.nodes.join(', ')}`)
}

it('answers with both selections the suites behind it run, not one of them', async () => {
  const page = await openShell(harness)
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
  for (const finding of byTags) expect(findingsOf(together)).toContain(finding)
  expect(findingsOf(together)).toEqual([...new Set([...findingsOf(alone), ...findingsOf(tagged)])].toSorted())
}, 120_000)
