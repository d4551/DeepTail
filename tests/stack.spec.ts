/**
 * Stack floors, the supply-chain hold, checker configuration, and the bans on
 * legacy idioms and on switching a checker off.
 *
 * A toolchain that silently slips back a major version, or source that
 * reintroduces a pattern the project has moved past, is a regression no other
 * gate reports: the build still succeeds and every other suite stays green.
 * These assertions read the manifests and the source that actually ship.
 *
 * The floors are held to the pins deliberately. A floor written below what is
 * installed can never fail, so it rots into decoration; holding the two equal
 * means a downgrade fails here and an upgrade has to be stated here, and every
 * tool the repository installs must appear, so nothing joins without a floor.
 */

import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { type ParseError, parse as parseJsonc } from 'jsonc-parser'
import { coerce, gte, major, minor } from 'semver'
import * as bans from '../scripts/ban-gate.ts'
import { repositoryFiles } from '../scripts/source-tree.ts'
import * as styles from '../scripts/style-gate.ts'

/** Lowest acceptable major.minor for every tool the project pins. */
const FLOORS: Readonly<Record<string, string>> = {
  typescript: '7.0',
  vite: '8.0',
  playwright: '1.62',
  '@biomejs/biome': '2.5',
  oxlint: '1.80',
  knip: '6.33',
  '@tauri-apps/cli': '2.11',
  '@tauri-apps/api': '2.11',
  '@axe-core/playwright': '4.13',
  'oxc-parser': '0.147',
  parse5: '8.0',
  semver: '7.8',
  'jsonc-parser': '3.3',
  '@types/semver': '7.8',
  '@types/bun': '1.4',
  '@types/node': '26.4',
}

/** Every kind of dependency a manifest can declare. */
const DEPENDENCY_KINDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const

/**
 * Parse JSON with comments, as every tool that reads a tsconfig does.
 * @param text - the file contents.
 * @returns the parsed object.
 */
function readJsonc(text: string): Record<string, unknown> {
  const errors: ParseError[] = []
  const value = parseJsonc(text, errors, { allowTrailingComma: true }) as Record<string, unknown>
  expect(errors).toEqual([])
  return value
}

/**
 * Every translation key a dictionary body declares.
 * @param body - the dictionary's source text.
 * @returns the keys, ordered.
 */
function keysOf(body: string): string[] {
  return [...body.matchAll(/^\s{2}'([^']+)':/gmu)].map((match) => match[1] ?? '').toSorted((a, b) => a.localeCompare(b))
}

/**
 * Every dependency this repository declares, from every manifest it ships and
 * every kind each one uses.
 * @returns name to declared range.
 */
async function everyDependency(): Promise<Map<string, string>> {
  const manifests = await Promise.all(
    repositoryFiles(['package.json']).map(
      async (manifest) => JSON.parse(await readFile(manifest.path, 'utf8')) as Record<string, unknown>,
    ),
  )
  const found = new Map<string, string>()
  for (const parsed of manifests) {
    for (const kind of DEPENDENCY_KINDS) {
      const declarations = (parsed[kind] ?? {}) as Record<string, string>
      for (const [name, range] of Object.entries(declarations)) found.set(name, range)
    }
  }
  return found
}

/**
 * Tools pinned below their floor, or not pinned at all.
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
 * Tools installed with no floor, or with one that no longer matches the pin.
 * @param installed - the root manifest's development dependencies.
 * @returns one line per tool whose floor has drifted from what is installed.
 */
