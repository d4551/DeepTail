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
 * One rule is exempt, and only where the compiler leaves no other spelling.
 * `useLiteralKeys` asks for `x.y` in place of `x['y']`; `tsconfig.base.json`
 * turns on `noPropertyAccessFromIndexSignature`, which refuses `x.y` when `y`
 * comes from an index signature; and `unicorn/prefer-dom-node-dataset` — an
 * error, not an info — refuses the `getAttribute` spelling that would avoid
 * the index altogether. Reading a `dataset` entry therefore has exactly one
 * form all three admit, and it is the one this rule reports. The exemption is
 * not a name on a list: each finding's own source line is read, and a finding
 * anywhere else, or on any other shape, is refused.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { CONSOLE, type GateOutcome, renderOffence, reportGate } from './gate-runner.ts'
import type { Offence } from './offence.ts'
import { ROOT } from './source-tree.ts'

/** The command that asks the linter for every finding, at every severity. */
export const LINT_COMMAND = ['bunx', 'biome', 'check', '.', '--max-diagnostics=none', '--reporter=concise'] as const

/** The one rule a compiler guarantee can force, and the shape that forces it. */
export const COMPILER_FORCED_RULE = 'lint/complexity/useLiteralKeys'

/** The read that has one spelling: a `DOMStringMap` entry, taken by name. */
export const COMPILER_FORCED_SHAPE = '.dataset['

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
 * off an index signature and this gate's own rule would then refuse this file.
 */
const FINDING = /^\s*\S+\s+([^\s:]+):(\d+):\d+: ([\w/-]+):/u

/** The line the linter prints once it has read the tree. */
const CHECKED = /^Checked \d+ files? in /mu

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
 * How many findings the linter says it reported.
 *
 * Read so the parser can be held against the tool's own count: a report shape
 * this reader stopped understanding would otherwise pass as "nothing found",
 * which is what a clean run also looks like.
 * @param output - what the linter printed.
 * @returns the total, or undefined when the report is not one this reader knows.
 */
export function reportedTotal(output: string): number | undefined {
  if (!CHECKED.test(output)) return undefined
  let total = 0
  for (const match of output.matchAll(FOUND)) total += Number(match[1] ?? '0')
  return total
}

/**
 * The findings that are not the one form a compiler guarantee forces.
 * @param findings - every finding the linter reported.
 * @param sourceLine - the text of one line of one file.
 * @returns one offence per finding that has another spelling available.
 */
export function unforced(
  findings: readonly LintFinding[],
  sourceLine: (label: string, line: number) => string,
): Offence[] {
  return findings
    .filter(
      (finding) =>
        finding.rule !== COMPILER_FORCED_RULE ||
        !sourceLine(finding.label, finding.line).includes(COMPILER_FORCED_SHAPE),
    )
    .map((finding) => ({
      label: finding.label,
      line: finding.line,
      why: `${finding.rule}: the linter reported this and the chain went on; fix it, or show the compiler leaves no other spelling`,
    }))
}

/**
 * One line of one file the repository ships.
 * @param label - the file's repository-relative path.
 * @param line - the one-based line number.
 * @returns the line's text, or the empty string past the end of the file.
 */
function sourceLineOf(label: string, line: number): string {
  return readFileSync(`${ROOT}${label}`, 'utf8').split('\n')[line - 1] ?? ''
}

/**
 * What this gate has to say about one report.
 *
 * A value rather than a block inside `import.meta.main`: what a gate prints is
 * what a reader acts on, and the whole of it is driven from a suite.
 * @param output - what the linter printed.
 * @param sourceLine - the text of one line of one file.
 * @returns the report, and whether the chain may continue past it.
 */
export function lintOutcome(output: string, sourceLine: (label: string, line: number) => string): GateOutcome {
  const total = reportedTotal(output)
  const findings = parseFindings(output)
  if (total === undefined) {
    return { ok: false, text: `the linter printed a report this gate could not read:\n${output}` }
  }
  if (total !== findings.length) {
    // The tool's own count against this reader's. A report shape that moved
    // would otherwise read as "nothing found", which is what a clean run also
    // looks like — the silence this gate exists to end.
    const counted = `the linter counted ${String(total)} findings and this gate read ${String(findings.length)}`
    return { ok: false, text: `${counted}:\n${output}` }
  }
  const offences = unforced(findings, sourceLine)
  if (offences.length > 0) {
    const rendered = offences.map((offence) => renderOffence(offence)).join('\n')
    return { ok: false, text: `the linter reported findings the chain would have walked past:\n${rendered}\n` }
  }
  return {
    ok: true,
    text: `the linter reports nothing the compiler does not force (${String(findings.length)} forced)\n`,
  }
}

// Guarded, as every runnable script here is: importing a module must run
// nothing. A suite that imports one for the readers it exports would
// otherwise run the whole gate as a side effect of the import.
if (import.meta.main) {
  const run = Bun.spawnSync([...LINT_COMMAND], { cwd: ROOT, stderr: 'pipe' })
  const output = `${run.stdout?.toString() ?? ''}${run.stderr?.toString() ?? ''}`
  process.exit(reportGate(lintOutcome(output, sourceLineOf), CONSOLE))
}
