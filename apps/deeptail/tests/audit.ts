/**
 * The accessibility audit every browser suite runs.
 *
 * Split from `harness.ts` so the harness is the browser and the bundle, and
 * this is the one place that decides what "no violations" means, which rules
 * were run to decide it, and what the run is evidence of.
 *
 * @module
 */

import AxeBuilder from '@axe-core/playwright'
import type { Page } from 'playwright'

/**
 * The published WCAG 2.2 AA tag set axe-core documents for `@axe-core/playwright`.
 * `best-practice` is extra strictness on top of that set, not a substitute for it.
 */
export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] as const

/**
 * Which of axe's rules a pass is asked to run.
 *
 * Stated rather than assumed, because a pass over a chosen subset of the rules
 * and a pass over all of them both answer "no violations", and only one of
 * those answers is worth repeating in a report. `label` is what a report says
 * it ran.
 */
export interface RuleSelection {
  /** The tags every rule must carry, or nothing for every rule axe enables by default. */
  readonly tags?: readonly string[]
  /** What the selection is called where a report names it. */
  readonly label: string
}

/** The conformance tags every surface is held to, beside axe's own best practice. */
export const WCAG_RULES: RuleSelection = {
  tags: [...WCAG_TAGS, 'best-practice'],
  label: 'the published WCAG 2.2 AA tags and axe best practice',
}

/**
 * Every rule axe enables by default: no tag filter and no severity filter.
 */
export const EVERY_RULE: RuleSelection = { label: 'every rule axe enables by default' }

/**
 * The rules the `a11y` audit holds every surface to.
 *
 * Both selections, because they are not nested. Selecting rules by tag reaches
 * a rule axe ships switched off by default — `target-size`, which is WCAG 2.2
 * SC 2.5.8 — and a pass over the default set reaches rules no tag here names;
 * measured against axe-core 4.13.0 on the shell, the default set evaluated 89
 * rules and the published tags 90, the tags naming the one the default set
 * leaves out. An audit that ran either alone would be narrower than the suites
 * it stands behind, and `a11y-audit.browser.spec.ts` holds the pair to it.
 */
export const AUDIT_RULES: readonly RuleSelection[] = [EVERY_RULE, WCAG_RULES]

/** Where each scroll container is put before a pass, as a fraction of its room. */
const SCROLL_POSITIONS = [0, 0.5, 1] as const

/** One accessibility violation, reduced to what a failure message needs. */
export interface Violation {
  readonly id: string
  readonly impact: string
  readonly help: string
  readonly nodes: readonly string[]
}

/** One rule selection, and how many rules it evaluated. */
export interface RuleRun {
  /** Which selection it was. */
  readonly selection: string
  /** How many rules axe evaluated, which is nought when nothing ran. */
  readonly rules: number
}

/**
 * What one audit found, and what it ran to find it.
 *
 * A finding list alone is not evidence: a pass that evaluated no rule at all
 * reports nothing, and reads the same as a pass that evaluated every rule.
 */
export interface AuditEvidence {
  /**
   * Every finding: what axe decided against, and what it could not decide at all.
   *
   * An undecided finding is not a pass — it is a question the markup left open,
   * and the answer is to write markup axe can decide about.
   */
  readonly findings: readonly Violation[]
  /** Every rule selection the audit ran, and how many rules each evaluated. */
  readonly runs: readonly RuleRun[]
  /** The axe-core release that decided it. */
  readonly engine: string
}

/** What one selection over one page decided, and what it ran over. */
interface SelectionRun {
  readonly selection: string
  readonly rules: number
  readonly engine: string
  readonly decided: Violation[]
  readonly undecided: Violation[]
}

/** What every selection over one page decided, at one scroll position. */
type Pass = readonly SelectionRun[]

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
 * One rule against one node, which is the unit a pass can agree or disagree
 * about.
 *
 * Naming a finding by its whole node list instead was the bug that made this
 * mechanism a lie: axe groups every node a rule fired on into one finding, the
 * group changes the moment a pane scrolls, so no two passes ever produced the
 * same name and the intersection below was empty by construction — which
 * deleted the undecided half of this gate for every page that scrolls, rather
 * than carrying forward what no position could decide.
 * @param id - the rule.
 * @param node - one node's markup, as axe serialised it.
 * @returns the key.
 */
function keyOf(id: string, node: string): string {
  return `${id}\n${node}`
}

/**
 * Split one finding into one entry per node it names.
 * @param finding - the finding axe reported.
 * @returns one single-node violation per node.
 */
