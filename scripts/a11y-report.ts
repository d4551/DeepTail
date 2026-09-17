/**
 * What the `a11y` audit has to say, and the status it exits under.
 *
 * The sentence this prints — `axe: no accessibility violations` — was the last
 * link of a shell chain: an `echo` that stayed true when the commands before it
 * were weakened or deleted, and that no browser ever had to run for. It is
 * produced here from what the audit actually did, and only when every
 * arrangement it set out to make was made, each of them ran rules enough to be
 * read, and none of them found anything. Anything short of that is listed as a
 * refusal instead, on the error stream, under a non-zero status.
 *
 * @module
 */

import type { ArrangementKey, AuditedArrangement } from '../apps/deeptail/tests/a11y-audit.ts'
import type { GateOutcome } from './gate-runner.ts'

/** The sentence a clean audit prints, and the whole of its verdict. */
export const CLEAN_VERDICT = 'axe: no accessibility violations'

/** What a run has to say when it refuses its own answer. */
const REFUSAL = 'the accessibility audit refused this run:'

/**
 * The fewest rules one selection may have run for its silence to mean
 * anything.
 *
 * axe's whole default rule set is an order of magnitude larger than this: the
 * floor is the point below which a run cannot have been the audit it says it
 * was, whatever its findings are.
 */
export const RULES_FLOOR = 50

/** What the audit ran over, and what it found. */
export interface AuditRun {
  /** Every arrangement the audit set out to make. */
  readonly expected: readonly ArrangementKey[]
  /** Every arrangement it made. */
  readonly results: readonly AuditedArrangement[]
  /** What the built page is refused for, read before any surface is opened. */
  readonly pageRefused: readonly string[]
}

/**
 * How one arrangement is named in a report.
 * @param key - the arrangement.
 * @returns the surface, the view, and the box it was opened at.
 */
function arrangementOf(key: ArrangementKey): string {
  return `${key.surface} / ${key.view} (${String(key.width)}x${String(key.height)})`
}

/**
 * The arrangement a result names, as a key two lists can be matched by.
 * @param key - the arrangement.
 * @returns the key.
 */
function keyOf(key: ArrangementKey): string {
  return `${key.surface}\n${key.view}`
}

/**
 * One line per finding, naming the arrangement it was found in.
 * @param results - every arrangement the audit made.
 * @returns the findings, flat, one line each.
 */
function findingLines(results: readonly AuditedArrangement[]): string[] {
  return results.flatMap((result) =>
    result.findings.flatMap((finding) =>
      finding.nodes.map((node) => `${arrangementOf(result)}: ${finding.id}: ${finding.help}: ${node}`),
    ),
  )
}

/**
 * Every reason one arrangement cannot be read.
 * @param result - the arrangement to read.
 * @returns one line per reason, empty when it can be read.
 */
function unreadArrangement(result: AuditedArrangement): string[] {
  if (result.engine.trim() === '') return [`${arrangementOf(result)}: no axe release decided it`]
  if (result.runs.length === 0) return [`${arrangementOf(result)}: no rule selection was run over it`]
  return result.runs
    .filter((run) => run.rules < RULES_FLOOR)
    .map(
      (run) =>
        `${arrangementOf(result)}: ${String(run.rules)} rules were evaluated over ${run.selection}, too few to read a clean page from`,
    )
}

/**
 * Every reason the audit refuses its own answer.
 *
 * A reason about the run itself comes before what it found, because a run that
 * never made an arrangement cannot be read as covering it, and a run that
 * evaluated too few rules cannot be read at all.
 * @param run - what the audit ran over, and what it found.
 * @returns one line per refusal, empty when the run can be read.
 */
function refusals(run: AuditRun): string[] {
  const made = new Set(run.results.map((result) => keyOf(result)))
  const unrealized = run.results.flatMap((result) => {
    const size = result.realized
    if (size === null) return [`${arrangementOf(result)}: the engine reported no box for the page`]
    if (size.width === result.width && size.height === result.height) return []
    return [
      `${arrangementOf(result)}: the page was ${String(size.width)}x${String(size.height)} rather than the box it was arranged for`,
    ]
  })
  return [
    ...run.pageRefused,
    ...(run.expected.length === 0 ? ['the audit set out to arrange no surface at all'] : []),
    ...run.expected
      .filter((key) => !made.has(keyOf(key)))
      .map((key) => `the audit never arranged ${arrangementOf(key)}`),
    ...run.results.flatMap((result) => unreadArrangement(result)),
    ...unrealized,
    ...findingLines(run.results),
  ]
}

/**
 * What the audit did, line by line, above its verdict.
 * @param run - what the audit ran over.
 * @returns the lines that describe the run.
 */
function summary(run: AuditRun): string[] {
  const surfaces = new Set(run.expected.map((key) => key.surface))
  const views = new Set(run.expected.map((key) => key.view))
  // Every arrangement runs the same selections over its own page, so any of
  // them can name what was run, and the count is the largest one reached.
  const rules = new Map<string, number>()
  let engine = ''
  for (const result of run.results) {
    for (const one of result.runs) rules.set(one.selection, Math.max(rules.get(one.selection) ?? 0, one.rules))
    engine = result.engine
  }
  const counted = [...rules].map(([selection, count]) => `${String(count)} rules over ${selection}`).join(', ')
  return [
    `axe: ${String(run.results.length)} arrangements, ${String(surfaces.size)} surfaces over ${String(views.size)} views, ${engine}`,
    `axe: ${counted}`,
  ]
}

/**
 * What the audit has to say, and the status it exits under.
 *
 * `reportGate` turns this into the exit status: a refusal is written to the
 * error stream and exits non-zero, and a clean run prints its lines and the
 * verdict on the output stream and exits nought.
 * @param run - what the audit ran over, and what it found.
 * @returns the report, and whether it is a clean run.
 */
export function auditReport(run: AuditRun): GateOutcome {
  const refused = refusals(run)
  if (refused.length > 0) {
    return { ok: false, text: `${REFUSAL}\n${refused.map((line) => `  ${line}`).join('\n')}\n` }
  }
  return { ok: true, text: `${summary(run).join('\n')}\n${CLEAN_VERDICT}\n` }
}
