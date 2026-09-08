/**
 * The generated faces, held to the registry they are compiled from.
 *
 * `apps/deeptail/src/actions/actions.bao` is the one place an action, the
 * capability it costs, the surface it may appear on, the remote route it
 * reaches and the lane that verifies it are written. Three TypeScript modules
 * and one Rust table are compiled from it, so the two halves of the product
 * cannot disagree about what a call costs — and that only holds while the
 * files on disk are byte for byte what the emitters produce.
 *
 * The other half of the rule is that no control is drawn by a marker the
 * registry does not declare, which is a property of every source the page ships.
 *
 * Both read the bytes of shipped files, so both sit here rather than in a
 * mutation command: a run rewrites those very files on purpose, and a case that
 * compares them against their unmutated text fails for every mutant alike.
 */

import { describe, expect, it } from 'bun:test'
import { readRegistry } from '../../scripts/action-registry.ts'
import { emitActionTable, emitCapabilities, emitTypeScript } from '../../scripts/action-registry-emit.ts'
import { emitRust } from '../../scripts/action-registry-rust.ts'
import { ROOT, repositoryFiles } from '../../scripts/source-tree.ts'

/** The registry as it ships. */
const registry = readRegistry(await Bun.file(`${ROOT}apps/deeptail/src/actions/actions.bao`).text())

describe('the generated faces', () => {
  it('are what the registry says, byte for byte', async () => {
    const faces: readonly (readonly [string, string])[] = [
      ['apps/deeptail/src/actions/registry.ts', emitTypeScript(registry)],
      ['apps/deeptail/src/actions/capabilities.ts', emitCapabilities(registry)],
      ['apps/deeptail/src/actions/action-table.ts', emitActionTable(registry)],
      ['apps/deeptail/src-tauri/src/capability/catalog.rs', emitRust(registry)],
    ]
    const read = await Promise.all(
      faces.map(async ([path, written]) => ((await Bun.file(`${ROOT}${path}`).text()) === written ? '' : path)),
    )
    expect(read.filter((path) => path !== '')).toEqual([])
  })
})

describe('the controls the page draws', () => {
  it('take every marker from the registry, so none exists that nothing authorises', async () => {
    const sources = repositoryFiles(['.ts']).filter(
      (file) => file.label.startsWith('apps/deeptail/src/') && !file.label.endsWith('registry.ts'),
    )
    const literals = await Promise.all(
      sources.map(async (file) =>
        [...(await Bun.file(file.path).text()).matchAll(/deeptailAction\s*=\s*'/gu)].map(
          (found) => `${file.label}:${String(found.index)}`,
        ),
      ),
    )
    expect(literals.flat()).toEqual([])
  })
})