function perNode(finding: Violation): Violation[] {
  return finding.nodes.map((node) => ({ ...finding, nodes: [node] }))
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
 * @param page - the page to audit.
 * @param selections - which of axe's rules to run.
 * @returns what each of them decided, what it could not, and what it ran over.
 */
async function auditOnce(page: Page, selections: readonly RuleSelection[]): Promise<Pass> {
  return await Promise.all(selections.map((selection) => runSelection(page, selection)))
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
  return auditOnce(page, selections)
}

/**
 * The most rules one selection evaluated across the passes.
 * @param passes - the passes over the page, at least one.
 * @param selection - the selection to count.
 * @returns its rule count, nought when it was never run.
 */
function rulesOf(passes: readonly [Pass, ...Pass[]], selection: string): number {
  let rules = 0
  for (const pass of passes) {
    for (const run of pass) {
      if (run.selection === selection) rules = Math.max(rules, run.rules)
    }
  }
  return rules
}

/**
 * Reduce the passes over one page into what the page is answerable for.
 *
 * On a page that scrolls, "undecided" means something weaker than it does
 * elsewhere, and this says so rather than leaving it implied. axe samples an
 * element at its centre; an element scrolled out of its pane has no centre on
 * screen, so `color-contrast` comes back undecided for markup that is legible
 * the moment it is scrolled to — and axe reads the part sticking out of a
 * clipping pane as "obscured" by whatever is painted there, which is the same
 * laid-out-versus-painted confusion the overlap rule had. So the page is
 * audited at rest, at each end of its scroll and at the middle:
 *
 * - a node axe decides against at ANY position is reported. This is a union,
 *   so it can only ever find more than one pass would.
 * - a node axe cannot decide at EVERY position is reported as undecided. A
 *   node it decided at some position is one the markup answered for; the
 *   silence at the others is the pane, not the markup.
 *
 * That is a real weakening of the second half, and `audit.browser.spec.ts`
 * holds it to it: a node no position can decide must still be reported, which
 * is the case that fails if this ever collapses to reporting nothing.
 *
 * Every selection is reduced the same way, and their findings are unioned: the
 * selections do not nest, so neither one alone is the page's answer.
 *
 * The positions are walked one after another because each is a scroll the last
 * one has to have finished; a page with nothing to scroll is audited once.
 * @param passes - the passes over the page, at least one.
 * @returns the findings, and what the passes ran over.
 */
function reduce(passes: readonly [Pass, ...Pass[]]): AuditEvidence {
  const decided = new Map<string, Violation>()
  // Seeded from the first pass rather than left absent: the passes always hold
  // an entry, so a branch for "no pass has been seen yet" could never be taken
  // and would read as a state this can be in.
  let undecided = new Map<string, Violation>()
  for (const [index, pass] of passes.entries()) {
    for (const finding of pass.flatMap((run) => run.decided.flatMap((one) => perNode(one)))) {
      decided.set(keyOf(finding.id, finding.nodes[0] ?? ''), finding)
    }
    const open = new Map(
      pass
        .flatMap((run) => run.undecided.flatMap((one) => perNode(one)))
        .map((one) => [keyOf(one.id, one.nodes[0] ?? ''), one] as const),
    )
    // Every node this pass could not decide, kept only while every earlier pass
    // could not decide it either.
    undecided = index === 0 ? open : new Map([...undecided].filter(([id]) => open.has(id)))
  }
  // The selections are the same on every pass, so the first pass names them and
  // the count is the largest one any pass reached.
  return {
    findings: [...decided.values(), ...undecided.values()],
    runs: passes[0].map((run) => ({ selection: run.selection, rules: rulesOf(passes, run.selection) })),
    engine: passes[0][0].engine,
  }
}

/**
 * Every accessibility finding on a page, and the evidence behind the answer.
 *
 * Both halves of what axe says are returned: what it decided against, and what
 * it could not decide at all. A caller that may not report a clean page unless
 * the run can be read — the `a11y` audit — reads `runs` and `engine` beside the
 * findings, because an empty list from a pass that ran nothing is not a clean
 * page.
 * @param page - the page to audit.
 * @param selections - which of axe's rules to run.
 * @returns the findings, and what they were found with.
 */
export async function auditEvidence(
  page: Page,
  selections: readonly RuleSelection[] = [WCAG_RULES],
): Promise<AuditEvidence> {
  const resting = await auditOnce(page, selections)
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
