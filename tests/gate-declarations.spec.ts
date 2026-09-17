/**
 * What each gate in the chain declares about itself.
 *
 * A gate's declaration is the whole of what a reader gets: which files it
 * looked at, what it says when it refuses, and what it says when it does not.
 * All of it lived inside an `import.meta.main` guard, where no suite could
 * reach it — so a refusal could have been emptied, or a gate pointed at no file
 * kind at all, and every suite would have stayed green while the chain went on
 * printing a clean line over nothing.
 *
 * The list below is written by hand, so it is read against the tree as well: it
 * names every script that declares a gate the chain runs, and every declaration
 * in it is pointed at a kind of file this repository really ships.
 */

import { describe, expect, it } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { GATE as BANS } from '../scripts/check-bans.ts'
import { GATE as ENTRIES } from '../scripts/check-entries.ts'
import { GATE as INLINE_STYLES } from '../scripts/check-no-inline-styles.ts'
import { GATE as SCALE } from '../scripts/check-scale.ts'
import { GATE as STYLESHEETS } from '../scripts/check-stylesheets.ts'
import { GATE as TREE } from '../scripts/check-tree.ts'
import { type Gate, readGate } from '../scripts/gate-runner.ts'
import { repositoryFiles, type SourceFile } from '../scripts/source-tree.ts'
import { joined } from './fixtures.ts'

/** Every gate the chain runs, by the script that runs it. */
const GATES: readonly (readonly [string, Gate])[] = [
  ['check:bans', BANS],
  ['check:styles (inline)', INLINE_STYLES],
  ['check:styles (sheets)', STYLESHEETS],
  ['check:scale', SCALE],
  ['check:tree', TREE],
  ['check:entries', ENTRIES],
]

/**
 * Run one gate over a single file written for it.
 * @param gate - the gate to drive.
 * @param name - the file's name, which decides the dialect.
 * @param text - what the file holds.
 * @returns what the gate said.
 */
async function drive(gate: Gate, name: string, text: string): Promise<{ ok: boolean; text: string }> {
  const root = await mkdtemp(join(tmpdir(), 'gate-declaration-'))
  const file: SourceFile = { label: name, path: join(root, 'held') }
  await writeFile(file.path, text)
  const said = await readGate(gate, [file])
  await rm(root, { recursive: true, force: true })
  return said
}

/**
 * The suffix a path ends in, which is the kind a gate declares.
 * @param label - the repository-relative path.
 * @returns the suffix, including its dot.
 */
function extensionOf(label: string): string {
  const at = label.lastIndexOf('.')
  return at === -1 ? label : label.slice(at)
}

/**
 * The files one gate's declaration walks, filtered the way `readGate` filters.
 *
 * A gate whose kinds match no file this repository ships reads nothing, refuses
 * nothing, and prints a clean line over an empty walk — the same silence as a
 * gate that was deleted, and one no other case here would see.
 * @param gate - the gate's declaration.
 * @param shipped - every file the repository ships.
 * @returns the labels the gate would read.
 */
function walkOf(gate: Gate, shipped: readonly SourceFile[]): string[] {
  const kinds = shipped.filter((file) => gate.extensions.includes(extensionOf(file.label)))
  const only = gate.only
  return (only === undefined ? kinds : kinds.filter((file) => only(file))).map((file) => file.label)
}

describe('every gate in the chain', () => {
  it('reads at least one kind of file', () => {
    // A gate pointed at no extension reads no file, refuses nothing, and
    // prints a clean line over an empty list.
    for (const [name, gate] of GATES) {
      expect([name, gate.extensions.length > 0]).toEqual([name, true])
    }
  })

  it('says what it refused, and what it read when it refused nothing', () => {
    for (const [name, gate] of GATES) {
      expect([name, gate.refusal.length > 15]).toEqual([name, true])
      const clean = gate.clean(7)
      expect([name, clean.includes('7')]).toEqual([name, true])
      expect([name, clean.length > 15]).toEqual([name, true])
    }
  })

  it('counts the files it read, not the files it was handed', async () => {
    // The clean line is a claim about how much was looked at. A gate that read
    // a subset and counted the whole list would overstate its own reach.
    expect((await drive(ENTRIES, 'apps/deeptail/src/main.ts', 'const a = 1\n')).text).toBe(
      'every script does nothing when imported (0 scripts)\n',
    )
  })

  it('is pointed at files this repository ships, and walks the subset it declares', () => {
    // One listing for every kind any gate declares, filtered per declaration
    // the way `readGate` filters: what is read here is the walk each gate
    // really makes, over the tree that really exists.
    const kinds = [...new Set(GATES.flatMap(([, gate]) => [...gate.extensions]))]
    const shipped = repositoryFiles(kinds)
    for (const [name, gate] of GATES) {
      expect([name, walkOf(gate, shipped).length > 0]).toEqual([name, true])
    }
    // The declaration this refuses: a kind nothing here is written in walks
    // no file at all, which is a gate that has only ever been green.
    const invented: Gate = { ...BANS, extensions: ['.not-a-kind-here'] }
    expect(walkOf(invented, shipped)).toEqual([])
    // And the subset is the subset: the entry gate reads the scripts alone,
    // and the same declaration narrowed anywhere else walks nothing — which a
    // reader that ignored `only` would answer with the whole tree.
    expect(walkOf(ENTRIES, shipped).every((label) => label.startsWith('scripts/'))).toBe(true)
    expect(walkOf({ ...ENTRIES, only: (file) => file.label.startsWith('nowhere/') }, shipped)).toEqual([])
  }, 120_000)
})

