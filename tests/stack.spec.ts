/**
 * Stack floors and checker configuration.
 *
 * A toolchain that silently slips back a version, or a checker that is
 * quietly switched off, is a regression no other gate reports: the build still
 * succeeds and every other suite stays green. These assertions read the
 * manifests and the source that actually ship. The policy bans — the retired
 * UI frameworks, the legacy pipeline configs, the one-page shell and the bun
 * pin — live in `stack-policy.spec.ts`.
 *
 * The floors are held to the pins deliberately, at the exact version the
 * manifests declare. A floor written below what is installed can never fail, so
 * it rots into decoration: stated at the major and minor alone it admitted
 * every patch downgrade inside the same minor, and an upgrade said nothing.
 * Holding the two equal means a downgrade of any depth fails here and an
 * upgrade has to be stated here, and every tool the repository installs must
 * appear, so nothing joins without a floor.
 */

import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { coerce, gte, major, maxSatisfying, satisfies } from 'semver'
import { EMPTY_SECTION, isJsonObject, readJsonc } from '../scripts/jsonc.ts'
import { everyDependency } from './manifests.ts'

/**
 * The exact version every dependency this repository declares is held at.
 *
 * Every one of them, not only the tools at the root: a workspace manifest is
 * exactly as able to slip back a version, and `vite` sat two minors above a
 * floor that only the root was ever checked against — the rot this table exists
 * to prevent, present and unreported.
 */
const FLOORS: Readonly<Record<string, string>> = {
  '@axe-core/playwright': '4.13.0',
  '@babel/parser': '8.0.5',
  '@babel/traverse': '8.0.5',
  '@babel/types': '8.0.5',
  '@biomejs/biome': '2.5.14',
  '@deepseek-ai/cordis': '4.0.2',
  '@deepseek-ai/cordis-plugin-loader': '1.0.3',
  '@deepseek-ai/dsh-api-session-controller': '0.1.2',
  '@deepseek-ai/dsh-brand': '0.1.2',
  '@deepseek-ai/dsh-client-modules': '0.1.2',
  '@deepseek-ai/dsh-client-store': '0.1.2',
  '@deepseek-ai/dsh-client-ui-primitives': '0.1.2',
  '@deepseek-ai/dsh-client-ui-slots': '0.1.2',
  '@deepseek-ai/dsh-client-web': '0.1.2',
  '@deepseek-ai/dsh-invariants': '0.1.2',
  '@deepseek-ai/dsh-jobs': '0.1.2',
  '@deepseek-ai/dsh-session': '0.1.2',
  '@deepseek-ai/dsh-tools': '0.1.2',
  '@deepseek-ai/dsh-util-values': '0.1.2',
  '@deepseek-ai/schemastery': '3.18.2',
  '@deeptail/host-fleet': '0.1.0',
  '@happy-dom/global-registrator': '20.14.5',
  '@stryker-mutator/core': '10.0.0',
  '@tauri-apps/api': '2.11.1',
  '@tauri-apps/cli': '2.11.4',
  '@types/bun': '1.4.2',
  '@types/node': '26.6.1',
  '@types/semver': '7.8.0',
  'jsonc-parser': '3.3.1',
  knip: '6.35.1',
  'oxc-parser': '0.150.0',
  oxlint: '1.83.0',
  parse5: '8.0.1',
  playwright: '1.63.0',
  'playwright-core': '1.63.0',
  react: '19.3.0',
  'react-dom': '19.3.0',
  semver: '7.8.5',
  typescript: '7.0.2',
  vite: '8.3.0',
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
    if (!gte(pinned, floor)) behind.push(`${name} ${range} is below the ${floor} floor`)
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
    if (pinned.version !== floor) {
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
      const driven = new Map([...Object.entries(FLOORS), ['typescript', range]])
      const read = belowFloor(driven)
      if (shape === 'workspace') {
        expect(read).toEqual(['typescript declares an unreadable range: workspace:*'])
      } else {
        expect(read).toEqual([`typescript ${range} is below the 7.0.2 floor`])
      }
    }
  })
})

