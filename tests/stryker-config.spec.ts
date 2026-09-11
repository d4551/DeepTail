/**
 * The mutation scopes' own configuration, read rather than claimed.
 *
 * A mutation score is only worth what its denominator is, and the denominator
 * is stated in these files. Two suites and one reader opened them with
 * `JSON.parse` and told the compiler what they had found, so a scope whose
 * `mutate` was written as a string, or whose `break` was written as text, would
 * have read as the declared shape — and been reported as configuration nobody
 * had weakened.
 */

import { describe, expect, it } from 'bun:test'
import { readScopeConfig, scopeConfigOf, scopeConfigs } from '../scripts/stryker-config.ts'

/** A scope written the way the repository's own are. */
const WRITTEN = JSON.stringify({
  commandRunner: { command: 'bun test tests/a.spec.ts' },
  mutate: ['scripts/a.ts', 'scripts/b.ts'],
  coverageAnalysis: 'off',
  inPlace: true,
  thresholds: { high: 99, low: 99, break: 99 },
})

describe('one mutation scope', () => {
  it('reads every field the rules are written about', () => {
    expect(scopeConfigOf('stryker.a.json', WRITTEN)).toEqual({
      label: 'stryker.a.json',
      command: 'bun test tests/a.spec.ts',
      mutate: ['scripts/a.ts', 'scripts/b.ts'],
      coverageAnalysis: 'off',
      testRunner: undefined,
      inPlace: true,
      incremental: undefined,
      thresholds: { high: 99, low: 99, break: 99 },
    })
  })

  it('reads a field written as something else as absent, rather than as itself', () => {
    // The rules above this read `break === 99` and `inPlace === true`. A value
    // of another shape read as the field would answer those questions with
    // something nobody wrote.
    const odd = JSON.stringify({
      commandRunner: { command: 7 },
      mutate: 'scripts/a.ts',
      coverageAnalysis: false,
      testRunner: 8,
      inPlace: 'yes',
      incremental: 'no',
      thresholds: { high: '99', low: null, break: [99] },
    })
    expect(scopeConfigOf('stryker.odd.json', odd)).toEqual({
      label: 'stryker.odd.json',
      command: '',
      mutate: [],
      coverageAnalysis: undefined,
      testRunner: undefined,
      inPlace: undefined,
      incremental: undefined,
      thresholds: { high: undefined, low: undefined, break: undefined },
    })
  })
})

describe('a field one scope wrote in another shape', () => {
  it('reads a list of patterns as the strings in it, and nothing else', () => {
    const mixed = readScopeConfig('stryker.mixed.json', { mutate: ['scripts/a.ts', 7, null, 'scripts/b.ts'] })
    expect(mixed.mutate).toEqual(['scripts/a.ts', 'scripts/b.ts'])
  })

  it('reads a runner section that is not a section as naming no command', () => {
    expect(readScopeConfig('stryker.bare.json', { commandRunner: 'bun test' }).command).toBe('')
    expect(readScopeConfig('stryker.bare.json', {}).command).toBe('')
  })

  it('reads a thresholds section that is not a section as stating no score', () => {
    expect(readScopeConfig('stryker.bare.json', { thresholds: 99 }).thresholds).toEqual({
      high: undefined,
      low: undefined,
      break: undefined,
    })
  })
})

describe('the scopes this repository ships', () => {
  it('are the stryker configurations on disk, each read by its own name', () => {
    const scopes = scopeConfigs()
    expect(scopes.length).toBeGreaterThan(0)
    expect(scopes.map((scope) => scope.label).filter((label) => !/^stryker\..*\.json$/u.test(label))).toEqual([])
    expect(scopes.filter((scope) => scope.command === '' || scope.mutate.length === 0)).toEqual([])
  })
})
