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

describe('the documented toolchain', () => {
  it('documents the toolchain it installs, at the version it installs', async () => {
    const readme = await readFile('README.md', 'utf8')
    const section = readme.slice(readme.indexOf('## Toolchain'))
    const manifest = readJsonc(await readFile('package.json', 'utf8'))
    const manager = typeof manifest['packageManager'] === 'string' ? manifest['packageManager'] : ''
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
})
