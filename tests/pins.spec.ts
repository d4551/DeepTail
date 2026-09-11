/**
 * Every dependency the workspace declares, read from every manifest it ships.
 *
 * Two readers depend on this list: the outdated gate, so a silent table cannot
 * report nothing checked while dozens of pins exist, and the floor suite, so
 * neither can disagree with the other about what is installed. A list that
 * missed a manifest, or a kind of dependency, would make both quietly narrower.
 */

import { describe, expect, it } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readManifest, sectionOf } from '../scripts/manifest.ts'
import { declaredPins } from '../scripts/pins.ts'
import { repositoryFiles, type SourceFile } from '../scripts/source-tree.ts'

/**
 * The pins one written manifest declares.
 * @param manifest - the manifest's contents.
 * @returns the pins, name to range.
 */
async function pinsOf(manifest: string): Promise<Map<string, string>> {
  const root = await mkdtemp(join(tmpdir(), 'pins-'))
  const file: SourceFile = { label: 'package.json', path: join(root, 'package.json') }
  await writeFile(file.path, manifest)
  const pins = declaredPins([file])
  await rm(root, { recursive: true, force: true })
  return pins
}

describe('the declared pins', () => {
  it('read every manifest the repository ships, not only the root one', () => {
    const manifests = repositoryFiles(['package.json'])
    expect(manifests.length).toBeGreaterThan(1)
    const pins = declaredPins()
    for (const manifest of manifests) {
      const parsed = readManifest(manifest.path)
      for (const kind of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
        for (const [name, range] of sectionOf(parsed, kind)) {
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
        Array.from(sectionOf(readManifest(manifest.path), kind).keys()),
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

describe('a manifest that declares something a range cannot be', () => {
  it('holds the ranges and nothing else, rather than a range that is not one', async () => {
    // Every reader of this map treats what it holds as a range and compares it
    // to a version. A number or an object read in as one is a comparison
    // against a shape that has no version in it, and the floor it was meant to
    // enforce stops being enforced for that package alone.
    const pins = await pinsOf(
      JSON.stringify({ dependencies: { held: '^1.2.3', counted: 3, nested: { version: '2' }, absent: null } }),
    )
    expect([...pins]).toEqual([['held', '^1.2.3']])
  })

  it('reads a section that is not a mapping as declaring nothing', async () => {
    const pins = await pinsOf(JSON.stringify({ dependencies: 5, devDependencies: { held: '^1.2.3' } }))
    expect([...pins]).toEqual([['held', '^1.2.3']])
  })
})
