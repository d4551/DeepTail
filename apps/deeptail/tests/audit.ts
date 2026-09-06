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
 * What names one finding, so the same node under the same rule is one entry
 * however many passes report it.
 * @param finding - the violation to name.
 * @returns the key.
 */
function keyOf(finding: Violation): string {
  return `${finding.id}\n${finding.nodes.join('\n')}`
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
 * A pane that scrolls asks that question about its own content: axe samples an
 * element at its centre, and an element scrolled out of its pane has no centre
 * on screen to sample, so `color-contrast` comes back undecided for markup that
 * is perfectly legible once it is scrolled to. The page is therefore audited at
 * each end of its scroll and at the middle. Anything axe decides against at any
 * position is reported — the union, so this can only ever find more. Only a
 * finding it could not decide at *every* position is carried as undecided,
 * because that is a node no scroll position ever brings into view.
 *
 * The positions are walked one after another because each is a scroll the last
 * one has to have finished; a page with nothing to scroll is audited once.
 * @param page - the page to audit.
 * @returns the findings.
 */
export async function auditPage(page: Page): Promise<readonly Violation[]> {
  const resting = await auditOnce(page)
  if (!(await scrollPanes(page, SCROLL_POSITIONS[0]))) return [...resting.decided, ...resting.undecided]
  const top = await auditAt(page, SCROLL_POSITIONS[0])
  const middle = await auditAt(page, SCROLL_POSITIONS[1])
  const bottom = await auditAt(page, SCROLL_POSITIONS[2])
  const decided = new Map<string, Violation>()
  let undecided = new Map(resting.undecided.map((finding) => [keyOf(finding), finding]))
  for (const pass of [resting, top, middle, bottom]) {
    for (const finding of pass.decided) decided.set(keyOf(finding), finding)
    if (pass === resting) continue
    const seen = new Set(pass.undecided.map(keyOf))
    undecided = new Map([...undecided].filter(([id]) => seen.has(id)))
  }
  return [...decided.values(), ...undecided.values()]
}
