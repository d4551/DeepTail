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
    workspaces?: Record<string, Record<string, unknown>>
    ignore?: unknown
    ignoreBinaries?: unknown
    ignoreDependencies?: unknown
    ignoreMembers?: unknown
    ignoreUnresolved?: unknown
    ignoreExportsUsedInFile?: unknown
  }
  // `ignoreDependencies` was the only list pinned, and it is one of six ways to
  // tell knip to stop looking. None of the others is in use, and a new one
  // appearing has to be a deliberate edit here.
  for (const list of [
    'ignore',
    'ignoreBinaries',
    'ignoreDependencies',
    'ignoreMembers',
    'ignoreUnresolved',
    'ignoreExportsUsedInFile',
  ] as const) {
    expect([list, knip[list]]).toEqual([list, undefined])
  }
  for (const [name, workspace] of Object.entries(knip.workspaces ?? {})) {
    for (const list of ['ignore', 'ignoreBinaries', 'ignoreMembers', 'ignoreUnresolved'] as const) {
      expect([name, list, workspace[list]]).toEqual([name, list, undefined])
    }
  }
  expect(knip.workspaces?.['apps/deeptail']?.['ignoreDependencies'] ?? []).toEqual([
    'react',
    'react-dom',
    '@deepseek-ai/dsh-client-store',
    '@deepseek-ai/dsh-client-ui-primitives',
    '@deepseek-ai/dsh-client-ui-slots',
  ])
  for (const [name, workspace] of Object.entries(knip.workspaces ?? {})) {
    if (name === 'apps/deeptail') continue
    expect([name, workspace['ignoreDependencies']]).toEqual([name, undefined])
  }
  await expectIgnoredDependenciesAreSuppliedToTheClient(
    (knip.workspaces?.['apps/deeptail']?.['ignoreDependencies'] ?? []) as string[],
  )

  await expectBiomeUnchanged()
}

/**
 * Assert that Biome still runs every rule it is configured with, at the level
 * that stops a build.
 */
async function expectBiomeUnchanged(): Promise<void> {
  const biome = JSON.parse(await readFile('biome.json', 'utf8')) as {
    files?: { includes?: string[] }
    linter?: { enabled?: boolean; rules?: Record<string, unknown> }
    overrides?: unknown
  }
  expect(biome.overrides).toBeUndefined()
  expect(biome.files?.includes ?? []).toEqual(['**', '!**/dist', '!**/lib', '!**/gen', '!**/target', '!**/*.min.js'])
  // A rule set to `off`, or a preset dropped, is a check removed rather than
  // satisfied. So is a rule turned down: a finding reported as information is a
  // finding the pipeline walks past, and only `off` was ever rejected here.
  const rules = biome.linter?.rules ?? {}
  expect(rules.preset).toBe('recommended')
  const levels = Object.values(rules).flatMap((group) =>
    typeof group === 'object' && group !== null ? Object.values(group as Record<string, unknown>) : [group],
  )
  expect(levels.filter((level) => level === 'off' || level === 'info' || level === 'warn')).toEqual([])
  expect(biome.linter?.enabled).not.toBe(false)
}

/**
 * Assert that nothing sits in knip's ignore list on its own say-so.
 *
 * These are the modules the harness client leaves for the host application to
 * supply: it builds against them and externalises them, so they are declared
 * here, resolved at runtime, and imported by nothing in this repository. That
 * is a fact about the client's manifest rather than a claim, so it is read
 * from the client's manifest — a name that cannot be found there is a name
 * that has no business being excused.
 * @param ignored - the names the ignore list holds.
 */
async function expectIgnoredDependenciesAreSuppliedToTheClient(ignored: readonly string[]): Promise<void> {
  const client = JSON.parse(
    await readFile('apps/deeptail/node_modules/@deepseek-ai/dsh-client-web/package.json', 'utf8'),
  ) as Record<string, Record<string, string> | undefined>
  const externalised = new Set(
    ['dependencies', 'devDependencies', 'peerDependencies'].flatMap((kind) => Object.keys(client[kind] ?? {})),
  )
  expect(ignored.filter((name) => !externalised.has(name))).toEqual([])
  expect(ignored.length).toBeGreaterThan(0)

  const app = JSON.parse(await readFile('apps/deeptail/package.json', 'utf8')) as {
    dependencies?: Record<string, string>
  }
  // A name excused but no longer declared is a stale excuse.
  expect(ignored.filter((name) => app.dependencies?.[name] === undefined)).toEqual([])
}

it('keeps every suppression list at its agreed contents', async () => {
  await expectSuppressionListsUnchanged()
})
