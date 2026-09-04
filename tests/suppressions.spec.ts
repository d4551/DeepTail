/**
 * The lists that can silence a finding, held empty.
 *
 * A suppression list that can grow by accident is a defect hiding behind
 * configuration, so each is pinned to its empty shape here: the only way one
 * reappears is a deliberate edit to this test.
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
  const levels = Object.values(rules).flatMap((group) =>
    typeof group === 'object' && group !== null ? Object.values(group) : [group],
  )
  expect(levels.filter((level) => level === 'off')).toEqual([])
  expect(biome.linter?.enabled).not.toBe(false)
}

it('keeps every suppression list empty', async () => {
  await expectNoSuppressionLists()
})
