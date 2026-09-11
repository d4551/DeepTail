/**
 * The registry the whole product is generated from, read as it ships.
 *
 * What the reader refuses is driven in `action-registry.spec.ts`, what the
 * emitters write in `action-registry-emit.spec.ts`, and the generated files
 * are held to the emitters in `tests/tree/faces.spec.ts`. What is left, and
 * what is here, is the shipped document itself: every action names a lane a
 * reader can open, and prices itself in a capability the page can spend.
 */

import { describe, expect, it } from 'bun:test'
import { isCapabilityId } from '../apps/deeptail/src/actions/registry.ts'
import { readRegistry } from '../scripts/action-registry.ts'
import { ROOT } from '../scripts/source-tree.ts'

/** The registry as it ships. */
const registry = readRegistry(await Bun.file(`${ROOT}apps/deeptail/src/actions/actions.bao`).text())

describe('the shipped action registry', () => {
  it('names a lane that exists for every action', async () => {
    // The lane is the suite that verifies the action. One that names a file
    // nobody wrote is an action whose verification is a sentence in a document.
    const checked = await Promise.all(
      registry.actions.map(async (action) =>
        (await Bun.file(`${ROOT}${action.lane}`).exists()) ? '' : `${action.id}: ${action.lane}`,
      ),
    )
    expect(checked.filter((lane) => lane !== '')).toEqual([])
  })

  it('prices every action in a capability the generated face declares', () => {
    // The reader refuses a dangling reference inside the document; this is the
    // same question asked of the face the page compiles against, which is what
    // decides whether a control can be drawn at all.
    const undeclared = registry.actions
      .map((action) => action.capability)
      .filter((capability) => !isCapabilityId(capability))
    expect(undeclared).toEqual([])
  })

  it('declares an action at all, so neither case above passes over an empty list', () => {
    expect(registry.actions.length).toBeGreaterThan(0)
  })
})
