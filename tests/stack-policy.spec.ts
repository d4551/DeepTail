/**
 * The stack policy: what the workspace must not install, what a retired
 * pipeline is configured by, and what an installed package's own manifest says
 * it ships.
 *
 * The bans are read from the tree itself — every manifest, the lockfile and the
 * files the repository ships — so a reintroduction fails where it is written
 * rather than where a user meets it. The dialect cases drive the derivation
 * against the exact cheat it exists for, and against the packages this
 * repository installs.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { coerce, gte } from 'semver'
import { type Json, readJsonc } from '../scripts/jsonc.ts'
import { repositoryFiles } from '../scripts/source-tree.ts'
import { joined } from './fixtures.ts'
import { everyDependency, lockfileNames } from './manifests.ts'
import { dialectPackageOffences, installedManifest } from './stack-packages.ts'
import {
  FLOORS,
  isRetiredPackage,
  isRetiredPipelineConfig,
  isRetiredVocabulary,
  PREVIOUS_LINES,
} from './stack-policy.ts'
import { TREE_SCAN_BUDGET_MS } from './tree-budget.ts'
import { installedVite, viteDialectSuffixes } from './vite-face.ts'

/** The dialect suffixes the installed bundler compiles, read once. */
const DIALECTS = new Set(viteDialectSuffixes(installedVite('.js')))

/** The stem a retired utility pipeline names its configuration file with, assembled. */
const CONFIG_STEM = joined('tail', 'wind')

/** The vocabularies, pipelines and scopes a manifest reintroducing a framework would name. */
const RETIRED_DECLARATIONS = `vue nuxt @vue/runtime-dom @nuxt/kit daisyui tailwindcss htmx.org
  @base-ui-components/core open-props picocss @picocss/pico water.css panda-css @pandacss/dev
  @vanilla-extract/css styled-components babel-plugin-styled-components @emotion/css sass less stylus
  postcss lightningcss unocss @unocss/core windi windicss rome @rometools/rome stryker stryker-api`.split(/\s+/u)

/** The names a retired framework republishes itself under. */
const REPUBLISHED = `bootstrap-vue react-bootstrap fomantic-ui fomantic-ui-css semantic-ui-css
  semantic-ui-react jquery-ui jquery-ui-dist jquery-mobile materialize-css
  @materializecss/materialize`.split(/\s+/u)

/**
 * The names a vendor published before it republished under the scope it uses
 * today: Stryker shipped as `stryker`, `stryker-api` and the runners of the
 * same shape before the whole family moved to `@stryker-mutator/`, and Rome
 * shipped as `rome` and `@rometools/` before it was renamed to Biome. Both
 * renames are read off npm itself: the published versions of `stryker` carry
 * the migration message naming `@stryker-mutator/core`, and every published
 * version of `rome` carries "Version no longer supported".
 */
const RENAMED_VENDORS = `rome @rometools/rome @rometools/cli-darwin-arm64 stryker stryker-api`.split(/\s+/u)

/** The names those two vendors publish under today, which no ban may refuse. */
const RENAMED_CURRENT = '@biomejs/biome @stryker-mutator/core @stryker-mutator/api @rometools-reborn/typo'.split(/\s+/u)

/** The packages this repository installs, which no ban may refuse. */
const PLATFORM_PACKAGES = 'typescript react vite @biomejs/biome oxlint @deepseek-ai/cordis'.split(/\s+/u)

/** The configuration file names the retired pipelines read. */
const RETIRED_CONFIGS = [
  joined(CONFIG_STEM, '.config.js'),
  joined('apps/deeptail/', CONFIG_STEM, '.config.ts'),
  'postcss.config.cjs',
  'postcss.config.mjs',
  'unocss.config.ts',
  'uno.config.mjs',
  'windicss.config.js',
  'daisyui.config.js',
  'purgecss.config.js',
  'autoprefixer.config.js',
  '.postcssrc',
  '.postcssrc.json',
  '.unocssrc',
]

/** The dependency whose floor the `packageManager` pin is held to. */
const MANAGER_FLOOR_KEY = '@types/bun'

/**
 * The name and the version a `packageManager` pin states, when it states both.
 * @param value - the manifest field's value.
 * @returns the name and the version, or null when the pin is not one.
 */
function managerPin(value: Json | undefined): readonly [string, string] | null {
  if (typeof value !== 'string') return null
  const match = /^([@a-z0-9/-]+)@((?:\d+\.){2}\d+)$/u.exec(value)
  if (match === null) return null
  const [, name, version] = match
  if (name === undefined || version === undefined) return null
  return [name, version]
}

