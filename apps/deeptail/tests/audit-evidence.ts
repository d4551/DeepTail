/**
 * What one audit found, what it ran to find it, and how the passes over a page
 * reduce to it.
 *
 * A finding list alone is not evidence: a pass that evaluated no rule at all
 * reports nothing, and reads the same as a pass that evaluated every rule. So
 * the record below keeps the runs beside the findings, and this module is where
 * the passes over one page are reduced into it.
 *
 * The reduction is the half that has to be read rather than trusted. On a page
 * that scrolls, "undecided" means something weaker than it does elsewhere, and
 * `reduce` states what it does about that rather than leaving it implied.
 *
 * @module
 */

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
export interface SelectionRun {
  readonly selection: string
  readonly rules: number
  readonly engine: string
  readonly decided: Violation[]
  readonly undecided: Violation[]
}

/** What every selection over one page decided, at one scroll position. */
export type Pass = readonly SelectionRun[]

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
export function reduce(passes: readonly [Pass, ...Pass[]]): AuditEvidence {
  const [lead] = passes
  const [firstRun] = lead
  // A pass that ran no selection at all is refused here rather than answered
  // for: the evidence would name an engine nothing ran on, and every finding
  // list below it would be the empty list a page with no violations also
  // reports.
  if (firstRun === undefined) throw new Error('deeptail: the audit ran no rule selection')
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
    runs: lead.map((run) => ({ selection: run.selection, rules: rulesOf(passes, run.selection) })),
    engine: firstRun.engine,
  }
}
