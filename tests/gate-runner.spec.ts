/**
 * The reading every gate shares.
 *
 * Five gates had written this out apiece — the walk, the rendering of an
 * offence, the choice of an exit status — and four of the five copies sat
 * inside an `import.meta.main` guard, where nothing but the command line could
 * reach them. What a gate prints is what a reader acts on, so it is stated
 * here once and driven directly.
 */

import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CONSOLE, type Gate, type GateOutcome, readGate, renderOffence, reportGate } from '../scripts/gate-runner.ts'
import type { SourceFile } from '../scripts/source-tree.ts'

/** A gate that refuses whatever a file says to refuse. */
const REFUSING: Gate = {
  extensions: ['.probe'],
  refusal: 'the probe refused something',
  clean: (files) => `the probe refused nothing (${String(files)} files)`,
  scan: (label, text) => (text.includes('bad') ? [{ label, line: 2, why: 'this file says bad' }] : []),
}

/**
 * A tree of probe files, and the list a gate would read it through.
 * @param contents - what each file holds, keyed by name.
 * @returns the file list and a disposer.
 */
async function tree(contents: Readonly<Record<string, string>>): Promise<{
  readonly files: SourceFile[]
  readonly dispose: () => Promise<void>
}> {
  const root = await mkdtemp(join(tmpdir(), 'gate-runner-'))
  const files: SourceFile[] = Object.keys(contents).map((name) => ({ label: name, path: join(root, name) }))
  await Promise.all(files.map(async (file) => await writeFile(file.path, contents[file.label] ?? '')))
  return { files, dispose: async () => await rm(root, { recursive: true, force: true }) }
}

/** The disposer of the probe tree the running case holds, if it holds one. */
let disposeHeldTree: (() => Promise<void>) | undefined

/**
 * A tree of probe files held for the running case, and removed when the case
 * ends — after an assertion failure too, which is why the disposer is
 * registered for the suite's `afterEach` rather than paired with the read.
 * @param contents - what each file holds, keyed by name.
 * @returns the file list a gate would read the tree through.
 */
async function heldFiles(contents: Readonly<Record<string, string>>): Promise<SourceFile[]> {
  const made = await tree(contents)
  disposeHeldTree = made.dispose
  return made.files
}

/** A pair of streams that record what was written to them. */
function recorder(): {
  readonly out: string[]
  readonly err: string[]
  readonly streams: Parameters<typeof reportGate>[1]
} {
  const out: string[] = []
  const err: string[] = []
  return { out, err, streams: { out: (text) => out.push(text), err: (text) => err.push(text) } }
}

describe('the offence rendering', () => {
  it('names the file, the line and the reason, indented under the refusal', () => {
    expect(renderOffence({ label: 'scripts/a.ts', line: 12, why: 'this is wrong' })).toBe(
      '  scripts/a.ts:12: this is wrong',
    )
  })
})

describe('the gate reading', () => {
  afterEach(async () => {
    const dispose = disposeHeldTree
    disposeHeldTree = undefined
    await dispose?.()
  })

  it('says what it refused, one line per offence, under the gate’s own refusal', async () => {
    const files = await heldFiles({ 'a.probe': 'bad', 'b.probe': 'fine', 'c.probe': 'bad' })
    expect(await readGate(REFUSING, files)).toEqual({
      ok: false,
      text: 'the probe refused something:\n  a.probe:2: this file says bad\n  c.probe:2: this file says bad\n',
    })
  })

  it('says how many files it read when it refused nothing', async () => {
    const files = await heldFiles({ 'a.probe': 'fine', 'b.probe': 'fine' })
    expect(await readGate(REFUSING, files)).toEqual({ ok: true, text: 'the probe refused nothing (2 files)\n' })
  })

  it('reads only the files it says it reads, and counts only those', async () => {
    const files = await heldFiles({ 'keep.probe': 'bad', 'skip.probe': 'bad' })
    const only: Gate = { ...REFUSING, only: (file) => file.label.startsWith('keep') }
    const outcome = await readGate(only, files)
    expect(outcome.text).toBe('the probe refused something:\n  keep.probe:2: this file says bad\n')
    expect((await readGate({ ...only, scan: () => [] }, files)).text).toBe('the probe refused nothing (1 files)\n')
  })

  it('is clean over no files at all, rather than reading that as a refusal', async () => {
    expect(await readGate(REFUSING, [])).toEqual({ ok: true, text: 'the probe refused nothing (0 files)\n' })
  })
})

describe('the gate report', () => {
  it('writes a refusal to the error stream and exits non-zero', () => {
    const recorded = recorder()
    const outcome: GateOutcome = { ok: false, text: 'refused\n' }
    expect(reportGate(outcome, recorded.streams)).toBe(1)
    expect([recorded.out, recorded.err]).toEqual([[], ['refused\n']])
  })

  it('writes a clean run to the output stream and exits zero', () => {
    const recorded = recorder()
    expect(reportGate({ ok: true, text: 'clean\n' }, recorded.streams)).toBe(0)
    expect([recorded.out, recorded.err]).toEqual([['clean\n'], []])
  })

  it('writes to the process streams when it is run from the command line', () => {
    // The one place the report reaches a person. Writing nothing is what makes
    // this safe to call here, and what makes it worth calling at all: the two
    // arrows are the only lines in the chain a suite would otherwise not run.
    expect(() => {
      CONSOLE.out('')
      CONSOLE.err('')
    }).not.toThrow()
  })
})
