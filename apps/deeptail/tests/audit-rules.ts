/**
 * Which of axe's rules an audit is asked to run, and what each selection is
 * called where a report names it.
 *
 * Stated rather than assumed, because a pass over a chosen subset of the rules
 * and a pass over all of them both answer "no violations", and only one of
 * those answers is worth repeating in a report. `audit.ts` runs whichever
 * selections a caller hands it; the selections the suites and the `a11y` audit
 * hold their pages to are declared here.
 *
 * @module
 */

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
