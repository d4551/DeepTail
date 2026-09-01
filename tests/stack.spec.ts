/**
 * Stack floors and legacy-pattern bans.
 *
 * A toolchain that silently slips back a major version, or source that
 * reintroduces a pattern the project has moved past, is a regression no other
 * gate reports: the build still succeeds and every other suite stays green.
 * These assertions read the manifests and the source that actually ship, so a
 * downgrade or a revived legacy idiom fails the run.
 */

import { describe, expect, it } from 'bun:test'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

/** Lowest acceptable major.minor for every tool the project pins. */
const FLOORS: Readonly<Record<string, readonly [number, number]>> = {
  typescript: [7, 0],
  vite: [8, 0],
  playwright: [1, 62],
  '@biomejs/biome': [2, 5],
  oxlint: [1, 80],
  knip: [6, 33],
  '@tauri-apps/cli': [2, 11],
  '@tauri-apps/api': [2, 11],
  '@axe-core/playwright': [4, 13],
}

/** Source idioms the project has moved past, and what to use instead. */
const BANNED: readonly { readonly pattern: RegExp; readonly why: string }[] = [
  { pattern: /\bvar\s+[A-Za-z_$]/u, why: 'use const or let' },
  { pattern: /\brequire\s*\(/u, why: 'use ES module imports' },
  { pattern: /\.innerHTML\s*=/u, why: 'use textContent, or insertAdjacentHTML with vetted markup' },
  { pattern: /\bdocument\.write\b/u, why: 'document.write is removed from modern engines' },
  { pattern: /\.substr\s*\(/u, why: 'String.prototype.substr is deprecated; use slice' },
  { pattern: /\bnew Array\s*\(/u, why: 'use an array literal or Array.from' },
  { pattern: /\bescape\s*\(|\bunescape\s*\(/u, why: 'escape/unescape are deprecated; use encodeURIComponent' },
  { pattern: /\b__proto__\b/u, why: 'use Object.getPrototypeOf or Object.create' },
  { pattern: /:\s*any\b/u, why: 'any defeats the type system; name the shape' },
  { pattern: /@ts-(ignore|nocheck|expect-error)/u, why: 'suppressing the checker hides the defect' },
  { pattern: /(eslint|oxlint|biome)-(disable|ignore)/u, why: 'suppressing a rule hides the defect' },
]

/**
 * Parse a tsconfig, which is JSON with comments.
 * @param text - the file contents.
 * @returns the parsed object.
 */
function parseJsonc(text: string): Record<string, unknown> {
  const stripped = text
    .replaceAll(/\/\*[\s\S]*?\*\//gu, '')
    .replaceAll(/(^|[^:])\/\/.*$/gmu, '$1')
    .replaceAll(/,(\s*[}\]])/gu, '$1')
  return JSON.parse(stripped) as Record<string, unknown>
}

/**
 * Every translation key a dictionary body declares.
 * @param body - the dictionary's source text.
 * @returns the keys, ordered.
 */
function keysOf(body: string): string[] {
  return [...body.matchAll(/^\s{2}'([^']+)':/gmu)].map((match) => match[1] ?? '').toSorted((a, b) => a.localeCompare(b))
}

/** Every file under a directory matching an extension. */
async function walk(dir: string, ext: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) return walk(path, ext)
      return path.endsWith(ext) ? [path] : []
    }),
  )
  return nested.flat()
}

/**
 * Read every dependency a manifest declares, of any kind.
 * @param path - the manifest to read.
 * @returns name to declared range.
 */
async function declared(path: string): Promise<Record<string, string>> {
  const manifest = JSON.parse(await readFile(path, 'utf8')) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  return { ...manifest.dependencies, ...manifest.devDependencies }
}

/**
 * The major and minor a range resolves to, ignoring range prefixes.
 * @param range - a semver range such as `^8.2.2`.
 * @returns the major and minor it pins.
 */
function version(range: string): readonly [number, number] {
  const parts = /(\d+)\.(\d+)/u.exec(range)
  if (parts === null) throw new Error(`unparseable version range: ${range}`)
  return [Number(parts[1]), Number(parts[2])]
}

/**
 * Every dependency this repository declares, across all its manifests.
 * @returns name to declared range.
 */
async function everyDependency(): Promise<Map<string, string>> {
  const manifests = await Promise.all(
    ['package.json', 'apps/deeptail/package.json', 'packages/host-fleet/package.json'].map((manifest) =>
      declared(manifest),
    ),
  )
  const found = new Map<string, string>()
  for (const manifest of manifests) {
    for (const [name, range] of Object.entries(manifest)) found.set(name, range)
  }
  return found
}

