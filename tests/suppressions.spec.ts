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
import { EMPTY_SECTION, isJsonObject, type Json } from '../scripts/jsonc.ts'
import { readManifest } from '../scripts/manifest.ts'

/**
 * One section of a configuration, refused when it is written as anything else.
 *
 * A section read as empty because it was written as a string or a list is a
 * list of suppressions this suite would walk and find nothing in, and report
 * as pinned.
 * @param held - the value under the key.
 * @param where - the file and key, named in the refusal.
 * @returns the section, empty when the key is absent.
 */
function section(held: Json | undefined, where: string): { readonly [key: string]: Json } {
  if (held === undefined) return EMPTY_SECTION
  expect([where, isJsonObject(held)]).toEqual([where, true])
  return isJsonObject(held) ? held : EMPTY_SECTION
}

/** Pin the dead-code reader's configuration to its empty-handed shape. */
function pinKnip(): void {
  const declared = section(readManifest('knip.json').workspaces, 'knip.json workspaces')
  for (const [name, workspace] of Object.entries(declared)) {
    expect([name, section(workspace, `knip.json ${name}`).ignoreDependencies]).toEqual([name, undefined])
  }
}

/** Pin the first linter: every rule at `error`, no file list, no overrides. */
function pinBiome(): void {
  const biome = readManifest('biome.json')
  // Biome names no files of its own: coverage follows git's ship list through
  // the ignore file the repository keeps, and one list decides for every
  // checker.
  expect(biome.files).toBeUndefined()
  expect(section(biome.vcs, 'biome.json vcs').useIgnoreFile).toBe(true)
  expect(biome.overrides).toBeUndefined()
  const linter = section(biome.linter, 'biome.json linter')
  const rules = section(linter.rules, 'biome.json linter.rules')
  expect(rules.preset).toBe('recommended')
  // Every level this config states, with the preset name -- which is not a
  // level -- left out. Filtering for `off` alone was the same oversight this
  // file's own header describes: a rule dropped to `warn` or `info` reports
  // nothing that fails a build, and reads as nothing at all in a diff.
  const levels = Object.entries(rules).flatMap(([group, value]) =>
    isJsonObject(value) ? Object.values(value) : group === 'preset' ? [] : [value],
  )
  expect(levels.filter((level) => level !== 'error')).toEqual([])
  expect(linter.enabled).not.toBe(false)
}

/** Pin the second linter: every category at `error`, no ignore list. */
function pinOxlint(): void {
  const oxlint = readManifest('.oxlintrc.json')
  // `oxc` is on by default and a plugin list replaces that default rather than
  // adding to it, so leaving it out of the list switched a whole set of rules
  // off with nothing in the file saying so.
  expect(oxlint.plugins).toEqual(['typescript', 'unicorn', 'promise', 'oxc'])
  expect(oxlint.categories).toEqual({
    correctness: 'error',
    suspicious: 'error',
    perf: 'error',
    pedantic: 'error',
  })
  const rules = section(oxlint.rules, '.oxlintrc.json rules')
  expect(Object.values(rules).filter((level) => level !== 'error')).toEqual([])
  expect(oxlint.ignorePatterns).toBeUndefined()
  expect(oxlint.overrides).toBeUndefined()
}

it('keeps every suppression list empty', () => {
  pinKnip()
  pinBiome()
  pinOxlint()
})
