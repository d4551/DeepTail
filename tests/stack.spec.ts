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
import { EMPTY_SECTION, isJsonObject, readJsonc } from '../scripts/jsonc.ts'
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
  '@babel/parser': '8.0',
  '@babel/traverse': '8.0',
  '@babel/types': '8.0',
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
  '@happy-dom/global-registrator': '20.14',
  '@stryker-mutator/core': '10.0',
  '@tauri-apps/api': '2.11',
  '@tauri-apps/cli': '2.11',
  '@types/bun': '1.4',
  '@types/node': '26.5',
  '@types/semver': '7.8',
  'jsonc-parser': '3.3',
  knip: '6.35',
  'oxc-parser': '0.149',
  oxlint: '1.82',
  parse5: '8.0',
  playwright: '1.63',
  'playwright-core': '1.63',
  react: '19.3',
  'react-dom': '19.3',
  semver: '7.8',
  typescript: '7.0',
  vite: '8.3',
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
 * @param declared - every dependency the repository declares.
 * @returns one line per tool whose floor is missing or stale.
 */
function unstatedFloors(declared: ReadonlyMap<string, string>): string[] {
  const unstated: string[] = []
  for (const [name, range] of declared) {
    const floor = FLOORS[name]
    if (floor === undefined) {
      unstated.push(`${name} is installed with no floor stated`)
      continue
    }
    const pinned = coerce(range)
    if (pinned === null) continue
    if (`${major(pinned)}.${minor(pinned)}` !== floor) {
      unstated.push(`${name} ${range} is held at a floor that no longer matches it: ${floor}`)
    }
  }
  return unstated
}

describe('stack floors', () => {
  it('states a floor for everything it declares, at exactly the version declared', () => {
    const declared = everyDependency()
    expect(unstatedFloors(declared)).toEqual([])
  })

  it('holds every declared version at or above its floor', () => {
    const declared = everyDependency()
    expect(belowFloor(declared)).toEqual([])
  })

  it('holds the floors to the exact set the manifests declare', () => {
    // A floor for something nothing declares is a floor that can never be
    // checked, and a declaration nothing floors is the hole the case above
    // reports. The two sets must name exactly each other.
    const declared = new Set(everyDependency().keys())
    const floored = new Set(Object.keys(FLOORS))
    expect([...declared].filter((name) => !floored.has(name))).toEqual([])
    expect([...floored].filter((name) => !declared.has(name))).toEqual([])
  })

  it('reads a range the way semver does, so a caret and a pin are held alike', () => {
    // The reader is `coerce`, which reads the first version out of a range. The
    // whole floor table is driven, with one entry replaced by each shape the
    // manifests carry: the readable ones sit at their floors, and a shape no
    // version can be read out of is reported rather than silently passing.
    const shapes = new Map([
      ['caret', '^1.2.3'],
      ['tilde', '~2.3.4'],
      ['exact', '3.4.5'],
      ['workspace', 'workspace:*'],
    ])
    for (const [shape, range] of shapes) {
      const driven = new Map(Object.entries(FLOORS))
      driven.set('typescript', range)
      const read = belowFloor(driven)
      if (shape === 'workspace') {
        expect(read).toEqual(['typescript declares an unreadable range: workspace:*'])
      } else {
        expect(read).toEqual([`typescript ${range} is below the 7.0 floor`])
      }
    }
  })

  it('reports the highest version a range admits, not the one it names', () => {
    // `maxSatisfying` is what the outdated gate reads, so a range that admits a
    // version above the floor is held by what the range admits, not by the
    // example version inside it.
    expect(maxSatisfying(['1.2.3', '1.9.0'], '^1.2.3')).toBe('1.9.0')
    expect(satisfies('1.9.0', '^1.2.3')).toBe(true)
    expect(satisfies('2.0.0', '^1.2.3')).toBe(false)
  })
})

describe('the checker configuration', () => {
  it('runs the TypeScript compiler the manifest pins, with no parallel checker', async () => {
    const manifest = readJsonc(await readFile('package.json', 'utf8'))
    const scripts = isJsonObject(manifest['scripts']) ? manifest['scripts'] : EMPTY_SECTION
    const typecheck = typeof scripts['typecheck'] === 'string' ? scripts['typecheck'] : ''
    expect(typecheck).toContain('tsc')
    expect(typecheck).not.toContain('tsgo')
  })

  it('reads the bun cache out of the installer configuration, not out of the air', async () => {
    // bunfig.toml is TOML, which the JSONC reader does not read; the line is
    // read where it is written, inside the installer section, so a cache moved
    // outside `[install]` — or off the workspace entirely — fails here.
    const config = await readFile('bunfig.toml', 'utf8')
    const install = config.slice(config.indexOf('[install]'), config.indexOf('[test]'))
    expect(install).toContain('linker = "isolated"')
    expect(install).toContain('dir = ".tmp-bun/cache"')
  })

  it('keeps every linter category enabled', async () => {
    const config = readJsonc(await readFile('.oxlintrc.json', 'utf8'))
    const categories = isJsonObject(config['categories']) ? config['categories'] : EMPTY_SECTION
    const rules = isJsonObject(config['rules']) ? config['rules'] : EMPTY_SECTION
    for (const category of ['correctness', 'suspicious', 'perf', 'pedantic']) {
      expect(categories[category]).toBe('error')
    }
    // A rule switched off is a defect hidden rather than fixed.
    expect(Object.values(rules).filter((level) => level === 'off')).toEqual([])
    // The linter carries no ignore list: what it reads is decided by the
    // repository's own ship list, not by a second list here.
    expect(config['ignorePatterns']).toBeUndefined()
    expect(config['overrides']).toBeUndefined()
  })
})
