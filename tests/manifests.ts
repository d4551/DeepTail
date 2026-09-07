/**
 * The manifests and the lockfile, read once for every suite that needs them.
 *
 * A floor test, a ban test and a drift test all read the same declarations;
 * one copy of the read keeps them from drifting into two notions of what the
 * manifests say. The decoding itself is `../scripts/manifest.ts`, which the
 * gates read them through too, so a suite and the gate it checks cannot hold
 * two ideas of what a manifest is.
 *
 * @module
 */

import { declaredPins, readLock } from '../scripts/manifest.ts'

/** Where the lockfile the suites assert against sits. */
const LOCKFILE = 'bun.lock'

/**
 * Every dependency this repository declares, from every manifest it ships and
 * every kind each one uses.
 * @returns name to declared range.
 */
export function everyDependency(): Map<string, string> {
  return declaredPins()
}

/**
 * Every package name the lockfile resolves, scopes included.
 * @returns one entry per resolved package.
 */
export function lockfileNames(): Set<string> {
  const lock = readLock(LOCKFILE)
  const names = new Set<string>()
  for (const key of lock.packages.keys()) {
    // A key is "name@version" (scoped names carry an extra @ before the
    // version), so the last @ splits the name off.
    const at = key.lastIndexOf('@')
    names.add(at > 0 ? key.slice(0, at) : key)
  }
  for (const workspace of lock.workspaces.values()) names.add(workspace.name)
  return names
}