describe('stack floors refuse an old major', () => {
  it('holds TypeScript at major 7, not 6', () => {
    const pinned = coerce(everyDependency().get('typescript'))
    if (pinned === null) throw new Error('typescript is not declared')
    expect(major(pinned)).toBe(7)
  })

  it('names every previous major this stack can slip back on', () => {
    const driven = new Map([
      ...Object.entries(FLOORS),
      ['@biomejs/biome', '1.0.0'],
      ['@stryker-mutator/core', '9.0.0'],
      ['@tauri-apps/api', '1.6.0'],
      ['oxlint', '0.1.0'],
      ['playwright', '1.62.1'],
      ['react', '18.3.1'],
      ['typescript', '6.9.2'],
      ['vite', '7.3.6'],
    ])
    expect(belowFloor(driven)).toEqual([
      '@biomejs/biome 1.0.0 is below the 2.5.14 floor',
      '@stryker-mutator/core 9.0.0 is below the 10.0.0 floor',
      '@tauri-apps/api 1.6.0 is below the 2.11.1 floor',
      'oxlint 0.1.0 is below the 1.83.0 floor',
      'playwright 1.62.1 is below the 1.63.0 floor',
      'react 18.3.1 is below the 19.3.0 floor',
      'typescript 6.9.2 is below the 7.0.2 floor',
      'vite 7.3.6 is below the 8.3.0 floor',
    ])
  })

  it('names a downgrade inside the same minor, which a floor at the major and minor admits', () => {
    // The exactness the table is held to: a floor stated at `7.0` admitted
    // 7.0.1 and 7.0.0 alike, so the pin could walk backwards a patch at a time
    // with every gate green.
    const driven = new Map([...Object.entries(FLOORS), ['@biomejs/biome', '2.5.13'], ['typescript', '7.0.1']])
    expect(belowFloor(driven)).toEqual([
      '@biomejs/biome 2.5.13 is below the 2.5.14 floor',
      'typescript 7.0.1 is below the 7.0.2 floor',
    ])
  })
})

describe('stack floors read a range', () => {
  it('reports the highest version a range admits, not the one it names', () => {
    // `maxSatisfying` is what the outdated gate reads, so a range that admits a
    // version above the floor is held by what the range admits, not by the
    // example version inside it.
    expect(maxSatisfying(['1.2.3', '1.9.0'], '^1.2.3')).toBe('1.9.0')
    expect(satisfies('1.9.0', '^1.2.3')).toBe(true)
    expect(satisfies('2.0.0', '^1.2.3')).toBe(false)
  })
})

describe('the Node floor', () => {
  it('admits the versions the manifest states and refuses the ones below them', async () => {
    // Driven off the declared engine range rather than a remembered number: a
    // manifest widened to admit an older runtime fails the first line, and one
    // that drops the current line fails the last.
    const manifest = readJsonc(await readFile('package.json', 'utf8'))
    const engines = isJsonObject(manifest['engines']) ? manifest['engines'] : EMPTY_SECTION
    const node = typeof engines['node'] === 'string' ? engines['node'] : ''
    expect(node).not.toBe('')
    expect(satisfies('22.18.0', node)).toBe(false)
    expect(satisfies('22.19.0', node)).toBe(true)
    expect(satisfies('23.5.0', node)).toBe(false)
    expect(satisfies('24.0.0', node)).toBe(true)
    expect(satisfies('26.6.1', node)).toBe(true)
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
    // A rule dropped to warn or info silences as much as one switched off:
    // `off` alone was the hole this suite's own header describes.
    expect(Object.values(rules).filter((level) => level !== 'error')).toEqual([])
    // The linter carries no ignore list: what it reads is decided by the
    // repository's own ship list, not by a second list here.
    expect(config['ignorePatterns']).toBeUndefined()
    expect(config['overrides']).toBeUndefined()
  })
})
