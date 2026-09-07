/**
 * What each gate in the chain declares about itself.
 *
 * A gate's declaration is the whole of what a reader gets: which files it
 * looked at, what it says when it refuses, and what it says when it does not.
 * All of it lived inside an `import.meta.main` guard, where no suite could
 * reach it — so a refusal could have been emptied, or a gate pointed at no file
 * kind at all, and every suite would have stayed green while the chain went on
 * printing a clean line over nothing.
 */

import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { GATE as BANS } from '../scripts/check-bans.ts'
import { GATE as COPY } from '../scripts/check-copy.ts'
import { GATE as DIALOGS } from '../scripts/check-dialogs.ts'
import { GATE as ENTRIES } from '../scripts/check-entries.ts'
import { GATE as INLINE_STYLES } from '../scripts/check-no-inline-styles.ts'
import { GATE as SIZE } from '../scripts/check-size.ts'
import { GATE as STYLESHEETS } from '../scripts/check-stylesheets.ts'
import { GATE as TREE } from '../scripts/check-tree.ts'
import { type Gate, readGate } from '../scripts/gate-runner.ts'
import type { SourceFile } from '../scripts/source-tree.ts'
import { joined } from './fixtures.ts'

/** Every gate the chain runs, by the script that runs it. */
const GATES: readonly (readonly [string, Gate])[] = [
  ['check:bans', BANS],
  ['check:styles (inline)', INLINE_STYLES],
  ['check:styles (sheets)', STYLESHEETS],
  ['check:tree', TREE],
  ['check:entries', ENTRIES],
  ['check:copy', COPY],
  ['check:dialogs', DIALOGS],
  ['check:size', SIZE],
]

/** The temp roots the running case has written a probe file into, removed when the case ends. */
const heldRoots: string[] = []

/**
 * Run one gate over a single file written for it.
 *
 * The file's temp root is registered for the suite's `afterEach` rather than
 * paired with the read, so a failed assertion still leaves nothing behind.
 * @param gate - the gate to drive.
 * @param name - the file's name, which decides the dialect.
 * @param text - what the file holds.
 * @returns what the gate said.
 */
async function drive(gate: Gate, name: string, text: string): Promise<{ ok: boolean; text: string }> {
  const root = await mkdtemp(join(tmpdir(), 'gate-declaration-'))
  const file: SourceFile = { label: name, path: join(root, 'held') }
  await writeFile(file.path, text)
  heldRoots.push(root)
  return await readGate(gate, [file])
}

afterEach(async () => {
  const roots = heldRoots.splice(0)
  await Promise.all(roots.map(async (root) => await rm(root, { recursive: true, force: true })))
})

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
