/**
 * Stack floors and checker configuration.
 *
 * A toolchain that silently slips back a major version, or a checker that is
 * quietly switched off, is a regression no other gate reports: the build still
 * succeeds and every other suite stays green. These assertions read the
 * manifests and the source that actually ship. The policy bans — the retired
 * UI frameworks, the legacy pipeline configs, the one-page shell and the bun
 * pin — live in `stack-policy.spec.ts`.
 *
 * The floors are held to the pins deliberately. A floor written below what is
 * installed can never fail, so it rots into decoration; holding the two equal
 * means a downgrade fails here and an upgrade has to be stated here, and every
 * tool the repository installs must appear, so nothing joins without a floor.
 */

import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { coerce, gte, major, maxSatisfying, minor, satisfies } from 'semver'
import { readLock } from '../scripts/manifest.ts'
import { readOxlintConfig } from './checkers.ts'
import { everyDependency } from './manifests.ts'

/**
 * The major.minor every dependency this repository declares is held at.
 *
 * Every one of them, not only the tools at the root: a workspace manifest is
 * exactly as able to slip back a version, and `vite` sat two minors above a
 * floor that only the root was ever checked against — the rot this table exists
 * to prevent, present and unreported.
 */
const FLOORS: Readonly<Record<string, string>> = {
  '@axe-core/playwright': '4.13',
  '@biomejs/biome': '2.5',
  '@deepseek-ai/cordis': '4.0',
  '@deepseek-ai/cordis-plugin-loader': '1.0',
  '@deepseek-ai/dsh-api-session-controller': '0.1',
  '@deepseek-ai/dsh-brand': '0.1',
  '@deepseek-ai/dsh-client-modules': '0.1',
  '@deepseek-ai/dsh-client-store': '0.1',
  '@deepseek-ai/dsh-client-ui-primitives': '0.1',
  '@deepseek-ai/dsh-client-ui-slots': '0.1',
  '@deepseek-ai/dsh-client-web': '0.1',
  '@deepseek-ai/dsh-invariants': '0.1',
  '@deepseek-ai/dsh-jobs': '0.1',
  '@deepseek-ai/dsh-session': '0.1',
  '@deepseek-ai/dsh-tools': '0.1',
  '@deepseek-ai/dsh-util-values': '0.1',
  '@deepseek-ai/schemastery': '3.18',
  '@deeptail/host-fleet': '0.1',
  '@stryker-mutator/core': '10.0',
  '@tauri-apps/api': '2.11',
  '@tauri-apps/cli': '2.11',
  '@types/bun': '1.4',
  '@types/node': '26.5',
  '@types/semver': '7.8',
  'jsonc-parser': '3.3',
  knip: '6.34',
  'oxc-parser': '0.149',
  oxlint: '1.82',
  parse5: '8.0',
  playwright: '1.63',
  'playwright-core': '1.63',
  react: '19.2',
  'react-dom': '19.2',
  semver: '7.8',
  typescript: '7.0',
  vite: '8.2',
}

/**
 * Dependencies pinned below their floor, or not declared at all.
 * @param found - every dependency the repository declares.
 * @returns one line per tool that fails its floor.
 */
function belowFloor(found: ReadonlyMap<string, string>): string[] {
  const behind: string[] = []
  for (const [name, floor] of Object.entries(FLOORS)) {
    const range = found.get(name)
    if (range === undefined) {
      behind.push(`${name} is not declared anywhere`)
      continue
    }
    const pinned = coerce(range)
    if (pinned === null) {
      behind.push(`${name} declares an unreadable range: ${range}`)
      continue
    }
    if (!gte(pinned, `${floor}.0`)) behind.push(`${name} ${range} is below the ${floor} floor`)
  }
  return behind
}

/**
 * Dependencies declared with no floor, or with one that no longer matches what
 * is declared.
 * @param declared - every dependency the repository declares, of any kind.
 * @returns one line per dependency whose floor has drifted from its range.
 */
function floorDrift(declared: ReadonlyMap<string, string>): string[] {
  const wrong: string[] = []
  for (const [name, range] of declared) {
    const floor = FLOORS[name]
    if (floor === undefined) {
      wrong.push(`${name} is installed with no floor stated`)
      continue
    }
    const pinned = coerce(range)
    const at = pinned === null ? '' : `${String(major(pinned))}.${String(minor(pinned))}`
    // A floor below the pin can never fail, so it would rot silently.
    if (at !== floor) wrong.push(`${name} is pinned at ${at} but its floor says ${floor}`)
  }
  return wrong
}

/**
 * Every way a resolved lockfile can disagree with the floors and the declared
 * ranges, read off the lock's packages and workspaces sections.
 * @param declared - every dependency the repository declares, of any kind.
 * @returns one line per disagreement.
 */
