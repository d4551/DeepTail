/**
 * The Rust ≤2021 face, driven against a crate manifest that states each
 * superseded field and against the manifest this repository ships.
 *
 * The floor is the one edition 2024 needs, as the edition guide the installed
 * toolchain ships states it, so an upgrade that moves the floor moves the check.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { cargoEdition, rustEditionOffences } from '../scripts/compiler-face.ts'
import { ROOT, repositoryFiles } from '../scripts/source-tree.ts'
import { TREE_SCAN_BUDGET_MS } from './tree-budget.ts'

/** The crate manifest this repository ships. */
const CRATE = 'apps/deeptail/src-tauri/Cargo.toml'

/**
 * A crate manifest stating one package section, with whatever else is given.
 * @param stated - the fields to write into the section.
 * @returns the manifest's contents.
 */
function crateStating(stated: string): string {
  return `[package]\nname = "deeptail"\n${stated}\n`
}

describe('the Rust ≤2021 face', () => {
  it('names an old edition, a missing one, a compiler below the floor and an edition it does not know', () => {
    expect(rustEditionOffences(crateStating('edition = "2021"\nrust-version = "1.95"'))).toEqual([
      'edition 2021 is a Rust ≤2021 face; this crate ships edition 2024',
    ])
    expect(rustEditionOffences(crateStating('rust-version = "1.95"'))).toEqual([
      'the crate states no edition; cargo reads that as the 2015 edition, which is a Rust ≤2021 face',
    ])
    expect(rustEditionOffences(crateStating('edition = "2024"'))).toEqual([
      'the crate states no rust-version, so nothing holds it to the 1.85 edition 2024 needs',
    ])
    expect(rustEditionOffences(crateStating('edition = "2024"\nrust-version = "1.80"'))).toEqual([
      'rust-version 1.80 is below 1.85, which edition 2024 needs',
    ])
    expect(rustEditionOffences(crateStating('edition = "2024"\nrust-version = "next"'))).toEqual([
      'rust-version next is not a version this reader can read',
    ])
    expect(rustEditionOffences(crateStating('edition = "2027"\nrust-version = "1.95"'))).toEqual([
      'edition 2027 is not the edition this crate ships: 2024',
    ])
    expect(rustEditionOffences('[workspace]\nmembers = ["crates/one"]\n')).toEqual([])
    expect(rustEditionOffences('[dependencies]\nserde = "1"\n')).toEqual([
      'the manifest declares no [package] section, so it describes no crate',
    ])
  })

  it(
    'reads the shipped crate as edition 2024, and holds it to the floor',
    async () => {
      const manifest = await readFile(`${ROOT}${CRATE}`, 'utf8')
      expect(cargoEdition(manifest)).toBe('2024')
      expect(rustEditionOffences(manifest)).toEqual([])
      const shipped = repositoryFiles(['.toml']).filter((file) => file.label.endsWith('Cargo.toml'))
      expect(shipped.map((file) => file.label)).toEqual([CRATE])
      const faces = await Promise.all(
        shipped.map(async (file) => rustEditionOffences(await readFile(file.path, 'utf8'))),
      )
      expect(faces.flat()).toEqual([])
    },
    TREE_SCAN_BUDGET_MS,
  )
})
