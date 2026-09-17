/**
 * The accessibility audit every browser suite runs.
 *
 * Three modules, one question each: `audit-rules.ts` declares which of axe's
 * rules a caller may ask for, `audit-evidence.ts` declares what a run found and
 * how the passes over a page reduce to it, and this one is the pass itself —
 * axe over the page as it stands, at rest, and at each end of its scroll.
 *
 * Nothing here restates a rule in local code, so a page cannot be made to pass
 * by rewriting the check: the only way to clear a violation is to fix the
 * markup.
 *
 * @module
 */

import AxeBuilder from '@axe-core/playwright'
import type { Page } from 'playwright'
import { type AuditEvidence, type Pass, reduce, type SelectionRun, type Violation } from './audit-evidence.ts'
import { type RuleSelection, WCAG_RULES } from './audit-rules.ts'

/** Where each scroll container is put before a pass, as a fraction of its room. */
const SCROLL_POSITIONS = [0, 0.5, 1] as const

/** What axe reports for one rule, before it is reduced to a `Violation`. */
interface Finding {
  readonly id: string
  readonly impact?: string | null
  readonly help: string
  readonly nodes: { readonly html: string }[]
}

/**
 * Reduce one axe finding to what a failure message needs.
 * @param finding - the finding axe reported.
 * @returns the violation.
 */
function shape(finding: Finding): Violation {
  return {
    id: finding.id,
    impact: finding.impact ?? 'unknown',
    help: finding.help,
    nodes: finding.nodes.map((node) => node.html),
  }
}

/**
 * Run one selection over the page as it stands.
 * @param page - the page to audit.
 * @param selection - which of axe's rules to run.
 * @returns what this selection decided, what it could not, and what it ran over.
 */
async function runSelection(page: Page, selection: RuleSelection): Promise<SelectionRun> {
  const builder = new AxeBuilder({ page })
  const result = await (selection.tags === undefined ? builder : builder.withTags([...selection.tags])).analyze()
  return {
    selection: selection.label,
    // Every rule axe looked at, whether it passed, failed, could not decide, or
    // did not apply: a pass that looked at none of them proves nothing.
    rules: result.violations.length + result.incomplete.length + result.passes.length + result.inapplicable.length,
    engine: `${result.testEngine.name} ${result.testEngine.version}`,
    decided: result.violations.map(shape),
    undecided: result.incomplete.map(shape),
  }
}

/**
 * Run every selection over the page as it stands.
 *
 * One selection at a time, not all of them together: axe-core refuses a second
 * analysis on a page while one is still running — "Axe is already running. Use
 * `await axe.run()` to wait for the previous run to finish" — so two selections
 * started at once answered neither. Every case that reads both selections
 * failed on the engine's own refusal rather than on the page, which is a gate
 * reporting its own bookkeeping as an accessibility finding.
 *
 * So the walk settles one selection before it asks for the next, which is what
 * its shape says: a loop whose body awaits reads as work that could be started
 * together, and starting them together is the one thing this engine will not
 * take.
 * @param page - the page to audit.
 * @param selections - which of axe's rules to run.
 * @returns what each of them decided, what it could not, and what it ran over.
 */
async function auditInTurn(page: Page, selections: readonly RuleSelection[]): Promise<SelectionRun[]> {
  const [selection, ...rest] = selections
  if (selection === undefined) return []
  const run = await runSelection(page, selection)
  return [run, ...(await auditInTurn(page, rest))]
}

/**
 * Move every pane that overflows to one end of its scroll, or the middle.
 * @param page - the page to scroll.
 * @param at - 0 for the top, 1 for the bottom, 0.5 for halfway.
 * @returns whether anything on the page scrolls at all.
 */
function scrollPanes(page: Page, at: number): Promise<boolean> {
  return page.evaluate((position: number) => {
    let moved = false
    for (const node of document.querySelectorAll('*')) {
      if (!(node instanceof HTMLElement)) continue
      const room = node.scrollHeight - node.clientHeight
      if (room <= 1) continue
      const overflow = getComputedStyle(node).overflowY
      if (overflow !== 'auto' && overflow !== 'scroll') continue
      node.scrollTop = room * position
      moved = true
    }
    return moved
  }, at)
}

/**
 * Audit the page at one scroll position.
 * @param page - the page to audit.
 * @param at - where to put every pane that scrolls.
 * @param selections - which of axe's rules to run.
 * @returns what each selection decided, what it could not, and what it ran over.
 */
async function auditAt(page: Page, at: number, selections: readonly RuleSelection[]): Promise<Pass> {
  await scrollPanes(page, at)
  return auditInTurn(page, selections)
}

/**
 * Every accessibility finding on a page, and the evidence behind the answer.
 *
 * Both halves of what axe says are returned: what it decided against, and what
 * it could not decide at all. A caller that may not report a clean page unless
 * the run can be read — the `a11y` audit — reads `runs` and `engine` beside the
 * findings, because an empty list from a pass that ran nothing is not a clean
 * page.
 *
 * The passes are made in turn and each is a scroll the one before it has to
 * have finished, so they are stated in order rather than gathered.
 * @param page - the page to audit.
 * @param selections - which of axe's rules to run.
 * @returns the findings, and what they were found with.
 */
export async function auditEvidence(
  page: Page,
  selections: readonly RuleSelection[] = [WCAG_RULES],
): Promise<AuditEvidence> {
  const resting = await auditInTurn(page, selections)
  const [top, middle, bottom] = SCROLL_POSITIONS
  if (!(await scrollPanes(page, top))) return reduce([resting])
  const passes: readonly [Pass, Pass, Pass, Pass] = [
    resting,
    await auditAt(page, top, selections),
    await auditAt(page, middle, selections),
    await auditAt(page, bottom, selections),
  ]
  return reduce(passes)
}

/**
 * Every WCAG finding on a page.
 * @param page - the page to audit.
 * @param selections - which of axe's rules to run.
 * @returns the findings.
 */
export async function auditPage(
  page: Page,
  selections: readonly RuleSelection[] = [WCAG_RULES],
): Promise<readonly Violation[]> {
  return (await auditEvidence(page, selections)).findings
}
