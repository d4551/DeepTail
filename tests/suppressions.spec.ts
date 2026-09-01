/**
 * The lists that can silence a finding.
 *
 * Each of these can hide a real defect, so each is pinned rather than merely
 * present: growing one has to be a deliberate edit to this file.
 */

import { expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'

/**
 * Assert that every list capable of silencing a finding still holds exactly
 * what it was agreed to hold, so growing one has to be a deliberate edit here.
 */
async function expectSuppressionListsUnchanged(): Promise<void> {
  // Each of these can silence a real finding, so each is pinned rather than
  // merely present: growing one has to be a deliberate edit to this test.
  const knip = JSON.parse(await readFile('knip.json', 'utf8')) as {
    workspaces?: Record<string, { ignoreDependencies?: string[] }>
  }
  expect(knip.workspaces?.['apps/deeptail']?.ignoreDependencies ?? []).toEqual([
    'react',
    'react-dom',
    '@deepseek-ai/dsh-client-store',
    '@deepseek-ai/dsh-client-ui-primitives',
    '@deepseek-ai/dsh-client-ui-slots',
  ])
  for (const [name, workspace] of Object.entries(knip.workspaces ?? {})) {
    if (name === 'apps/deeptail') continue
    expect([name, workspace.ignoreDependencies]).toEqual([name, undefined])
  }

  const biome = JSON.parse(await readFile('biome.json', 'utf8')) as {
    files?: { includes?: string[] }
    linter?: { enabled?: boolean; rules?: Record<string, unknown> }
    overrides?: unknown
  }
  expect(biome.overrides).toBeUndefined()
  expect(biome.files?.includes ?? []).toEqual(['**', '!**/dist', '!**/lib', '!**/gen', '!**/target', '!**/*.min.js'])
  // A rule set to `off`, or a preset dropped, is a check removed rather than
  // satisfied. The type was read here and never asserted on.
  const rules = biome.linter?.rules ?? {}
  expect(rules.preset).toBe('recommended')
  const levels = Object.values(rules).flatMap((group) =>
    typeof group === 'object' && group !== null ? Object.values(group as Record<string, unknown>) : [group],
  )
  expect(levels.filter((level) => level === 'off')).toEqual([])
  expect(biome.linter?.enabled).not.toBe(false)
}

it('keeps every suppression list at its agreed contents', async () => {
  await expectSuppressionListsUnchanged()
})
