/**
 * The reading every gate shares.
 *
 * Five gates had written this out apiece — the walk, the rendering of an
 * offence, the choice of an exit status — and four of the five copies sat
 * inside an `import.meta.main` guard, where nothing but the command line could
 * reach them. What a gate prints is what a reader acts on, so it is stated
 * here once and driven directly.
 */

import { describe, expect, it } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type Gate, type GateOutcome, readGate, renderOffence, reportGate } from '../scripts/gate-runner.ts'
import type { SourceFile } from '../scripts/source-tree.ts'

/** The module the streams live in, by absolute path. */
const RUNNER = new URL('../scripts/gate-runner.ts', import.meta.url).pathname

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
  it('says what it refused, one line per offence, under the gate’s own refusal', async () => {
    const { files, dispose } = await tree({ 'a.probe': 'bad', 'b.probe': 'fine', 'c.probe': 'bad' })
    try {
      expect(await readGate(REFUSING, files)).toEqual({
        ok: false,
        text: 'the probe refused something:\n  a.probe:2: this file says bad\n  c.probe:2: this file says bad\n',
      })
    } finally {
      await dispose()
    }
  })

  it('says how many files it read when it refused nothing', async () => {
    const { files, dispose } = await tree({ 'a.probe': 'fine', 'b.probe': 'fine' })
    try {
      expect(await readGate(REFUSING, files)).toEqual({ ok: true, text: 'the probe refused nothing (2 files)\n' })
    } finally {
      await dispose()
    }
  })

  it('reads only the files it says it reads, and counts only those', async () => {
    const { files, dispose } = await tree({ 'keep.probe': 'bad', 'skip.probe': 'bad' })
    try {
      const only: Gate = { ...REFUSING, only: (file) => file.label.startsWith('keep') }
      const outcome = await readGate(only, files)
      expect(outcome.text).toBe('the probe refused something:\n  keep.probe:2: this file says bad\n')
      expect((await readGate({ ...only, scan: () => [] }, files)).text).toBe('the probe refused nothing (1 files)\n')
    } finally {
      await dispose()
    }
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

  it('writes to the process streams when it is run from the command line', async () => {
    // The one place the report reaches a person, and the only two lines in the
    // chain that decide which stream a reader finds it on. Driven in a process
    // of its own, because what is being read is that process's own output.
    const source = [
      `const { CONSOLE } = await import(${JSON.stringify(RUNNER)})`,
      "CONSOLE.out('clean\\n')",
      "CONSOLE.err('refused\\n')",
    ].join('\n')
    const run = Bun.spawn([process.execPath, '-e', source], { stdout: 'pipe', stderr: 'pipe' })
    const [out, err, code] = await Promise.all([
      new Response(run.stdout).text(),
      new Response(run.stderr).text(),
      run.exited,
    ])
    expect([code, out, err]).toEqual([0, 'clean\n', 'refused\n'])
  })
})
