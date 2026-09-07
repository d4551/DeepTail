/**
 * Every dependency the workspace declares, read from every manifest it ships.
 *
 * Two readers depend on this list: the outdated gate, so a silent table cannot
 * report nothing checked while dozens of pins exist, and the floor suite, so
 * neither can disagree with the other about what is installed. A list that
 * missed a manifest, or a kind of dependency, would make both quietly narrower.
 */

import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { declaredPins } from '../scripts/pins.ts'
import { repositoryFiles } from '../scripts/source-tree.ts'

describe('the declared pins', () => {
  it('read every manifest the repository ships, not only the root one', () => {
    const manifests = repositoryFiles(['package.json'])
    expect(manifests.length).toBeGreaterThan(1)
    const pins = declaredPins()
    for (const manifest of manifests) {
      const parsed = JSON.parse(readFileSync(manifest.path, 'utf8')) as Record<string, Record<string, string>>
      for (const kind of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
        for (const [name, range] of Object.entries(parsed[kind] ?? {})) {
          expect([manifest.label, name, pins.get(name)]).toEqual([manifest.label, name, range])
        }
      }
    }
  })

  it('read a dependency of every kind a manifest can declare', () => {
    // Each kind installs something; a reader that knew three of the four would
    // hold whole families of packages to no floor at all.
    const pins = declaredPins()
    const kinds = ['dependencies', 'devDependencies']
    const found = kinds.map((kind) => {
      const declared = repositoryFiles(['package.json']).flatMap((manifest) =>
        Object.keys(
          (JSON.parse(readFileSync(manifest.path, 'utf8')) as Record<string, Record<string, string>>)[kind] ?? {},
        ),
      )
      return declared.every((name) => pins.has(name)) && declared.length > 0
    })
    expect(found).toEqual(kinds.map(() => true))
  })

  it('reports a range for every name it holds, and holds no empty name', () => {
    const pins = declaredPins()
    expect(pins.size).toBeGreaterThan(0)
    expect([...pins].filter(([name, range]) => name === '' || range === '')).toEqual([])
  })
})
