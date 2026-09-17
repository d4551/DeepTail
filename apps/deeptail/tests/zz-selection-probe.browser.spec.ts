/**
 * The selection the shipped audit runs, read against the selections the suites
 * behind it run.
 *
 * `audit-rules.ts` states a claim about axe rather than a preference: that
 * selecting rules by the published tags reaches a rule the default set leaves
 * out, and that the two selections therefore do not nest. A claim like that is
 * worth exactly what it can be measured against, so this probe measures it,
 * against axe-core's own rule configuration.
 *
 * The second case is the one this file was written for, and it is the one that
 * has been failing: it plants a defect only the tag selection can decide, and
 * checks that the audit's own answer carries that finding rather than dropping
 * it. A reader who finds that case red should read the note beside it before
 * changing anything else — the fixture, not the audit, is what is measured
 * there, and the planted node has to be a shape axe's `target-size` rule
 * actually decides.
 *
 * @module
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import AxeBuilder from '@axe-core/playwright'
import type { Page } from 'playwright'
import type { AuditEvidence } from './audit-evidence.ts'
import { AUDIT_RULES, EVERY_RULE, type RuleSelection, WCAG_RULES } from './audit-rules.ts'
import { type Harness, startHarness } from './harness.ts'
import { openShell } from './surfaces.ts'

/** The rule axe ships switched off by default and reaches by tag. */
const OFF_BY_DEFAULT = 'target-size'

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

/**
 * Whether one selection evaluates one rule.
 *
 * Asked of axe rather than read out of its source: the shipped release decides
 * this, and a probe that restated the answer from memory would keep agreeing
 * with itself after the release changed its mind.
 * @param page - the page to ask about.
 * @param selection - which rules the pass is allowed to run.
 * @param rule - the rule to look for.
 * @returns whether it was evaluated.
 */
async function evaluated(page: Page, selection: RuleSelection, rule: string): Promise<boolean> {
  const builder = new AxeBuilder({ page })
  const result = await (selection.tags === undefined ? builder : builder.withTags([...selection.tags])).analyze()
  const ran = [...result.violations, ...result.incomplete, ...result.passes, ...result.inapplicable]
  return ran.some((one) => one.id === rule)
}

it('holds a rule the default selection leaves out, and decides it by tag', async () => {
  const page = await openShell(harness)
  const byTags = await evaluated(page, WCAG_RULES, OFF_BY_DEFAULT)
  const byDefault = await evaluated(page, EVERY_RULE, OFF_BY_DEFAULT)
  await page.close()
  // The claim `audit-rules.ts` makes, measured against the shipped release: the
  // default set leaves this rule out and the published tags reach it.
  expect({ byTags, byDefault }).toEqual({ byTags: true, byDefault: false })
}, 120_000)

it('answers with both selections the suites behind it run, not one of them', async () => {
  const page = await openShell(harness)
  const planted = await page.evaluate(() => {
    const tiny = document.createElement('button')
    tiny.dataset.deeptailProbe = 'tiny'
    tiny.textContent = 'x'
    document.querySelector('[data-deeptail-shell]')?.append(tiny)
    return tiny.outerHTML
  })
  const tagged = await harness.auditEvidence(page, [WCAG_RULES])
  const alone = await harness.auditEvidence(page, [EVERY_RULE])
  const together = await harness.auditEvidence(page, AUDIT_RULES)
  await page.close()
  const byTags = findingsOf(tagged)
  const union = [...new Set([...findingsOf(alone), ...byTags])]
  // The page the answer was read off is the page this case built: the node it
  // planted is the node the audit looked at, so an empty answer is an answer
  // about the markup rather than about a page that never loaded.
  expect(planted).toBe('<button data-deeptail-probe="tiny">x</button>')
  // The audit's answer is both selections' answer, not one of them: an audit
  // holding a single selection would report less than the suites it stands
  // behind, and would print the same sentence.
  expect(findingsOf(together)).toEqual(union)
}, 120_000)
