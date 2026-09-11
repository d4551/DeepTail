/**
 * The toolchain the documentation claims, held to the toolchain installed.
 *
 * Drives `scripts/docs-versions.ts` twice: once against prose carrying the
 * exact drift that shipped, and once against the README this repository
 * actually ships, which must agree with every manifest pin at the depth it
 * states one.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { documentationDrift, statedVersions, statesPin } from '../scripts/docs-versions.ts'
import { readJsonc } from '../scripts/jsonc.ts'
import { everyDependency } from './manifests.ts'

/** Every tool the toolchain line names, at the versions a manifest pins them to. */
const DECLARED = new Map([
  ['typescript', '7.0.2'],
  ['@tauri-apps/api', '2.11.1'],
  ['vite', '8.2.2'],
  ['playwright', '1.63.0'],
])

/** Prose that agrees with those pins, at the depth each is written to. */
const AGREEING = 'TypeScript 7.0.2 · Bun 1.4.2 · Tauri 2.11 · Vite 8 · Playwright 1.63.0.'

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
  })

  it('reads nothing out of prose that states no version', () => {
    expect([...statedVersions('Rust edition · Node LTS')]).toEqual([])
  })
})

describe('the documented toolchain', () => {
  it('documents the toolchain it installs, at the version it installs', async () => {
    const readme = await readFile('README.md', 'utf8')
    const section = readme.slice(readme.indexOf('## Toolchain'))
    const manifest = readJsonc(await readFile('package.json', 'utf8'))
    const manager = typeof manifest.packageManager === 'string' ? manifest.packageManager : ''
    const stated = statedVersions(section)
    // A reader that found nothing would report no drift at all, which is what
    // the toolchain line looked like to every gate before this one.
    expect(stated.size).toBeGreaterThan(0)
    expect(documentationDrift(stated, await everyDependency(), manager)).toEqual([])
  })

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
    const declared = new Map([
      ['playwright', '1.63.0'],
      ['typescript', '7.0.2'],
    ])
    expect(documentationDrift(statedVersions('Playwright 1.62.1'), declared, 'bun@1.4.2')).toEqual([
      'Tauri: nothing declares @tauri-apps/api',
      'Vite: nothing declares vite',
      'Bun is pinned at 1.4.2 and the toolchain line no longer names it',
      'TypeScript is pinned at 7.0.2 and the toolchain line no longer names it',
      'Playwright is documented as 1.62.1 and pinned at 1.63.0',
    ])
  })

  it('reads bun off a pin that names bun, and not off one that merely contains it', () => {
    // `packageManager` names the manager as well as its version. A reader that
    // took the version out of the middle of that name would read a fork, or a
    // scoped build, as the bun this repository runs on.
    expect(documentationDrift(statedVersions(AGREEING), DECLARED, 'bun@1.4.2')).toEqual([])
    expect(documentationDrift(statedVersions(AGREEING), DECLARED, '@acme/bun@1.4.2')).toEqual([
      'Bun is documented as 1.4.2 and pinned at @acme/bun@1.4.2',
    ])
  })
})