describe('the bans gate', () => {
  it('reads scripts, plain text and markup, and refuses a banned idiom in one', async () => {
    expect(BANS.extensions).toContain('.ts')
    expect(BANS.extensions).toContain('.rs')
    expect(BANS.extensions).toContain('.html')
    const found = await drive(BANS, 'scripts/probe.ts', 'var a = 1\n')
    expect(found.ok).toBe(false)
    expect(found.text).toBe(
      'the repository carries a banned idiom or a suppression:\n  scripts/probe.ts:1: use const or let\n',
    )
  })

  it('says how many files it read when it refuses nothing', async () => {
    expect(await drive(BANS, 'scripts/probe.ts', 'const a = 1\n')).toEqual({
      ok: true,
      text: 'no banned idiom or suppression (1 files)\n',
    })
  })
})

describe('the inline-style gate', () => {
  it('reads scripts and markup, and refuses a style written into one', async () => {
    expect(INLINE_STYLES.extensions).toContain('.ts')
    expect(INLINE_STYLES.extensions).toContain('.html')
    expect(INLINE_STYLES.extensions).not.toContain('.rs')
    const found = await drive(INLINE_STYLES, 'apps/probe.ts', 'el.style.color = "red"\n')
    expect(found.ok).toBe(false)
    expect(found.text.startsWith('inline styles are not allowed:\n')).toBe(true)
    expect(await drive(INLINE_STYLES, 'apps/probe.ts', 'const a = 1\n')).toEqual({
      ok: true,
      text: 'no inline styles (1 files)\n',
    })
  })
})

describe('the stylesheet gate', () => {
  it('reads stylesheets alone, and refuses a value outside the scale', async () => {
    expect([...STYLESHEETS.extensions]).toEqual(['.css'])
    const found = await drive(STYLESHEETS, 'apps/deeptail/src/styles/probe.css', '.a { padding: 37px; }\n')
    expect(found.ok).toBe(false)
    expect(found.text.startsWith('stylesheets carry values that belong to the scale:\n')).toBe(true)
    expect(await drive(STYLESHEETS, 'apps/deeptail/src/styles/probe.css', '.a { padding: 0; }\n')).toEqual({
      ok: true,
      text: 'stylesheets read the scale (1 sheets)\n',
    })
  })
})

describe('the scale gate', () => {
  it('reads stylesheets alone, and refuses a sheet that states a value of its own', async () => {
    // The gate the chain runs as `check:scale`, driven here like every other
    // one: a declaration no suite reaches is a declaration nothing holds.
    expect([...SCALE.extensions]).toEqual(['.css'])
    const stated = await drive(SCALE, 'apps/deeptail/src/styles/probe.css', '.a { font-size: 1rem; }\n')
    expect(stated.ok).toBe(false)
    expect(stated.text.startsWith('a sheet writes a value the scale does not declare:\n')).toBe(true)
    expect(await drive(SCALE, 'apps/deeptail/src/other.css', '.a { display: flex; }\n')).toEqual({
      ok: true,
      text: 'every sheet reads the scale (1 sheets)\n',
    })
  })
})

describe('the instrumentation gate', () => {
  it('reads every script kind, and names the file a run left rewritten', async () => {
    expect([...TREE.extensions]).toEqual(['.ts', '.tsx', '.js'])
    const marker = joined('stry', 'MutAct_9fa48')
    const found = await drive(TREE, 'scripts/probe.ts', `const a = ${marker}("1") ? 2 : 1\n`)
    expect(found).toEqual({
      ok: false,
      text: "a mutation run left these files instrumented; run `bun scripts/mutate-restore.ts`:\n  scripts/probe.ts:1: this file carries the instrumenter's switch\n",
    })
    expect(await drive(TREE, 'scripts/probe.ts', 'const a = 1\n')).toEqual({
      ok: true,
      text: 'no instrumentation left behind (1 files)\n',
    })
  })

  it('reads the whole switch, not either half of it', async () => {
    // Both halves are written in this repository's own sources — the backup
    // directory a run keeps carries one, and the identifier the instrumenter
    // numbers carries the other. A gate matching a half alone would refuse the
    // files that describe a run instead of the files a run rewrote.
    const clean = { ok: true, text: 'no instrumentation left behind (1 files)\n' }
    expect(await drive(TREE, 'scripts/probe.ts', "const at = '.stryker-tmp'\n")).toEqual(clean)
    expect(await drive(TREE, 'scripts/probe.ts', "const at = 'MutAct_9fa48'\n")).toEqual(clean)
  })
})

describe('the entry gate', () => {
  it('reads the scripts directory alone, and refuses work done at import', async () => {
    expect([...ENTRIES.extensions]).toEqual(['.ts'])
    const found = await drive(ENTRIES, 'scripts/probe.ts', 'doWork()\n')
    expect(found).toEqual({
      ok: false,
      text: 'a script does work when it is imported:\n  scripts/probe.ts:1: this runs when the module is imported; put the work behind `if (import.meta.main)`\n',
    })
    expect(await drive(ENTRIES, 'scripts/probe.ts', 'const a = 1\n')).toEqual({
      ok: true,
      text: 'every script does nothing when imported (1 scripts)\n',
    })
  })
})
