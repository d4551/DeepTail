/**
 * Hold the first linter to every finding it reports, not only the ones it
 * exits non-zero on.
 *
 * `biome check` exits zero when every diagnostic it emitted sits below `error`.
 * The recommended preset holds some of its rules at `info`, so the chain went
 * green with 81 findings on screen: reported, read by nobody, and failing
 * nothing. A severity that decides whether a build stops is a suppression with
 * better manners.
 *
 * There is no exemption here, and there was no need for one. The findings that
 * looked unavoidable were `useLiteralKeys` on `dataset` reads, and the three
 * checkers' own published rules are what settle it:
 *
 * - TypeScript's `noPropertyAccessFromIndexSignature` reference states that a
 *   field reached through an index signature must be written with the indexed
 *   syntax, which refuses `element.dataset.deeptailProbe`.
 * - oxlint's `unicorn/prefer-dom-node-dataset` states that `getAttribute`,
 *   `setAttribute`, `hasAttribute` and `removeAttribute` are the wrong way to
 *   reach a `data-*` attribute, which refuses the attribute spelling.
 * - Biome's `useLiteralKeys` reference lists `a[d.c]` among its *valid*
 *   examples: the rule reports a literal index, not a computed one.
 *
 * So the key taken as a value satisfies all three at once — which is what
 * `apps/deeptail/src/ui/dataset.ts` already did, and what the browser suites
 * now do. This gate therefore refuses everything, at every severity.
 *
 * @module
 */

import { CONSOLE, type GateOutcome, renderOffence, reportGate } from './gate-runner.ts'
import type { Offence } from './offence.ts'
import { ROOT } from './source-tree.ts'

/** The command that asks the linter for every finding, at every severity. */
export const LINT_COMMAND = ['bunx', 'biome', 'check', '.', '--max-diagnostics=none', '--reporter=concise'] as const

/** One finding the linter reported. */
export interface LintFinding {
  /** Repository-relative path of the file it was found in. */
  readonly label: string
  /** One-based line number. */
  readonly line: number
  /** The rule that reported it, as the linter spells it. */
  readonly rule: string
}

/**
 * One diagnostic line of the concise report: path, line, column, rule.
 *
 * The captures are positional rather than named, because a named group is read
 * off an index signature and this gate's own rules would then refuse this file.
 */
const FINDING = /^\s*\S+\s+([^\s:]+):(\d+):\d+: ([\w/-]+):/u

/** The line the linter prints once it has read the tree, and the count in it. */
const CHECKED = /^Checked (\d+) files? in /mu

/** One tally line of the report's summary. */
const FOUND = /^Found (\d+) (?:error|warning|info)s?\.$/gmu

/**
 * Every finding the concise report names.
 * @param output - what the linter printed.
 * @returns one entry per diagnostic, in the order reported.
 */
export function parseFindings(output: string): LintFinding[] {
  const found: LintFinding[] = []
  for (const text of output.split('\n')) {
    const match = FINDING.exec(text)
    if (match === null) continue
    found.push({ label: match[1] ?? '', line: Number(match[2] ?? '0'), rule: match[3] ?? '' })
  }
  return found
}

/**
 * How many files the linter says it read.
 *
 * Read so a clean line is a claim about how much was looked at, and so a report
 * shape this reader stopped understanding is refused rather than passed: an
 * unreadable report otherwise looks exactly like a clean one.
 * @param output - what the linter printed.
 * @returns the count, or undefined when the report is not one this reader knows.
 */
export function filesChecked(output: string): number | undefined {
  const match = CHECKED.exec(output)
  return match === null ? undefined : Number(match[1] ?? '0')
}

/**
 * How many findings the linter says it reported.
 *
 * Held against this reader's own count, so a summary and a body that disagree
 * are a refusal rather than a number nobody compared.
 * @param output - what the linter printed.
 * @returns the total across every severity; zero when the summary tallies none.
 */
export function reportedTotal(output: string): number {
  let total = 0
  for (const match of output.matchAll(FOUND)) total += Number(match[1] ?? '0')
  return total
}

/**
 * One finding, as this gate reports it.
 *
 * The wording says what this gate observed — that the finding was reported —
 * and not what the linter's exit code was. This reader is handed the report,
 * not the status: an earlier wording asserted the linter "exited zero", which
 * was true of the `info` findings that prompted the gate and false of every
 * `error` one it also refuses.
 * @param finding - the finding the linter named.
 * @returns the offence.
 */
function offenceOf(finding: LintFinding): Offence {
  return {
    label: finding.label,
    line: finding.line,
    why: `${finding.rule}: fix it rather than reading past it`,
  }
}

/**
 * What this gate has to say about one report.
 *
 * A value rather than a block inside `import.meta.main`: what a gate prints is
 * what a reader acts on, and the whole of it is driven from a suite.
 * @param output - what the linter printed.
 * @returns the report, and whether the chain may continue past it.
 */
export function lintOutcome(output: string): GateOutcome {
  const files = filesChecked(output)
  if (files === undefined) {
    return { ok: false, text: `the linter printed a report this gate could not read:\n${output}` }
  }
  const findings = parseFindings(output)
  const total = reportedTotal(output)
  if (total !== findings.length) {
    // The tool's own count against this reader's. A report shape that moved
    // would otherwise read as "nothing found", which is what a clean run also
    // looks like — the silence this gate exists to end.
    const counted = `the linter counted ${String(total)} findings and this gate read ${String(findings.length)}`
    return { ok: false, text: `${counted}:\n${output}` }
  }
  if (findings.length > 0) {
    const rendered = findings.map((finding) => renderOffence(offenceOf(finding))).join('\n')
    return {
      ok: false,
      text: `the linter reported findings, which this gate refuses at every severity:\n${rendered}\n`,
    }
  }
  return { ok: true, text: `the linter reports nothing, at any severity (${String(files)} files)\n` }
}

// Guarded, as every runnable script here is: importing a module must run
// nothing. A suite that imports one for the readers it exports would
// otherwise run the whole gate as a side effect of the import.
if (import.meta.main) {
  const run = Bun.spawnSync([...LINT_COMMAND], { cwd: ROOT, stderr: 'pipe' })
  const output = `${run.stdout?.toString() ?? ''}${run.stderr?.toString() ?? ''}`
  process.exit(reportGate(lintOutcome(output), CONSOLE))
}
