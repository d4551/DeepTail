/**
 * The accessibility audit every browser suite runs.
 *
 * Split from `harness.ts` so the harness is the browser and the bundle, and
 * this is the one place that decides what "no violations" means.
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

/** The conformance tags every surface is held to. */
const AUDIT_TAGS = [...WCAG_TAGS, 'best-practice'] as const

/** Where each scroll container is put before a pass, as a fraction of its room. */
const SCROLL_POSITIONS = [0, 0.5, 1] as const

/** One accessibility violation, reduced to what a failure message needs. */
export interface Violation {
  readonly id: string
  readonly impact: string
  readonly help: string
  readonly nodes: readonly string[]
}

/** What one axe pass decided, and what it could not decide. */
interface Pass {
  readonly decided: Violation[]
  readonly undecided: Violation[]
}

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
 * Run axe once over the page as it stands.
 * @param page - the page to audit.
 * @returns what this pass decided and what it could not.
 */
async function auditOnce(page: Page): Promise<Pass> {
  const result = await new AxeBuilder({ page }).withTags([...AUDIT_TAGS]).analyze()
  return { decided: result.violations.map(shape), undecided: result.incomplete.map(shape) }
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
 * @returns what that pass decided and what it could not.
 */
async function auditAt(page: Page, at: number): Promise<Pass> {
  await scrollPanes(page, at)
  return auditOnce(page)
}

/**
 * Every WCAG finding on a page: what axe decided against, and what it could not
 * decide at all.
 *
 * Both are returned. An undecided finding is not a pass — it is a question the
 * markup left open, and the answer is to write markup axe can decide about.
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
 * The positions are walked one after another because each is a scroll the last
 * one has to have finished; a page with nothing to scroll is audited once.
 * @param page - the page to audit.
 * @returns the findings.
 */
export async function auditPage(page: Page): Promise<readonly Violation[]> {
  const resting = await auditOnce(page)
  if (!(await scrollPanes(page, SCROLL_POSITIONS[0]))) return [...resting.decided, ...resting.undecided]
  const passes = [resting, await auditAt(page, 0), await auditAt(page, 0.5), await auditAt(page, 1)]
  const decided = new Map<string, Violation>()
  let undecided: Map<string, Violation> | undefined
  for (const pass of passes) {
    for (const finding of pass.decided.flatMap((one) => perNode(one))) {
      decided.set(keyOf(finding.id, finding.nodes[0] ?? ''), finding)
    }
    const open = new Map(
      pass.undecided.flatMap((one) => perNode(one)).map((one) => [keyOf(one.id, one.nodes[0] ?? ''), one] as const),
    )
    // Every node this pass could not decide, kept only while every earlier pass
    // could not decide it either.
    undecided = undecided === undefined ? open : new Map([...undecided].filter(([id]) => open.has(id)))
  }
  return [...decided.values(), ...(undecided?.values() ?? [])]
}
