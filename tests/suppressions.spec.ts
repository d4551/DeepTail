/**
 * The lists that can silence a finding, held empty.
 *
 * A suppression list that can grow by accident is a defect hiding behind
 * configuration, so each is pinned to its empty shape here: the only way one
 * reappears is a deliberate edit to this test.
 *
 * Every linter the gate chain runs is pinned, not merely the first one: a
 * category quietly dropped to a warning silences as much as an ignore list
 * does, and reads as nothing at all in a diff. Neither linter names files to
 * skip: what each reads is decided by the repository's own ship list — git's —
 * and one list decides for every checker.
 *
 * The levels a config states are not the whole of what it enforces. A preset
 * carries its own severity for every rule it turns on, and a rule the preset
 * holds at `info` is reported and then passed over: `biome check` prints it and
 * exits zero, so the chain goes green with the finding on screen. Reading the
 * stated levels alone said nothing about that, which is why the last case here
 * drives the checker itself and holds its whole report — every severity, not
 * the failing ones — to empty.
 */

import { expect, it } from 'bun:test'
import { knipIgnoredDependencies, readBiomeConfig, readOxlintConfig } from './checkers.ts'

/** The configuration files this repository holds its checkers to. */
const BIOME = 'biome.json'
const OXLINT = '.oxlintrc.json'
const KNIP = 'knip.json'

/** Pin the dead-code reader's configuration to its empty-handed shape. */
function pinKnip(): void {
  expect(knipIgnoredDependencies(KNIP)).toEqual([])
}

/** Pin the first linter: every rule at `error`, no file list, no overrides. */
function pinBiome(): void {
  const biome = readBiomeConfig(BIOME)
  // Biome names no files of its own: coverage follows git's ship list through
  // the ignore file the repository keeps, and one list decides for every
  // checker. The keys are read rather than the values, because a key present
  // and spelled `null` reads as absent and decides exactly as much.
  expect(biome.keys.filter((key) => key === 'files' || key === 'overrides')).toEqual([])
  expect([biome.usesIgnoreFile, biome.linterEnabled]).toEqual([true, true])
  expect(biome.preset).toBe('recommended')
  // Every level this config states, with the preset name -- which is not a
  // level -- left out. Filtering for `off` alone was the same oversight this
  // file's own header describes: a rule dropped to `warn` or `info` reports
  // nothing that fails a build, and reads as nothing at all in a diff.
  const levels = biome.groups.flatMap((group) => [...group.levels].map(([rule, level]) => `${rule}: ${level}`))
  expect(levels.filter((stated) => !stated.endsWith(': error'))).toEqual([])
  expect(levels.length).toBeGreaterThan(0)
}

/** Pin the second linter: every category at `error`, no ignore list. */
function pinOxlint(): void {
  const oxlint = readOxlintConfig(OXLINT)
  expect(oxlint.plugins).toEqual(['typescript', 'unicorn', 'promise'])
  expect([...oxlint.categories]).toEqual([
    ['correctness', 'error'],
    ['suspicious', 'error'],
    ['perf', 'error'],
    ['pedantic', 'error'],
  ])
  expect([...oxlint.rules].filter(([, level]) => level !== 'error')).toEqual([])
  expect(oxlint.keys.filter((key) => key === 'ignorePatterns' || key === 'overrides')).toEqual([])
}

it('keeps every suppression list empty', () => {
  pinKnip()
  pinBiome()
  pinOxlint()
})
