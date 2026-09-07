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
 */

import { expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'

/**
 * Pin the dead-code reader's configuration to its empty-handed shape.
 */
async function pinKnip(): Promise<void> {
  const knip = JSON.parse(await readFile('knip.json', 'utf8')) as {
    workspaces?: Record<string, { ignoreDependencies?: string[] }>
  }
  for (const [name, workspace] of Object.entries(knip.workspaces ?? {})) {
    expect([name, workspace.ignoreDependencies]).toEqual([name, undefined])
  }
}

/**
 * Pin the first linter: every rule at `error`, no file list, no overrides.
 */
async function pinBiome(): Promise<void> {
  // The linter config's rule groups are string maps — both shapes are named so
  // nothing widens to an unreadable bag.
  const biome = JSON.parse(await readFile('biome.json', 'utf8')) as {
    files?: { includes?: string[] }
    vcs?: { useIgnoreFile?: boolean }
    linter?: { enabled?: boolean; rules?: Record<string, string | Record<string, string>> }
    overrides?: object
  }
  // Biome names no files of its own: coverage follows git's ship list through
  // the ignore file the repository keeps, and one list decides for every
  // checker.
  expect(biome.files).toBeUndefined()
  expect(biome.vcs?.useIgnoreFile).toBe(true)
  expect(biome.overrides).toBeUndefined()
  const rules = biome.linter?.rules ?? {}
  expect(rules['preset']).toBe('recommended')
  // Every level this config states, with the preset name -- which is not a
  // level -- left out. Filtering for `off` alone was the same oversight this
  // file's own header describes: a rule dropped to `warn` or `info` reports
  // nothing that fails a build, and reads as nothing at all in a diff.
  const levels = Object.entries(rules).flatMap(([group, value]) =>
    typeof value === 'object' && value !== null ? Object.values(value) : group === 'preset' ? [] : [value],
  )
  expect(levels.filter((level) => level !== 'error')).toEqual([])
  expect(biome.linter?.enabled).not.toBe(false)
}

/**
 * Pin the second linter: every category at `error`, no ignore list.
 */
async function pinOxlint(): Promise<void> {
  const oxlint = JSON.parse(await readFile('.oxlintrc.json', 'utf8')) as {
    plugins?: string[]
    categories?: Record<string, string>
    rules?: Record<string, string>
    ignorePatterns?: string[]
    overrides?: object
  }
  expect(oxlint.plugins ?? []).toEqual(['typescript', 'unicorn', 'promise'])
  expect(oxlint.categories ?? {}).toEqual({
    correctness: 'error',
    suspicious: 'error',
    perf: 'error',
    pedantic: 'error',
  })
  expect(Object.values(oxlint.rules ?? {}).filter((level) => level !== 'error')).toEqual([])
  expect(oxlint.ignorePatterns).toBeUndefined()
  expect(oxlint.overrides).toBeUndefined()
}

it('keeps every suppression list empty', async () => {
  await pinKnip()
  await pinBiome()
  await pinOxlint()
})
