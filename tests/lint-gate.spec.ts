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
import { filesChecked, LINT_COMMAND, lintOutcome, parseFindings, reportedTotal } from '../scripts/check-lint.ts'

/** A report carrying one info, one warning and one error, as the linter writes them. */
const MIXED = [
  'i apps/deeptail/tests/a.browser.spec.ts:266:20: lint/complexity/useLiteralKeys: The computed expression can be simplified.',
  '! scripts/b.ts:12:3: lint/suspicious/noConsole: Do not use the console.',
  '× scripts/c.ts:4:1: lint/correctness/noUnusedVariables: This variable is unused.',
  'Checked 247 files in 99ms. No fixes applied.',
  'Found 1 error.',
  'Found 1 warning.',
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

  it('reads nothing out of prose that carries no rule, however diagnostic it looks', () => {
    // The summary and the banner both carry colons and digits. Counting either
    // as a finding would make the reader disagree with the tool's own tally,
    // which is the disagreement this gate refuses on.
    expect(parseFindings('Checked 247 files in 99ms. No fixes applied.\nFound 3 errors.\n')).toEqual([])
  })

  it('reads a file that sits at the repository root, with no directory in its path', () => {
    expect(parseFindings('× biome.json:3:1: lint/nursery/someRule: Something.')).toEqual([
      { label: 'biome.json', line: 3, rule: 'lint/nursery/someRule' },
    ])
  })

  it('totals every severity the summary counts', () => {
    expect([reportedTotal(MIXED), reportedTotal(CLEAN)]).toEqual([3, 0])
  })

  it('totals a plural tally as readily as a singular one', () => {
    expect(reportedTotal('Found 12 errors.\nFound 1 warning.\nFound 40 infos.\n')).toBe(53)
  })

  it('reads how many files the linter says it read', () => {
    expect([filesChecked(MIXED), filesChecked(CLEAN)]).toEqual([247, 247])
  })

  it('reads a one-file run, whose banner is written in the singular', () => {
    expect(filesChecked('Checked 1 file in 20ms. No fixes applied.\n')).toBe(1)
  })

  it('reports no file count for a report it cannot recognise', () => {
    // A linter whose output shape moved would otherwise pass as "nothing
    // found", which is exactly what a clean run also looks like.
    expect([filesChecked('biome: command not found\n'), filesChecked('')]).toEqual([undefined, undefined])
  })
})

describe('the report the gate prints', () => {
  it('refuses every finding, at every severity, and names each with its rule', () => {
    const outcome = lintOutcome(MIXED)
    expect(outcome.ok).toBe(false)
    expect(outcome.text.startsWith('the linter reported findings the chain would have walked past:\n')).toBe(true)
    for (const named of [
      '  apps/deeptail/tests/a.browser.spec.ts:266: lint/complexity/useLiteralKeys: ',
      '  scripts/b.ts:12: lint/suspicious/noConsole: ',
      '  scripts/c.ts:4: lint/correctness/noUnusedVariables: ',
    ]) {
      expect([named, outcome.text.includes(named)]).toEqual([named, true])
    }
  })

  it('refuses an info-only report, which is the whole reason this gate exists', () => {
    // `biome check` exits zero on this exact report. The chain must not.
    const info = [
      'i scripts/d.ts:7:9: lint/complexity/useLiteralKeys: The computed expression can be simplified.',
      'Checked 247 files in 99ms. No fixes applied.',
      'Found 1 info.',
    ].join('\n')
    expect(lintOutcome(info).ok).toBe(false)
  })

  it('passes a clean report, and says how many files were read', () => {
    expect(lintOutcome(CLEAN)).toEqual({
      ok: true,
      text: 'the linter reports nothing, at any severity (247 files)\n',
    })
  })

  it('ends every report it prints with a newline, as the chain’s other gates do', () => {
    for (const outcome of [lintOutcome(CLEAN), lintOutcome(MIXED)]) {
      expect([outcome.ok, outcome.text.endsWith('\n')]).toEqual([outcome.ok, true])
    }
  })

  it('refuses a report it could not recognise, rather than reading it as clean', () => {
    const outcome = lintOutcome('biome: command not found\n')
    expect([outcome.ok, outcome.text.startsWith('the linter printed a report this gate could not read:\n')]).toEqual([
      false,
      true,
    ])
  })

  it('refuses a report whose summary counts more than its body names', () => {
    // The tool said three and this reader saw none: the report's shape moved,
    // and a gate that read that as clean would be the silence it exists to end.
    const outcome = lintOutcome(`${CLEAN}Found 3 errors.\n`)
    expect([outcome.ok, outcome.text.startsWith('the linter counted 3 findings and this gate read 0:\n')]).toEqual([
      false,
      true,
    ])
  })

  it('refuses a report whose summary counts fewer than its body names', () => {
    // The other direction: a body this reader over-read is just as much a
    // disagreement, and passing it would report findings that are not there.
    const outcome = lintOutcome(MIXED.replace('Found 1 error.\n', ''))
    expect([outcome.ok, outcome.text.startsWith('the linter counted 2 findings and this gate read 3:\n')]).toEqual([
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
})
