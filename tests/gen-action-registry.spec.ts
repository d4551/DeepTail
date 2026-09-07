/**
 * The generator behind `check:registry`, driven both ways.
 *
 * `bun run check:registry` is what stands between the registry and its four
 * generated faces — the TypeScript table, the capability list and the Rust
 * catalog. The whole gate rests on one comparison and one exit code, and
 * neither was driven by anything: the module sat in the tools mutation scope
 * with no spec at all, so every mutant in it survived and a `--check` that had
 * stopped comparing would have gone on answering zero.
 *
 * The writing path is deliberately not driven here — a case that rewrote the
 * repository's own generated faces would be a case that edits the tree it is
 * checking. What is driven is everything `--check` decides on.
 */

import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { readRegistry } from '../scripts/action-registry.ts'
import { emitTypeScript } from '../scripts/action-registry-emit.ts'
import { main, matches, requireLane, SOURCES } from '../scripts/gen-action-registry.ts'
import { ROOT } from '../scripts/source-tree.ts'

/** The registry this repository ships, read once. */
async function shippedRegistry(): Promise<ReturnType<typeof readRegistry>> {
  return readRegistry(await readFile(`${ROOT}${SOURCES.registry}`, 'utf8'))
}

describe('the lane every action names', () => {
  it('admits a lane that is a file the repository ships', () => {
    expect(() => requireLane(SOURCES.typescript, 'session.open')).not.toThrow()
  })

  it('refuses a lane no file answers to, naming the action that named it', () => {
    // An entry naming no file is an action nothing has driven; the matrix
    // would report it covered on the strength of a row nobody ran.
    expect(() => requireLane('apps/deeptail/src/never-shipped.ts', 'ghost.action')).toThrow(/ghost\.action/u)
    expect(() => requireLane('apps/deeptail/src/never-shipped.ts', 'ghost.action')).toThrow(/is not a file/u)
  })
})

describe('the comparison the gate rests on', () => {
  it('answers true for a face carrying exactly the bytes the registry produces', async () => {
    expect(await matches(SOURCES.typescript, emitTypeScript(await shippedRegistry()))).toBe(true)
  })

  it('answers false for a face carrying anything else', async () => {
    const drifted = `${emitTypeScript(await shippedRegistry())}\n`
    expect(await matches(SOURCES.typescript, drifted)).toBe(false)
  })

  it('answers false for a face that is not on disk, so a missing one is drift', async () => {
    // Read as empty rather than thrown on: a generated file that was deleted
    // is exactly the state this gate exists to report.
    expect(await matches('apps/deeptail/src/never-shipped.ts', 'anything')).toBe(false)
  })

  it('answers true for a missing face only when nothing was expected of it', async () => {
    expect(await matches('apps/deeptail/src/never-shipped.ts', '')).toBe(true)
  })
})

describe('the gate’s own answer', () => {
  it('reports the faces this repository ships as current', async () => {
    // The same call `check:registry` makes. It reads and compares; it writes
    // nothing, which is what makes it safe to drive from here.
    expect(await main(['--check'])).toBe(0)
  })

  it('reads --check among whatever else it is given, rather than as the only word', async () => {
    expect(await main(['--quiet', '--check'])).toBe(0)
  })
})