function floorDrift(installed: Readonly<Record<string, string>>): string[] {
  const wrong: string[] = []
  for (const [name, range] of Object.entries(installed)) {
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

describe('stack floors', () => {
  it('pins every tool at or above its floor', async () => {
    expect(belowFloor(await everyDependency())).toEqual([])
  })

  it('states a floor for every tool it installs, at exactly the version installed', async () => {
    const root = JSON.parse(await readFile('package.json', 'utf8')) as { devDependencies?: Record<string, string> }
    expect(floorDrift(root.devDependencies ?? {})).toEqual([])
  })

  it('holds the supply-chain release hold in place', async () => {
    const bunfig = await readFile('bunfig.toml', 'utf8')
    // A newly published version must age before it can be installed, so a
    // compromised release cannot be pulled in the hour it lands.
    const hold = /minimumReleaseAge\s*=\s*(\d+)/u.exec(bunfig)
    expect(hold).not.toBeNull()
    expect(Number(hold?.[1] ?? 0)).toBeGreaterThanOrEqual(86_400)
  })

  it('keeps every linter category enabled', async () => {
    const config = readJsonc(await readFile('.oxlintrc.json', 'utf8')) as {
      categories?: Record<string, string>
      rules?: Record<string, string>
      ignorePatterns?: string[]
      overrides?: unknown
    }
    for (const category of ['correctness', 'suspicious', 'perf', 'pedantic']) {
      expect(config.categories?.[category]).toBe('error')
    }
    // A rule switched off is a defect hidden rather than fixed.
    expect(Object.values(config.rules ?? {}).filter((level) => level === 'off')).toEqual([])
    // oxlint may skip build output and nothing else.
    expect(config.ignorePatterns ?? []).toEqual(['**/lib/**', '**/dist/**', '**/gen/**', '**/target/**'])
    expect(config.overrides).toBeUndefined()
  })
})

describe('legacy patterns and suppressions', () => {
  it('has none anywhere the repository ships', async () => {
    const files = repositoryFiles([...bans.SCRIPT_EXTENSIONS, ...bans.PLAIN_EXTENSIONS])
    const offences = await Promise.all(
      files.map(async (file) => bans.scanSource(file.label, await readFile(file.path, 'utf8'))),
    )
    expect(offences.flat().map((offence) => `${offence.label}:${String(offence.line)}: ${offence.why}`)).toEqual([])
  })

  it('has no inline style anywhere the repository ships', async () => {
    const files = repositoryFiles([...styles.SCRIPT_EXTENSIONS, ...styles.MARKUP_EXTENSIONS])
    const offences = await Promise.all(
      files.map(async (file) => styles.scanSource(file.label, await readFile(file.path, 'utf8'))),
    )
    expect(offences.flat().map((offence) => `${offence.label}:${String(offence.line)}: ${offence.why}`)).toEqual([])
  })

  it('states a modern compilation target', async () => {
    const base = readJsonc(await readFile('tsconfig.base.json', 'utf8'))
    const options = (base['compilerOptions'] ?? {}) as Record<string, unknown>
    // TypeScript 7 turns `strict` and `module: esnext` on by default, so the
    // failure to guard against is someone switching them back off.
    expect(options['strict']).not.toBe(false)
    expect(String(options['module'] ?? 'esnext').toLowerCase()).not.toBe('commonjs')
    const target = String(options['target'] ?? '').toLowerCase()
    expect(target === 'esnext' || Number(target.replace('es', '')) >= 2022).toBe(true)
    // Everything tightened beyond the defaults has to stay tightened.
    for (const option of [
      'noUncheckedIndexedAccess',
      'exactOptionalPropertyTypes',
      'noImplicitOverride',
      'noFallthroughCasesInSwitch',
      'noImplicitReturns',
      'verbatimModuleSyntax',
      'isolatedModules',
    ]) {
      expect([option, options[option]]).toEqual([option, true])
    }
  })
})

describe('layout', () => {
  it('writes the drawer breakpoint exactly once', async () => {
    const sheet = 'apps/deeptail/src/styles/shell.css'
    const widths = [...(await readFile(sheet, 'utf8')).matchAll(/@media \(width <= (\d+px)\)/gu)].map(
      (match) => match[1] ?? '',
    )
    expect(widths.length).toBe(1)
    // The width is read out of the stylesheet rather than restated here, so
    // this assertion cannot itself become the second place it is written.
    const [width] = widths
    const files = repositoryFiles(['.css', '.ts']).filter((file) => file.label !== sheet)
    const elsewhere = await Promise.all(
      files.map(async (file) => ((await readFile(file.path, 'utf8')).includes(width ?? '') ? [file.label] : [])),
    )
    // A width in a media query and the same width restated in script are two
    // breakpoints that agree only until one of them is changed. The stylesheet
    // decides, and publishes the decision as a custom property the script
    // reads, so there is exactly one place the number appears.
    expect(elsewhere.flat()).toEqual([])
  })
})

describe('translations', () => {
  it('keeps both dictionaries on exactly the same keys', async () => {
    const source = await readFile('apps/deeptail/src/locales.ts', 'utf8')
    const dictionaries = [...source.matchAll(/const (zh|en) = \{([\s\S]*?)\n\} satisfies/gu)]
    expect(dictionaries.length).toBe(2)
    const [first, second] = dictionaries
    expect(keysOf(first?.[2] ?? '')).toEqual(keysOf(second?.[2] ?? ''))
  })

  it('leaves no placeholder unfilled in either dictionary', async () => {
    const source = await readFile('apps/deeptail/src/locales.ts', 'utf8')
    const entries = [...source.matchAll(/^\s{2}'([^']+)':\s*'([^']*)'/gmu)]
    expect(entries.length).toBeGreaterThan(0)
    expect(entries.filter(([, , value]) => (value ?? '').trim() === '').map(([, key]) => key)).toEqual([])
  })
})
