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
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { type ParseError, parse as parseJsonc } from 'jsonc-parser'
import { coerce, gte, major, minor } from 'semver'
import type { LocaleId } from '../apps/deeptail/src/browser-locale.ts'
import { DICTIONARIES } from '../apps/deeptail/src/locales.ts'
import * as bans from '../scripts/ban-gate.ts'
import { repositoryFiles } from '../scripts/source-tree.ts'
import * as styles from '../scripts/style-gate.ts'

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
  '@tauri-apps/api': '2.11',
  '@tauri-apps/cli': '2.11',
  '@types/bun': '1.4',
  '@types/node': '26.4',
  '@types/semver': '7.8',
  'jsonc-parser': '3.3',
  knip: '6.33',
  'oxc-parser': '0.147',
  oxlint: '1.80',
  parse5: '8.0',
  playwright: '1.62',
  react: '19.2',
  'react-dom': '19.2',
  semver: '7.8',
  typescript: '7.0',
  vite: '8.2',
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

describe('stack floors', () => {
  it('pins every tool at or above its floor', async () => {
    expect(belowFloor(await everyDependency())).toEqual([])
  })

  it('states a floor for everything it declares, at exactly the version declared', async () => {
    expect(floorDrift(await everyDependency())).toEqual([])
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

/** The locales the product ships, the first standing as the key-set reference. */
function locales(): [LocaleId, ...LocaleId[]] {
  const [first, ...rest] = Object.keys(DICTIONARIES) as LocaleId[]
  if (first === undefined) throw new Error('the product ships no dictionary')
  return [first, ...rest]
}

/** The `{name}` placeholders one sentence carries, in order. */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/gu)].map((found) => found[1] ?? '')
}

describe('translations', () => {
  it('keeps every dictionary on exactly the same keys', () => {
    const [first, ...rest] = locales()
    expect(rest.length).toBeGreaterThan(0)
    const reference = Object.keys(DICTIONARIES[first]).toSorted()
    expect(reference.length).toBeGreaterThan(20)
    for (const locale of rest) {
      expect([locale, Object.keys(DICTIONARIES[locale]).toSorted()]).toEqual([locale, reference])
    }
  })

  it('leaves no entry empty in any dictionary', () => {
    const empty = Object.entries(DICTIONARIES).flatMap(([locale, dictionary]) =>
      Object.entries(dictionary)
        .filter(([, value]) => value.trim() === '')
        .map(([key]) => `${locale}:${key}`),
    )
    expect(empty).toEqual([])
  })

  it('fills the same placeholders in every dictionary', () => {
    // A sentence that drops a placeholder in translation renders `{message}`
    // to the reader, or silently loses what it was carrying.
    const [first, ...rest] = locales()
    const reference = DICTIONARIES[first]
    const drift: string[] = []
    for (const locale of rest) {
      const dictionary = DICTIONARIES[locale]
      for (const key of Object.keys(reference) as (keyof typeof reference)[]) {
        const wanted = placeholders(reference[key])
        if (JSON.stringify(wanted) !== JSON.stringify(placeholders(dictionary[key])))
          drift.push(`${locale}:${String(key)}`)
      }
    }
    expect(drift).toEqual([])
  })

  it('carries no key nothing reads', () => {
    // A key kept after its surface is gone is copy nobody maintains, and a
    // dictionary that only grows is one no translator can prioritize.
    const sources = repositoryFiles(['.ts']).filter(
      (file) => file.label.startsWith('apps/deeptail/src/') && !file.label.endsWith('locales.ts'),
    )
    const text = sources.map((file) => readFileSync(file.path, 'utf8')).join('\n')
    const unread = Object.keys(DICTIONARIES.en).filter((key) => !text.includes(`'${key}'`))
    expect(unread).toEqual([])
  })
})
