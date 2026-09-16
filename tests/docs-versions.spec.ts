/**
 * The toolchain the documentation claims, held to the toolchain installed.
 *
 * Drives `scripts/docs-versions.ts` three ways: against prose carrying the exact
 * drift that shipped, against a badge whose URL states a version the toolchain
 * line does not, and against the README this repository actually ships, which
 * must agree with every manifest pin at the depth it states one.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { cargoEdition } from '../scripts/compiler-face.ts'
import {
  badgeVersions,
  documentationConflicts,
  documentationDrift,
  statedClaims,
  statedVersions,
  statesPin,
  type Toolchain,
} from '../scripts/docs-versions.ts'
import { isJsonObject, readJsonc } from '../scripts/jsonc.ts'
import { everyDependency } from './manifests.ts'
import { TREE_SCAN_BUDGET_MS } from './tree-budget.ts'

/** Every tool the toolchain line names, at the versions a manifest pins them to. */
const TOOLCHAIN: Toolchain = {
  declared: new Map([
    ['@biomejs/biome', '2.5.13'],
    ['@stryker-mutator/core', '10.0.0'],
    ['@tauri-apps/api', '2.11.1'],
    ['oxlint', '1.83.0'],
    ['playwright', '1.63.0'],
    ['react', '19.3.0'],
    ['typescript', '7.0.2'],
    ['vite', '8.2.2'],
  ]),
  manager: 'bun@1.4.2',
  engines: '^22.19.0 || >=24.0.0',
  edition: '2024',
}

/** Prose that agrees with those pins, at the depth each is written to. */
const AGREEING =
  'TypeScript 7.0.2 · Bun 1.4.2 · Node 24 LTS · Tauri 2.11 · Rust edition 2024 · Vite 8 · Playwright 1.63.0.'

/**
 * A badge, as shields.io writes one: the label, the message and the color in
 * the URL path.
 * @param label - the badge's label.
 * @param message - the badge's message.
 * @returns the markdown line for it.
 */
function badge(label: string, message: string): string {
  const slug = `${label}-${message.replaceAll(' ', '%20')}-3178C6`
  return `[![${label} ${message}](https://img.shields.io/badge/${slug}?logo=x)](https://x.test/)`
}

describe('the versions a badge states', () => {
  it('reads the label and the message apart, and drops the color', () => {
    expect(badgeVersions(badge('TypeScript', '7.0.2'))).toEqual([{ name: 'TypeScript', version: '7.0.2' }])
    expect(badgeVersions(badge('Bun', '1.4'))).toEqual([{ name: 'Bun', version: '1.4' }])
    expect(badgeVersions(badge('Rust', 'edition 2024'))).toEqual([{ name: 'Rust edition', version: '2024' }])
  })

  it('reads no version out of a badge whose message is not one', () => {
    expect(badgeVersions(badge('platforms', 'desktop · iOS · Android'))).toEqual([])
    expect(badgeVersions(badge('license', 'MIT'))).toEqual([])
    expect(badgeVersions('no badge here')).toEqual([])
  })
})

describe('the versions a line states', () => {
  it('reads a version whose parts run past a single digit', () => {
    // Every tool this repository documents happens to be at a single-digit
    // major. A reader that stopped at one digit would read the next release of
    // any of them as a version it cannot find, or as no version at all.
    expect([...statedVersions('Playwright 10.63.0 · Node 24 LTS')]).toEqual([
      ['Playwright', '10.63.0'],
      ['Node', '24'],
    ])
  })

  it('reads the name and the version apart at the space between them', () => {
    expect([...statedVersions('Vite 8')]).toEqual([['Vite', '8']])
    expect([...statedVersions('Rust edition 2024')]).toEqual([['Rust edition', '2024']])
  })

  it('reads nothing out of prose that states no version', () => {
    expect([...statedVersions('Rust · Node LTS')]).toEqual([])
  })

  it('reads a badge and a sentence into the same claims, the alt text included', () => {
    expect(statedClaims(`${badge('Playwright', '1.63')}\n\nPlaywright 1.63.0 ships here.`)).toEqual([
      { name: 'Playwright', version: '1.63' },
      { name: 'Playwright', version: '1.63.0' },
      { name: 'Playwright', version: '1.63' },
    ])
  })
})

describe('the toolchain the README ships', () => {
  it(
    'documents the toolchain it installs, at the version it installs',
    async () => {
      const readme = await readFile('README.md', 'utf8')
      const manifest = readJsonc(await readFile('package.json', 'utf8'))
      const engines = manifest['engines']
      const stated = statedVersions(readme)
      // A reader that found nothing would report no drift at all, which is what
      // the toolchain line looked like to every gate before this one.
      expect(stated.size).toBeGreaterThan(0)
      expect(documentationConflicts(readme)).toEqual([])
      expect(
        documentationDrift(stated, {
          declared: await everyDependency(),
          manager: typeof manifest['packageManager'] === 'string' ? manifest['packageManager'] : '',
          engines: isJsonObject(engines) && typeof engines['node'] === 'string' ? engines['node'] : '',
          edition: cargoEdition(await readFile('apps/deeptail/src-tauri/Cargo.toml', 'utf8')),
        }),
      ).toEqual([])
    },
    TREE_SCAN_BUDGET_MS,
  )
})

