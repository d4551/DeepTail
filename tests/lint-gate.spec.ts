/**
 * The gate that refuses what the first linter reports but does not fail on.
 *
 * `biome check` exits zero when every diagnostic it emitted sits below `error`,
 * so 81 findings once rode through the chain reported and unread. The readers
 * below are what turns that report into a refusal, and they are driven here
 * against reports written by hand: a gate proved only against a clean tree is a
 * claim, not a check.
 */

import { describe, expect, it } from 'bun:test'
import {
  COMPILER_FORCED_RULE,
  COMPILER_FORCED_SHAPE,
  LINT_COMMAND,
  type LintFinding,
  lintOutcome,
  parseFindings,
  reportedTotal,
  unforced,
} from '../scripts/check-lint.ts'

/** A report carrying one info, one warning and one error, as the linter writes them. */
const MIXED = [
  'i apps/deeptail/tests/a.browser.spec.ts:266:20: lint/complexity/useLiteralKeys: The computed expression can be simplified.',
  '! scripts/b.ts:12:3: lint/suspicious/noConsole: Do not use console.',
  '× scripts/c.ts:4:1: lint/correctness/noUnusedVariables: This variable is unused.',
  'Checked 247 files in 99ms. No fixes applied.',
  'Found 1 error.',
  'Found 1 warning.',
  'Found 1 info.',
].join('\n')

/** A report carrying only the one finding a compiler guarantee forces. */
const FORCED_ONLY = [
  'i apps/deeptail/tests/a.browser.spec.ts:266:20: lint/complexity/useLiteralKeys: The computed expression can be simplified.',
  'Checked 247 files in 99ms. No fixes applied.',
  'Found 1 info.',
].join('\n')

/** A clean report: the tree was read and nothing was found. */
const CLEAN = 'Checked 247 files in 57ms. No fixes applied.\n'

describe('the report reader', () => {
  it('reads a finding at every severity, with its file, line and rule', () => {
    expect(parseFindings(MIXED)).toEqual([
      { label: 'apps/deeptail/tests/a.browser.spec.ts', line: 266, rule: 'lint/complexity/useLiteralKeys' },
      { label: 'scripts/b.ts', line: 12, rule: 'lint/suspicious/noConsole' },
      { label: 'scripts/c.ts', line: 4, rule: 'lint/correctness/noUnusedVariables' },
    ])
  })

  it('reads nothing out of a clean report, and nothing out of the summary lines', () => {
    expect(parseFindings(CLEAN)).toEqual([])
  })

  it('totals every severity the summary counts', () => {
    expect([reportedTotal(MIXED), reportedTotal(CLEAN)]).toEqual([3, 0])
  })

  it('refuses a report it cannot recognise, rather than reading it as clean', () => {
    // A linter whose output shape moved would otherwise pass as "nothing
    // found", which is exactly what a clean run also looks like.
    expect(reportedTotal('biome: command not found\n')).toBeUndefined()
    expect(reportedTotal('')).toBeUndefined()
  })
})

describe('the exemption', () => {
  /** The one finding a compiler guarantee forces, and a source line that shows it. */
  const forced: LintFinding = { label: 'a.spec.ts', line: 1, rule: COMPILER_FORCED_RULE }

  it('lets through the one rule whose only other spelling the compiler refuses', () => {
    expect(unforced([forced], () => "el.dataset['deeptailProbe'] = 'x'")).toEqual([])
  })

  it('refuses that same rule anywhere the shape is not the forced one', () => {
    // The exemption is the shape, not the rule's name: the same rule on a plain
    // record has a spelling available and must be fixed rather than waved past.
    expect(unforced([forced], () => "config['rules']").map((offence) => offence.label)).toEqual(['a.spec.ts'])
  })

  it('refuses every other rule, whatever the line says', () => {
    const other: LintFinding = { label: 'b.ts', line: 9, rule: 'lint/suspicious/noConsole' }
    const offences = unforced([other], () => "el.dataset['x']")
    expect(offences.map((offence) => [offence.label, offence.line])).toEqual([['b.ts', 9]])
    expect(offences[0]?.why.startsWith('lint/suspicious/noConsole: ')).toBe(true)
  })

  it('refuses nothing when nothing was reported', () => {
    expect(unforced([], () => '')).toEqual([])
  })
})

describe('the report the gate prints', () => {
  it('refuses every finding it cannot show the compiler forces, and names each', () => {
    const outcome = lintOutcome(MIXED, () => 'const a = 1')
    expect(outcome.ok).toBe(false)
    expect(outcome.text.startsWith('the linter reported findings the chain would have walked past:\n')).toBe(true)
    expect(outcome.text).toContain('  scripts/b.ts:12: lint/suspicious/noConsole: ')
  })

  it('passes a report whose every finding the compiler forces, and says how many', () => {
    expect(lintOutcome(FORCED_ONLY, () => "el.dataset['deeptailProbe'] = 'x'")).toEqual({
      ok: true,
      text: 'the linter reports nothing the compiler does not force (1 forced)\n',
    })
  })

  it('passes a clean report, counting nothing', () => {
    expect(lintOutcome(CLEAN, () => '')).toEqual({
      ok: true,
      text: 'the linter reports nothing the compiler does not force (0 forced)\n',
    })
  })

  it('refuses a report it could not recognise, rather than reading it as clean', () => {
    const outcome = lintOutcome('biome: command not found\n', () => '')
    expect([outcome.ok, outcome.text.startsWith('the linter printed a report this gate could not read:\n')]).toEqual([
      false,
      true,
    ])
  })

  it('refuses a report whose count and whose lines disagree', () => {
    // The tool said three and this reader saw none: the report's shape moved,
    // and a gate that read that as clean would be the silence it exists to end.
    const outcome = lintOutcome(`${CLEAN}Found 3 errors.\n`, () => '')
    expect([outcome.ok, outcome.text.startsWith('the linter counted 3 findings and this gate read 0:\n')]).toEqual([
      false,
      true,
    ])
  })
})

describe('the command the gate runs', () => {
  it('asks for every finding, at every severity, in the shape the reader parses', () => {
    // A capped report, or the default reporter, would leave findings the reader
    // never sees — and a gate that reads a truncated report reports a truncated
    // truth.
    expect([...LINT_COMMAND]).toEqual(['bunx', 'biome', 'check', '.', '--max-diagnostics=none', '--reporter=concise'])
  })

  it('names the shape the exemption is written about', () => {
    expect([COMPILER_FORCED_RULE, COMPILER_FORCED_SHAPE]).toEqual(['lint/complexity/useLiteralKeys', '.dataset['])
  })
})