/**
 * Tools pinned below their floor, or not pinned at all.
 * @param found - every declared dependency.
 * @returns one line per tool that fails its floor.
 */
function belowFloor(found: Map<string, string>): string[] {
  const behind: string[] = []
  for (const [name, [major, minor]] of Object.entries(FLOORS)) {
    const range = found.get(name)
    if (range === undefined) {
      behind.push(`${name} is not declared anywhere`)
      continue
    }
    const [haveMajor, haveMinor] = version(range)
    if (haveMajor < major || (haveMajor === major && haveMinor < minor)) {
      behind.push(`${name} ${range} is below the ${String(major)}.${String(minor)} floor`)
    }
  }
  return behind
}

/**
 * Assert that every list capable of silencing a finding still holds exactly
 * what it was agreed to hold, so growing one has to be a deliberate edit here.
 */
async function expectSuppressionListsUnchanged(): Promise<void> {
  // Each of these can silence a real finding, so each is pinned rather than
  // merely present: growing one has to be a deliberate edit to this test.
  const knip = JSON.parse(await readFile('knip.json', 'utf8')) as {
    workspaces?: Record<string, { ignoreDependencies?: string[] }>
  }
  expect(knip.workspaces?.['apps/deeptail']?.ignoreDependencies ?? []).toEqual([
    'react',
    'react-dom',
    '@deepseek-ai/dsh-client-store',
    '@deepseek-ai/dsh-client-ui-primitives',
    '@deepseek-ai/dsh-client-ui-slots',
  ])
  for (const [name, workspace] of Object.entries(knip.workspaces ?? {})) {
    if (name === 'apps/deeptail') continue
    expect([name, workspace.ignoreDependencies]).toEqual([name, undefined])
  }

  const biome = JSON.parse(await readFile('biome.json', 'utf8')) as {
    files?: { includes?: string[] }
    linter?: { rules?: Record<string, unknown> }
    overrides?: unknown
  }
  expect(biome.overrides).toBeUndefined()
  expect(biome.files?.includes ?? []).toEqual(['**', '!**/dist', '!**/lib', '!**/gen', '!**/target', '!**/*.min.js'])
}

describe('stack floors', () => {
  it('pins every tool at or above its floor', async () => {
    expect(belowFloor(await everyDependency())).toEqual([])
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
    const config = JSON.parse(await readFile('.oxlintrc.json', 'utf8')) as {
      categories?: Record<string, string>
      rules?: Record<string, string>
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

  it('keeps every suppression list at its agreed contents', async () => {
    await expectSuppressionListsUnchanged()
  })
})

/**
 * Every line in the repository's own sources that uses a banned idiom.
 * @returns one line per offence, with the reason.
 */
async function legacyOffences(): Promise<string[]> {
  const trees = await Promise.all(
    [
      'apps/deeptail/src',
      'apps/deeptail/tests',
      'packages/host-fleet/src',
      'packages/host-fleet/tests',
      'scripts',
      'tests',
    ].map((tree) => walk(tree, '.ts')),
  )
  const scanned = await Promise.all(trees.flat().map(async (file) => ({ file, text: await readFile(file, 'utf8') })))
  const offences: string[] = []
  for (const { file, text } of scanned) {
    for (const [index, line] of text.split('\n').entries()) {
      // The bans describe code. Prose that mentions one, and the table that
      // declares them, are data rather than uses.
      const start = line.trimStart()
      if (start.startsWith('*') || start.startsWith('//') || start.startsWith('{ pattern:')) continue
      for (const { pattern, why } of BANNED) {
        if (pattern.test(line)) offences.push(`${file}:${String(index + 1)}: ${why} — ${line.trim()}`)
      }
    }
  }
  return offences
}

describe('legacy patterns', () => {
  it('has none in the application or plugin source', async () => {
    expect(await legacyOffences()).toEqual([])
  })

  it('states a modern compilation target', async () => {
    const base = parseJsonc(await readFile('tsconfig.base.json', 'utf8'))
    const options = (base.compilerOptions ?? {}) as Record<string, unknown>
    // TypeScript 7 turns `strict` and `module: esnext` on by default, so the
    // failure to guard against is someone switching them back off.
    expect(options.strict).not.toBe(false)
    expect(String(options.module ?? 'esnext').toLowerCase()).not.toBe('commonjs')
    const target = String(options.target ?? '').toLowerCase()
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