describe('the documented toolchain', () => {
  it('names a documented version that has drifted, rather than only ever being green', () => {
    // Driven against the exact drift that shipped: a line stating the version
    // the repository used to install. Fewer parts is a coarser claim and
    // stands; a differing part does not, at any depth.
    expect(statesPin('2.11', '2.11.1')).toBe(true)
    expect(statesPin('1.63.0', '1.63.0')).toBe(true)
    expect(statesPin('1.62.1', '1.63.0')).toBe(false)
    expect(statesPin('8', '8.2.2')).toBe(true)
    expect(statesPin('9', '8.2.2')).toBe(false)
    expect(statesPin('8.2.2.1', '8.2.2')).toBe(false)
    const sparse: Toolchain = { ...TOOLCHAIN, declared: new Map([['playwright', '1.63.0']]) }
    expect(documentationDrift(statedVersions('Playwright 1.62.1'), sparse)).toEqual([
      'TypeScript: nothing declares typescript',
      'Tauri: nothing declares @tauri-apps/api',
      'Vite: nothing declares vite',
      'Playwright is documented as 1.62.1 and pinned at 1.63.0',
      'Bun is pinned at 1.4.2 and the toolchain line no longer names it',
      'Node is pinned at ^22.19.0 || >=24.0.0 and the toolchain line no longer names it',
      'Rust edition is 2024 and the toolchain line no longer names it',
    ])
  })

  it('names an edition the line states when no crate manifest declares one', () => {
    // The other half of the edition case: a line may state one while no crate
    // in the tree says which edition is installed, and that is drift too.
    expect(documentationDrift(statedVersions(AGREEING), { ...TOOLCHAIN, edition: '' })).toEqual([
      'Rust edition is documented and no crate manifest states an edition',
    ])
  })
})

describe('the tools the toolchain line names', () => {
  it('holds every tool the repository pins, not only the ones the line names', () => {
    // Biome, oxlint and Stryker are installed and were never read: a sentence
    // stating a version for any of them went unchecked before this case.
    const drift = (sentence: string): string[] =>
      documentationDrift(statedVersions(`${AGREEING} ${sentence}`), TOOLCHAIN)
    expect(drift('Biome 2.4.1')).toEqual(['Biome is documented as 2.4.1 and pinned at 2.5.13'])
    expect(drift('Biome 2.5')).toEqual([])
    expect(drift('Oxlint 1.82.0')).toEqual(['Oxlint is documented as 1.82.0 and pinned at 1.83.0'])
    expect(drift('Stryker 9.4.1')).toEqual(['Stryker is documented as 9.4.1 and pinned at 10.0.0'])
    expect(drift('React 18.2.0')).toEqual(['React is documented as 18.2.0 and pinned at 19.3.0'])
    expect(drift('Node 20')).toEqual(['Node is documented as 20 and the manifest admits ^22.19.0 || >=24.0.0'])
    expect(drift('Rust edition 2021')).toEqual(['Rust edition is documented as 2021 and the crate ships 2024'])
    expect(drift('Kubernetes 1.30')).toEqual([])
  })
})

describe('the badge the README carries', () => {
  it('names a badge whose URL contradicts the toolchain line', () => {
    // The line and the badge each state a version, and the badge is the one a
    // reader never sees written: its version lives inside the image URL.
    const readme = `${badge('Playwright', '1.62')}\n\n${AGREEING}`
    expect(documentationConflicts(readme)).toEqual(['Playwright is documented as both 1.62 and 1.63.0'])
    expect(documentationDrift(statedVersions(readme), TOOLCHAIN)).toEqual([
      'Playwright is documented as 1.62 and pinned at 1.63.0',
    ])
    expect(documentationDrift(statedVersions(badge('Playwright', '1.63')), TOOLCHAIN)).toEqual([
      'TypeScript is pinned at 7.0.2 and the toolchain line no longer names it',
      'Tauri is pinned at 2.11.1 and the toolchain line no longer names it',
      'Vite is pinned at 8.2.2 and the toolchain line no longer names it',
      'Bun is pinned at 1.4.2 and the toolchain line no longer names it',
      'Node is pinned at ^22.19.0 || >=24.0.0 and the toolchain line no longer names it',
      'Rust edition is 2024 and the toolchain line no longer names it',
    ])
  })
})

describe('the bun pin the documentation names', () => {
  it('reads bun off a pin that names bun, and not off one that merely contains it', () => {
    // `packageManager` names the manager as well as its version. A reader that
    // took the version out of the middle of that name would read a fork, or a
    // scoped build, as the bun this repository runs on.
    expect(documentationDrift(statedVersions(AGREEING), TOOLCHAIN)).toEqual([])
    expect(documentationDrift(statedVersions(AGREEING), { ...TOOLCHAIN, manager: '@acme/bun@1.4.2' })).toEqual([
      'Bun is documented as 1.4.2 and pinned at @acme/bun@1.4.2',
    ])
  })
})

describe('the documented toolchain contradicts itself', () => {
  it('names a badge and a toolchain line that cannot both be true', () => {
    // The README used to carry Playwright 1.62 in a badge and 1.63.0 in the
    // toolchain line. Last-wins on the map kept only the later claim.
    expect(documentationConflicts('Playwright 1.62 · Playwright 1.63.0')).toEqual([
      'Playwright is documented as both 1.62 and 1.63.0',
    ])
    expect(documentationConflicts('Tauri 2.11 · Tauri 2.11.1')).toEqual([])
    expect(documentationConflicts(AGREEING)).toEqual([])
    expect(documentationConflicts('Kubernetes 1.30 · Kubernetes 1.29')).toEqual([])
  })
})
