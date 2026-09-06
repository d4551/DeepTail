/**
 * The lists that can silence a finding, held empty.
 *
 * A suppression list that can grow by accident is a defect hiding behind
 * configuration, so each is pinned to its empty shape here: the only way one
 * reappears is a deliberate edit to this test.
 *
 * Every linter the gate chain runs is pinned, not merely the first one: a
 * category quietly dropped to a warning silences as much as an ignore list
 * does, and reads as nothing at all in a diff.
 */

import { expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'

/**
 * Assert that no checker configuration silences a finding.
 */
async function expectNoSuppressionLists(): Promise<void> {
  const knip = JSON.parse(await readFile('knip.json', 'utf8')) as {
    workspaces?: Record<string, { ignoreDependencies?: string[] }>
  }
  for (const [name, workspace] of Object.entries(knip.workspaces ?? {})) {
    expect([name, workspace.ignoreDependencies]).toEqual([name, undefined])
  }

  // The linter config's rule groups are string maps, and the top-level `rules`
  // object also carries the preset name as a string — both shapes are named so
  // nothing widens to an unreadable bag.
  const biome = JSON.parse(await readFile('biome.json', 'utf8')) as {
    files?: { includes?: string[] }
    linter?: { enabled?: boolean; rules?: Record<string, string | Record<string, string>> }
    overrides?: object
  }
  expect(biome.overrides).toBeUndefined()
  expect(biome.files?.includes ?? []).toEqual(['**', '!**/dist', '!**/lib', '!**/gen', '!**/target', '!**/*.min.js'])
  const rules = biome.linter?.rules ?? {}
  expect(rules.preset).toBe('recommended')
  // Every level this config states, with the preset name -- which is not a
  // level -- left out. Filtering for `off` alone was the same oversight this
  // file's own header describes: a rule dropped to `warn` or `info` reports
  // nothing that fails a build, and reads as nothing at all in a diff.
  const levels = Object.entries(rules).flatMap(([group, value]) =>
    typeof value === 'object' && value !== null ? Object.values(value) : group === 'preset' ? [] : [value],
  )
  expect(levels.filter((level) => level !== 'error')).toEqual([])
  expect(biome.linter?.enabled).not.toBe(false)

  // The second linter had no such pin at all, so a category could have been
  // dropped to a warning or a rule turned off and every gate stayed green. Its
  // categories, its named rules and the paths it declines to read are all held
  // to what they were, and the ignore list carries only what the build writes.
  const oxlint = JSON.parse(await readFile('.oxlintrc.json', 'utf8')) as {
    plugins?: string[]
    categories?: Record<string, string>
    rules?: Record<string, string>
    ignorePatterns?: string[]
  }
  expect(oxlint.plugins ?? []).toEqual(['typescript', 'unicorn', 'promise'])
  expect(oxlint.categories ?? {}).toEqual({
    correctness: 'error',
    suspicious: 'error',
    perf: 'error',
    pedantic: 'error',
  })
  expect(Object.values(oxlint.rules ?? {}).filter((level) => level !== 'error')).toEqual([])
  expect(oxlint.ignorePatterns ?? []).toEqual(['**/lib/**', '**/dist/**', '**/gen/**', '**/target/**'])
}

it('keeps every suppression list empty', async () => {
  await expectNoSuppressionLists()
})