/**
 * The versions the floor table and the previous-line table state for one tool.
 * @param name - the tool's package name.
 * @returns the floor and the line before it, both read.
 */
function statedLines(name: string): readonly [string, string] {
  const floor = FLOORS[name]
  const before = PREVIOUS_LINES[name]
  if (floor === undefined || before === undefined) throw new Error(`${name} states no floor and previous line`)
  return [floor, before]
}

describe('the stack policy bans', () => {
  it(
    'installs none of the packages the design system retired',
    async () => {
      // Absence, not a floor: a retired framework at its newest version is still
      // a second vocabulary the tokens and the sheets never read. The manifests
      // are read for every retired package, and the lockfile for the
      // vocabularies alone: the bundler pulls a pipeline of its own, and what
      // nothing may pull in is a second styling vocabulary.
      const declared = [...(await everyDependency()).keys()]
      expect(declared.filter((name) => isRetiredPackage(name))).toEqual([])
      expect([...lockfileNames()].filter((name) => isRetiredVocabulary(name))).toEqual([])
    },
    TREE_SCAN_BUDGET_MS,
  )
})

describe('the stack policy names a planted reintroduction', () => {
  it('by vocabulary, by preprocessor, and by the scope a vendor publishes under', () => {
    expect(RETIRED_DECLARATIONS.filter((name) => isRetiredPackage(name))).toEqual(RETIRED_DECLARATIONS)
    expect(PLATFORM_PACKAGES.filter((name) => isRetiredPackage(name))).toEqual([])
    // The narrower reading is what the lockfile is held to: a pipeline that
    // arrives through the bundler is not a package this workspace declares.
    expect(['postcss', 'lightningcss'].filter((name) => isRetiredVocabulary(name))).toEqual([])
    expect(['tailwindcss', '@emotion/react'].filter((name) => isRetiredVocabulary(name))).toEqual([
      'tailwindcss',
      '@emotion/react',
    ])
  })
})

describe('the stack policy names the name a framework republishes itself under', () => {
  it('refuses a renamed package, a fork and a vendor scope alike', () => {
    // A framework renamed for a host framework, a fork that took its place, and
    // the scoped package a vendor publishes its own build under are the same
    // vocabulary as the name the list already holds.
    expect(REPUBLISHED.filter((name) => isRetiredPackage(name))).toEqual(REPUBLISHED)
  })

  it('refuses the name and the vendor scope a tool carried before it was renamed', () => {
    // The rename is the shape a stale pin takes: the version is current, the
    // tool is real, and the name it arrives under was dropped years earlier.
    expect(RENAMED_VENDORS.filter((name) => isRetiredPackage(name))).toEqual(RENAMED_VENDORS)
    expect(RENAMED_CURRENT.filter((name) => isRetiredPackage(name))).toEqual([])
  })

  it('and admits the platform packages however close a name sits to one', () => {
    const admitted = 'react react-dom @deeptail/host-fleet biome romeo-lib @stryker-mutator/api'.split(/\s+/u)
    expect(admitted.filter((name) => isRetiredPackage(name))).toEqual([])
    expect(['@picocss/pico', '@materializecss/materialize'].filter((name) => isRetiredVocabulary(name))).toEqual([
      '@picocss/pico',
      '@materializecss/materialize',
    ])
  })
})

describe('the dialect a package declares in its own manifest', () => {
  it('names a sidecar, an entry point and a pipeline bin', () => {
    expect(dialectPackageOffences('a', { sass: './src/index.scss' }, DIALECTS)).toEqual([
      'a states a sass sidecar: ./src/index.scss',
    ])
    expect(dialectPackageOffences('a', { style: './dist/index.scss' }, DIALECTS)).toEqual([
      'a states a style sidecar: ./dist/index.scss',
    ])
    expect(dialectPackageOffences('a', { exports: { './x': './dist/x.scss' } }, DIALECTS)).toEqual([
      'a points exports at ./dist/x.scss, a .scss stylesheet',
    ])
    expect(dialectPackageOffences('a', { bin: { lessc: './bin/lessc.js' } }, DIALECTS)).toEqual([
      'a installs a lessc command, which is a CSS pipeline',
    ])
    expect(dialectPackageOffences('a', { postcss: { plugins: {} } }, DIALECTS)).toEqual([
      'a configures its own postcss pipeline in its manifest',
    ])
  })

  it('reads a plain stylesheet, a plain entry point and a plain bin as nothing of the sort', () => {
    expect(dialectPackageOffences('a', { style: './dist/index.css' }, DIALECTS)).toEqual([])
    expect(dialectPackageOffences('a', { main: './index.js', exports: { '.': './index.js' } }, DIALECTS)).toEqual([])
    expect(dialectPackageOffences('a', { bin: { a: './bin.js' } }, DIALECTS)).toEqual([])
    expect(dialectPackageOffences('a', { dependencies: { postcss: '^8' } }, DIALECTS)).toEqual([])
  })
})

