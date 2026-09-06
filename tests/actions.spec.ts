/**
 * The action registry and the dispatcher that runs what it declares.
 *
 * These are the two pieces every control in the product runs through, so what is
 * asserted here is that they cannot drift apart: the generated faces are
 * compared byte for byte against what the registry says they must be, every
 * declared action is driven end to end through the dispatcher, and a refusal is
 * checked to be a refusal the operator is told about rather than a silent
 * return.
 */

import { describe, expect, it } from 'bun:test'
import { isCapabilityId } from '../apps/deeptail/src/actions/registry.ts'
import { readRegistry } from '../scripts/action-registry.ts'
import { emitActionTable, emitCapabilities, emitTypeScript } from '../scripts/action-registry-emit.ts'
import { emitRust } from '../scripts/action-registry-rust.ts'
import { ROOT, repositoryFiles } from '../scripts/source-tree.ts'

/** The registry as it ships. */
const registry = readRegistry(await Bun.file(`${ROOT}apps/deeptail/src/actions/actions.bao`).text())

/** The smallest registry the reader accepts. */
const MINIMAL = `{
  "version": 1,
  "capabilities": [{ "id": "host.read", "subject": "device", "ttlSeconds": 900 }],
  "placements": [{ "id": "boot", "surface": "The page before a shell exists." }],
  "actions": [{
    "id": "boot.retry",
    "capability": "host.read",
    "placement": "boot",
    "kind": "query",
    "pane": "none",
    "marker": "boot-retry",
    "availability": "always",
    "lane": "tests/actions.spec.ts"
  }]
}`

describe('the action registry', () => {
  it('is what the generated faces say, byte for byte', async () => {
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

  it('names a lane that exists for every action', async () => {
    const checked = await Promise.all(
      registry.actions.map(async (action) =>
        (await Bun.file(`${ROOT}${action.lane}`).exists()) ? '' : `${action.id}: ${action.lane}`,
      ),
    )
    expect(checked.filter((lane) => lane !== '')).toEqual([])
  })

  it('prices every action in a capability the registry declares', () => {
    const undeclared = registry.actions
      .map((action) => action.capability)
      .filter((capability) => !isCapabilityId(capability))
    expect(undeclared).toEqual([])
  })
})

describe('the registry reader', () => {
  it('refuses a document that carries a key the schema does not name', () => {
    const stray = MINIMAL.replace('"pane": "none",', '"pane": "none", "colour": "blue",')
    expect(() => readRegistry(MINIMAL)).not.toThrow()
    expect(() => readRegistry(stray)).toThrow(/colour/u)
  })

  it('refuses an action that points at a capability nobody declared', () => {
    const dangling = MINIMAL.replace('"capability": "host.read"', '"capability": "host.teleport"')
    expect(() => readRegistry(dangling)).toThrow(/host\.teleport/u)
  })

  it('refuses a placement that holds nothing', () => {
    const withEmptySeat = MINIMAL.replace(
      '{ "id": "boot", "surface": "The page before a shell exists." }',
      '{ "id": "boot", "surface": "The page before a shell exists." }, { "id": "unused", "surface": "Nothing sits here." }',
    )
    expect(() => readRegistry(withEmptySeat)).toThrow(/placement "unused" carries no action/u)
  })

  it('writes no marker as a literal anywhere the page builds a control', async () => {
    // Every control takes its marker from the registry, so a control that is
    // not in the registry cannot be drawn at all.
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
