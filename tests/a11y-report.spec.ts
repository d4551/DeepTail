/**
 * What the accessibility audit's report says, and under what status.
 *
 * The sentence the `a11y` script prints is the whole of its verdict, so what
 * matters is when it is printed and when it is not. Each case here plants one
 * way a run can fail to be readable — a surface that was never arranged, an
 * arrangement that ran no rule, a page that was never realized, a page the
 * contract refused, a finding — and asserts that the verdict is absent from the
 * report and that the report refuses. The status itself is `reportGate`'s, and
 * is driven in `gate-runner.spec.ts`.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import type { ArrangementKey, AuditedArrangement } from '../apps/deeptail/tests/a11y-audit.ts'
import type { RuleRun } from '../apps/deeptail/tests/audit-evidence.ts'
import { type AuditRun, auditReport, CLEAN_VERDICT } from '../scripts/a11y-report.ts'

/** One surface at one designed width. */
const ROSTER: ArrangementKey = { surface: 'the fleet roster', view: 'phone light', width: 390, height: 844 }

/** A second, so a run that lost one can be told from a run that made none. */
const PICKER: ArrangementKey = { surface: 'the empty picker', view: 'laptop dark', width: 1280, height: 800 }

/** The two selections the audit runs, and what each evaluated on the shell. */
const RUNS: readonly RuleRun[] = [
  { selection: 'every rule axe enables by default', rules: 89 },
  { selection: 'the published WCAG 2.2 AA tags and axe best practice', rules: 90 },
]

/**
 * One arrangement, as the driver would have made it.
 * @param key - the surface and view it names.
 * @param extra - what to change about the run it reports.
 * @returns the arrangement.
 */
function arrangement(key: ArrangementKey, extra: Partial<AuditedArrangement> = {}): AuditedArrangement {
  return {
    ...key,
    realized: { width: key.width, height: key.height },
    findings: [],
    runs: RUNS,
    engine: 'axe-core 4.13.0',
    ...extra,
  }
}

/**
 * A run over both arrangements, with whatever the case changes.
 * @param extra - what to change about the run.
 * @returns the run the report is asked about.
 */
function run(extra: Partial<AuditRun> = {}): AuditRun {
  return {
    expected: [ROSTER, PICKER],
    results: [arrangement(ROSTER), arrangement(PICKER)],
    pageRefused: [],
    ...extra,
  }
}

describe('a run the audit can read', () => {
  it('says what it ran over, and ends on the verdict', () => {
    const outcome = auditReport(run())
    expect(outcome.ok).toBe(true)
    expect(outcome.text).toBe(
      [
        'axe: 2 arrangements, 2 surfaces over 2 views, axe-core 4.13.0',
        'axe: 89 rules over every rule axe enables by default, 90 rules over the published WCAG 2.2 AA tags and axe best practice',
        CLEAN_VERDICT,
        '',
      ].join('\n'),
    )
  })

  it('counts the surfaces and the views it actually covered, not the ones it lists', () => {
    // The two arrangements below name one surface at two views, which is what
    // the summary has to say: a report that counted its list would claim a
    // surface it never opened.
    const once: ArrangementKey = { surface: 'the fleet roster', view: 'phone light', width: 390, height: 844 }
    const twice: ArrangementKey = { surface: 'the fleet roster', view: 'laptop dark', width: 1280, height: 800 }
    const outcome = auditReport(run({ expected: [once, twice], results: [arrangement(once), arrangement(twice)] }))
    expect(outcome.ok).toBe(true)
    expect(outcome.text).toContain('2 arrangements, 1 surfaces over 2 views')
  })
})

describe('a run the audit refuses', () => {
  it('names the arrangement and the node a finding was found in, and prints no verdict', () => {
    const found = arrangement(ROSTER, {
      findings: [
        {
          id: 'button-name',
          impact: 'critical',
          help: 'Buttons must have discernible text',
          nodes: ['<button class="drawer-toggle"></button>'],
        },
      ],
    })
    const outcome = auditReport(run({ results: [found, arrangement(PICKER)] }))
    expect(outcome.ok).toBe(false)
    expect(outcome.text).not.toContain(CLEAN_VERDICT)
    expect(outcome.text).toContain(
      '  the fleet roster / phone light (390x844): button-name: Buttons must have discernible text: <button class="drawer-toggle"></button>',
    )
  })

  it('says which surface it set out to arrange and never did', () => {
    const outcome = auditReport(run({ results: [arrangement(ROSTER)] }))
    expect(outcome.ok).toBe(false)
    expect(outcome.text).not.toContain(CLEAN_VERDICT)
    expect(outcome.text).toContain('the audit never arranged the empty picker / laptop dark (1280x800)')
  })

  it('refuses a run that set out to arrange nothing, which would otherwise be silent', () => {
    const outcome = auditReport(run({ expected: [], results: [] }))
    expect(outcome.ok).toBe(false)
    expect(outcome.text).not.toContain(CLEAN_VERDICT)
    expect(outcome.text).toContain('the audit set out to arrange no surface at all')
  })

  it('refuses an arrangement that ran too few rules to be read', () => {
    const silent = arrangement(PICKER, { runs: [{ selection: 'every rule axe enables by default', rules: 0 }] })
    const outcome = auditReport(run({ results: [arrangement(ROSTER), silent] }))
    expect(outcome.ok).toBe(false)
    expect(outcome.text).not.toContain(CLEAN_VERDICT)
    expect(outcome.text).toContain('0 rules were evaluated over every rule axe enables by default')
  })

  it('refuses an arrangement that ran no rule selection at all', () => {
    const silent = arrangement(PICKER, { runs: [] })
    const outcome = auditReport(run({ results: [arrangement(ROSTER), silent] }))
    expect(outcome.ok).toBe(false)
    expect(outcome.text).not.toContain(CLEAN_VERDICT)
    expect(outcome.text).toContain('no rule selection was run over it')
  })
})

describe('a run whose evidence cannot be read', () => {
  it('refuses an arrangement no axe release decided', () => {
    const unnamed = arrangement(PICKER, { engine: '   ' })
    const outcome = auditReport(run({ results: [arrangement(ROSTER), unnamed] }))
    expect(outcome.ok).toBe(false)
    expect(outcome.text).not.toContain(CLEAN_VERDICT)
    expect(outcome.text).toContain('no axe release decided it')
  })

  it('refuses an arrangement whose page was never realized at the box it was opened for', () => {
    const wrong = arrangement(PICKER, { realized: { width: 320, height: 256 } })
    const outcome = auditReport(run({ results: [arrangement(ROSTER), wrong] }))
    expect(outcome.ok).toBe(false)
    expect(outcome.text).not.toContain(CLEAN_VERDICT)
    expect(outcome.text).toContain('the page was 320x256 rather than the box it was arranged for')
  })

  it('refuses an arrangement whose page reported no box at all', () => {
    const boxless = arrangement(PICKER, { realized: null })
    const outcome = auditReport(run({ results: [arrangement(ROSTER), boxless] }))
    expect(outcome.ok).toBe(false)
    expect(outcome.text).not.toContain(CLEAN_VERDICT)
    expect(outcome.text).toContain('the engine reported no box for the page')
  })

  it('refuses the built page the contract refused, before any surface is read', () => {
    const outcome = auditReport(
      run({ results: [], pageRefused: ['the built page is not on disk: /bundles/index.html'] }),
    )
    expect(outcome.ok).toBe(false)
    expect(outcome.text).not.toContain(CLEAN_VERDICT)
    expect(outcome.text).toContain('the built page is not on disk: /bundles/index.html')
  })
})