describe('every installed package is held to the manifest it ships', () => {
  it(
    'and the derivation reads the package whose name says nothing',
    async () => {
      // The derived half of the policy: a package whose name says nothing can
      // still ship a dialect, and this is what reads its own manifest for it.
      const declared = [...(await everyDependency()).keys()]
      const installed = declared.flatMap((name) => {
        const manifest = installedManifest(name)
        return manifest === undefined ? [] : dialectPackageOffences(name, manifest, DIALECTS)
      })
      expect(installed).toEqual([])
      expect(declared.filter((name) => installedManifest(name) !== undefined).length).toBeGreaterThan(0)
      expect(installedManifest('@deeptail/host-fleet-never-published')).toBeUndefined()
    },
    TREE_SCAN_BUDGET_MS,
  )
})

describe('the stack policy refuses a retired pipeline’s configuration file', () => {
  it('by the name the pipeline gives its own configuration', () => {
    // The pipelines state their configuration file the same way — `<tool>
    // `.config.<extension>` — and each reads a dotfile when no config file is
    // present. Both forms are named, so a reintroduction fails in either.
    for (const label of RETIRED_CONFIGS) {
      expect([label, isRetiredPipelineConfig(label)]).toEqual([label, true])
    }
  })

  it(
    'and ships none of them, while the toolchain’s own configuration stands',
    () => {
      // The v3-and-earlier pipeline was configured by a file; the v4-and-later
      // one compiles away inside the build. Either is a pipeline this product
      // retired, and a config file is the shape a reintroduction takes first.
      const shipped = repositoryFiles(['.js', '.cjs', '.mjs', '.ts', '.json', '.yml', '.yaml', '.toml']).map(
        (file) => file.label,
      )
      expect(shipped.filter((label) => isRetiredPipelineConfig(label))).toEqual([])
      // The controls: the bundler, the linter, the type checker, the dead-code
      // finder, the mutation runner and the installer are configured by files of
      // the same shape, and none of them is a CSS pipeline's.
      expect(shipped).toContain('apps/deeptail/vite.config.ts')
      expect(shipped).toContain('bunfig.toml')
      expect(shipped).toContain('biome.json')
    },
    TREE_SCAN_BUDGET_MS,
  )
})

describe('the stack policy bans the rest of the ship list', () => {
  it(
    'ships exactly one page, wired to exactly the one module entry',
    async () => {
      // A second page is a second shell, and a second script entry is a
      // per-page module the design system and the gates never read: the SSOT is
      // one page loading one module.
      const pages = repositoryFiles(['.html', '.htm']).map((file) => file.label)
      expect(pages).toEqual(['apps/deeptail/index.html'])
      const html = await readFile('apps/deeptail/index.html', 'utf8')
      const entries = [...html.matchAll(/<script\b([^>]*)>/gu)].map((match) => match[1] ?? '')
      expect(entries).toEqual([' type="module" src="/src/main.ts"'])
    },
    TREE_SCAN_BUDGET_MS,
  )

  it('runs on a bun at the floor, and pins the manager to exactly what runs', async () => {
    const manifest = readJsonc(await readFile('package.json', 'utf8'))
    const declared = managerPin(manifest.packageManager)
    if (declared === null) throw new Error('package.json must pin the package manager as bun@x.y.z')
    const [name, version] = declared
    // The floor is read from the table rather than written here: the pin and the
    // floor are one decision, and a floor restated beside the reader is a second
    // copy of it.
    const [floor, previous] = statedLines(MANAGER_FLOOR_KEY)
    const pinned = coerce(version)
    const atFloor = coerce(floor)
    const before = coerce(previous)
    if (pinned === null || atFloor === null || before === null) throw new Error('the bun pin is unreadable')
    // The manager is named as well as versioned: a reader that took the version
    // out of the middle of the pin would read a fork as the bun this runs on.
    expect(name).toBe('bun')
    expect(gte(pinned, atFloor)).toBe(true)
    // The pin and the runtime drift apart silently — an upgraded bun with a
    // stale pin, or a pin ahead of the binary — so the pin must say exactly
    // what runs, and moving either is a decision this test witnesses.
    expect(Bun.version).toBe(version)
    // And the line before this one is refused, read from the same table: a pin
    // back a minor is the shape a stale toolchain takes.
    expect(gte(before, atFloor)).toBe(false)
  })
})
