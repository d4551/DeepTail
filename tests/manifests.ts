/**
 * The manifests and the lockfile, read once for every suite that needs them.
 *
 * A floor test, a ban test and a drift test all read the same declarations;
 * one copy of the read keeps them from drifting into two notions of what the
 * manifests say.
 *
 * @module
 */

import { readFile } from 'node:fs/promises'
import { EMPTY_SECTION, isJsonObject, readJsonc } from '../scripts/jsonc.ts'
import { repositoryFiles } from '../scripts/source-tree.ts'
import { readJsoncSync } from './jsonc-io.ts'

/** Every kind of dependency a manifest can declare. */
const DEPENDENCY_KINDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const

/**
 * Every dependency this repository declares, from every manifest it ships and
 * every kind each one uses.
 * @returns name to declared range.
 */
export async function everyDependency(): Promise<Map<string, string>> {
  const manifests = await Promise.all(
    repositoryFiles(['package.json']).map(async (manifest) => readJsonc(await readFile(manifest.path, 'utf8'))),
  )
  const found = new Map<string, string>()
  for (const parsed of manifests) {
    for (const kind of DEPENDENCY_KINDS) {
      const raw = parsed[kind]
      const declarations = isJsonObject(raw) ? raw : EMPTY_SECTION
      for (const [name, range] of Object.entries(declarations)) {
        if (typeof range === 'string') found.set(name, range)
      }
    }
  }
  return found
}

/**
 * Every package name the lockfile resolves, scopes included.
 * @returns one entry per resolved package.
 */
export function lockfileNames(): Set<string> {
  const lock = readJsoncSync('bun.lock')
  const packages = isJsonObject(lock.packages) ? lock.packages : EMPTY_SECTION
  const names = new Set<string>()
  for (const key of Object.keys(packages)) {
    // A key is "name@version" (scoped names carry an extra @ before the
    // version), so the last @ splits the name off.
    const at = key.lastIndexOf('@')
    names.add(at > 0 ? key.slice(0, at) : key)
  }
  const workspaces = isJsonObject(lock.workspaces) ? lock.workspaces : EMPTY_SECTION
  for (const entry of Object.values(workspaces)) {
    if (isJsonObject(entry) && typeof entry.name === 'string') names.add(entry.name)
  }
  return names
}