function lockfileOffences(declared: ReadonlyMap<string, string>): string[] {
  const resolved = resolvedVersions(readLock('bun.lock'))
  return Object.entries(FLOORS).flatMap(([name, floor]) =>
    resolutionOffences(name, floor, resolved.get(name), declared.get(name)),
  )
}

/** A version the lock states as resolved, prerelease and build metadata included. */
const RESOLVED_VERSION = /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/u

/**
 * Every version the lockfile actually resolved, by package name.
 * @param lock - the parsed lockfile.
 * @returns one entry per package, holding every version resolved for it.
 */
function resolvedVersions(lock: ReturnType<typeof readLock>): Map<string, string[]> {
  const resolved = new Map<string, string[]>()
  for (const [name, entry] of lock.packages) {
    // Each package is a tuple whose first element is "name@version".
    const resolvedId = typeof entry[0] === 'string' ? entry[0] : ''
    const version = resolvedId.startsWith(`${name}@`) ? resolvedId.slice(name.length + 1) : ''
    if (RESOLVED_VERSION.test(version)) resolved.set(name, [...(resolved.get(name) ?? []), version])
  }
  // Workspace members are versioned by their own manifest, mirrored in the
  // lock's workspaces section rather than resolved as registry packages.
  for (const workspace of lock.workspaces.values()) {
    if (workspace.version === undefined) continue
    resolved.set(workspace.name, [...(resolved.get(workspace.name) ?? []), workspace.version])
  }
  return resolved
}

/**
 * Every way one package's resolved versions disagree with what was asked of it.
 * @param name - the package.
 * @param floor - the major.minor it is held at.
 * @param versions - every version the lock resolved for it.
 * @param range - the range the repository declares, when it declares one.
 * @returns one line per disagreement.
 */
function resolutionOffences(
  name: string,
  floor: string,
  versions: readonly string[] | undefined,
  range: string | undefined,
): string[] {
  if (versions === undefined || versions.length === 0) {
    return [`${name} is declared but the lockfile never resolved it`]
  }
  const offences: string[] = []
  const newest = maxSatisfying(versions, '*', { includePrerelease: true })
  // Prerelease identifiers are stripped for the floor comparison, exactly
  // as the manifest floors do: 0.1.2-alpha.3 sits at the 0.1 floor.
  const comparable = newest === null ? null : coerce(newest)
  if (comparable === null || !gte(comparable, `${floor}.0`)) {
    offences.push(`${name} resolved at ${versions.join(', ')} — below the ${floor} floor`)
  }
  if (range !== undefined && newest !== null && !satisfies(newest, range)) {
    offences.push(`${name} resolved at ${newest} does not satisfy the declared ${range}`)
  }
  return offences
}

describe('stack floors', () => {
  it('pins every tool at or above its floor', () => {
    expect(belowFloor(everyDependency())).toEqual([])
  })

  it('states a floor for everything it declares, at exactly the version declared', () => {
    expect(floorDrift(everyDependency())).toEqual([])
  })

  it('binds the lockfile to the declarations and the floors', () => {
    // A manifest can claim a version the lockfile never resolved: the floors
    // would pass while `bun install --frozen-lockfile` fails or, worse, an
    // older resolved copy ships. The lock is the truth of what is installed.
    expect(lockfileOffences(everyDependency())).toEqual([])
  })

  it('keeps the installer hermetic and ships no release hold', async () => {
    const bunfig = await readFile('bunfig.toml', 'utf8')
    // No version is withheld from resolution: a pin behind is the outdated
    // gate's finding, not a policy's, so nothing stands between the registry
    // and what the gate demands.
    expect(bunfig.includes('minimumReleaseAge')).toBe(false)
    // The installer cache is redirected into the workspace so the gate chain
    // is hermetic: a read-only home directory cannot change what resolves.
    const cache = /cache\s*=\s*\{\s*dir\s*=\s*["']([^"']+)["']/u.exec(bunfig)
    expect(cache?.[1]).toBe('.tmp-bun/cache')
  })

  it('keeps every linter category enabled', () => {
    const config = readOxlintConfig('.oxlintrc.json')
    for (const category of ['correctness', 'suspicious', 'perf', 'pedantic']) {
      expect([category, config.categories.get(category)]).toEqual([category, 'error'])
    }
    // A rule held below `error` is a defect reported at a level nothing fails
    // on, which is a defect hidden rather than fixed. `off` alone was the same
    // oversight: `warn` and `info` silence a build exactly as completely.
    expect([...config.rules].filter(([, level]) => level !== 'error')).toEqual([])
    // The linter carries no ignore list: what it reads is decided by the
    // repository's own ship list, not by a second list here. The keys are
    // asserted absent rather than undefined-valued, because a key present and
    // spelled `null` reads as neither, and silences exactly as much.
    expect(config.keys.filter((key) => key === 'ignorePatterns' || key === 'overrides')).toEqual([])
  })
})
