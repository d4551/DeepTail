/**
 * The `a11y` audit, as the command line runs it.
 *
 * `tests/gate-programs.spec.ts` holds this for the gates that read the tree
 * rather than a page: the guard that decides whether any of the script runs,
 * the stream its report goes to, and the status the process exits under are
 * reachable from no import, so the program is run and what it said is read
 * back. The accessibility audit is that shape with a browser behind it, and is
 * driven the same way — which is also what makes the sentence the `a11y` script
 * prints a thing a process printed rather than a thing a case assembled.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { plannedArrangements } from '../../../scripts/a11y-audit.ts'
import { RULES_FLOOR } from '../../../scripts/a11y-report.ts'
import { AUDIT_RULES, EVERY_RULE, WCAG_RULES } from './audit.ts'
import { type Harness, startHarness } from './harness.ts'
import { openShell } from './surfaces.ts'

/** How long a whole audit may take, which is one browser page per arrangement. */
const BUDGET_MS = 180_000

/** The audit program, as the `a11y` script names it. */
const PROGRAM = new URL('../../../scripts/a11y-audit.ts', import.meta.url).pathname

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

/** What a finished run said. */
interface Said {
  readonly code: number
  readonly out: string
  readonly err: string
}

/**
 * Run the audit program and read back everything it said.
 * @returns its status and both of its streams.
 */
async function runAuditProgram(): Promise<Said> {
  const run = Bun.spawn([process.execPath, PROGRAM], { stdout: 'pipe', stderr: 'pipe' })
  const [out, err, code] = await Promise.all([
    new Response(run.stdout).text(),
    new Response(run.stderr).text(),
    run.exited,
  ])
  return { code, out, err }
}

it('prints the verdict on the output stream and exits nought when every surface it audits is clean', async () => {
  const said = await runAuditProgram()
  expect([said.code, said.err]).toEqual([0, ''])
  // Two lines that say what ran, and then the verdict — nothing after it, and
  // no other line that could be read as one.
  const lines = said.out.trimEnd().split('\n')
  expect(lines).toHaveLength(3)
  expect(lines[0]).toMatch(/^axe: [0-9]+ arrangements, [0-9]+ surfaces over [0-9]+ views, axe-core [0-9.]+$/u)
  expect(lines[0]).toContain(`${String(plannedArrangements().length)} arrangements`)
  expect(lines[1]).toContain('rules over every rule axe enables by default')
  expect(lines[1]).toContain('rules over the published WCAG 2.2 AA tags and axe best practice')
  expect(lines[2]).toBe('axe: no accessibility violations')
}, BUDGET_MS)

it('holds the audit to axe’s own default rule set and to the published tags, which do not nest', async () => {
  // Both selections, because selecting by tag reaches a rule axe ships off by
  // default (`target-size`, WCAG 2.2 SC 2.5.8) and the default set reaches
  // rules no tag here names. A run under either alone would be narrower than
  // the suites it stands behind, and would print the same sentence.
  expect(EVERY_RULE.tags).toBeUndefined()
  expect(WCAG_RULES.tags).toEqual(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
  expect([...AUDIT_RULES]).toEqual([EVERY_RULE, WCAG_RULES])
  const page = await openShell(harness)
  const evidence = await harness.auditEvidence(page, AUDIT_RULES)
  await page.close()
  expect(evidence.findings).toEqual([])
  expect(evidence.runs.map((run) => run.selection)).toEqual([EVERY_RULE.label, WCAG_RULES.label])
  // A selection that evaluated a handful of rules would answer "no violations"
  // just as quietly: what was run is part of what the answer is worth.
  expect(evidence.runs.filter((run) => run.rules < RULES_FLOOR)).toEqual([])
}, 60_000)
