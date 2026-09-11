/**
 * The Rust freshness gate as the program the merge chain runs.
 *
 * `cargo-gate.spec.ts` drives what the gate reads out of cargo's report. This
 * drives what it does with it: which stream each half of the answer goes to,
 * what the shell is told, and what happens when cargo itself fails. All of that
 * lived under `import.meta.main`, where no importing suite reaches it, and the
 * module scored 37.80 with every one of those mutants surviving.
 *
 * Cargo is substituted, and only cargo: a program on the path that prints what
 * cargo prints. Above that boundary this is the shipped gate, run as a process,
 * reading a report it did not write. The process plumbing — the made tree, the
 * spawn, the two streams — is the one the gate-program suites share.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { chmod, mkdir, realpath, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { CRATE_DIRECTORY, freshnessReport } from '../scripts/cargo-freshness.ts'
import { importRunsNothing, runGateProgram, suiteRoot } from './gate-program.ts'

/** The program the merge chain runs, by absolute path. */
const GATE = new URL('../scripts/cargo-freshness.ts', import.meta.url).pathname

/** What one run of the gate told the two streams and the shell, and where it ran. */
interface Run {
  readonly out: string
  readonly err: string
  readonly code: number
  /** The directory the substituted cargo was run in. */
  readonly ran: string
  /** The made root the gate ran inside. */
  readonly root: string
}

/**
 * Run the gate with a cargo that prints what this case wants it to.
 *
 * cargo writes its report to the error stream, which is where the real one
 * writes it, so what the gate reads is shaped the way cargo shapes it.
 * @param report - what the substituted cargo prints to its error stream.
 * @param code - what the substituted cargo exits with.
 * @returns what the gate printed and exited with, and where cargo ran.
 */
async function runGate(report: string, code = 0, onStdout = ''): Promise<Run> {
  const root = await suiteRoot('cargo-gate-')
  // The crate directory the gate changes into has to exist, or the spawn fails
  // before cargo is ever reached.
  await mkdir(join(root, CRATE_DIRECTORY), { recursive: true })
  const bin = join(root, 'bin')
  await mkdir(bin, { recursive: true })
  const where = join(root, 'where')
  // The substituted cargo records where it was run, so a gate that stopped
  // asking for the crate directory is a gate this suite can name.
  const script = [
    '#!/bin/sh',
    `pwd > ${where}`,
    `cat <<'ON_STDOUT'`,
    onStdout,
    'ON_STDOUT',
    `cat <<'ON_STDERR' >&2`,
    report,
    'ON_STDERR',
    `exit ${String(code)}`,
    '',
  ].join('\n')
  await writeFile(join(bin, 'cargo'), script)
  await chmod(join(bin, 'cargo'), 0o755)
  const run = await runGateProgram(GATE, root, bin)
  const ran = await Bun.file(where)
    .text()
    .then(
      (text) => text.trim(),
      () => '',
    )
  return { ...run, ran, root }
}

/** A report in which cargo would move two crates. */
const BEHIND = [
  '    Updating crates.io index',
  '    Updating mio v1.2.2 -> v1.2.3',
  '    Updating cc v1.4.4 -> v1.4.5',
].join('\n')

describe('what the gate reports for one cargo report', () => {
  it('says every crate is current, on the output stream, with nothing to answer for', () => {
    expect(freshnessReport('    Updating crates.io index')).toEqual({
      out: 'every crate is at the newest version its declared range admits\n',
      err: '',
      code: 0,
    })
  })

  it('names every crate a refresh would move, on the error stream, and fails', () => {
    expect(freshnessReport(BEHIND)).toEqual({
      out: '',
      err: 'check-cargo: the lockfile is behind what its own ranges admit:\n  mio 1.2.2 -> 1.2.3\n  cc 1.4.4 -> 1.4.5\n',
      code: 1,
    })
  })

  it('reports what a range holds back beside a clean answer, and does not fail on it', () => {
    // A major nothing in the tree admits is not a lockfile left behind, so it
    // is said and passed rather than counted against the gate.
    const held = 'note: pass `--verbose` to see 26 unchanged dependencies behind latest'
    expect(freshnessReport(held)).toEqual({
      out: [
        '26 crates are behind a major some range in the tree does not admit',
        'every crate is at the newest version its declared range admits',
        '',
      ].join('\n'),
      err: '',
      code: 0,
    })
  })

  it('reports what a range holds back beside a failure too', () => {
    const both = `${BEHIND}\nnote: pass \`--verbose\` to see 26 unchanged dependencies behind latest`
    const report = freshnessReport(both)
    expect(report.out).toBe('26 crates are behind a major some range in the tree does not admit\n')
    expect(report.code).toBe(1)
  })
})

describe('the gate as the program the merge chain runs', () => {
  it('reads what cargo printed and says the lockfile is current', async () => {
    const run = await runGate('    Updating crates.io index')
    expect([run.code, run.err]).toEqual([0, ''])
    expect(run.out).toBe('every crate is at the newest version its declared range admits\n')
  })

  it('names the crates a refresh would move, and fails the gate', async () => {
    const run = await runGate(BEHIND)
    expect(run.code).toBe(1)
    expect(run.err).toBe(
      'check-cargo: the lockfile is behind what its own ranges admit:\n  mio 1.2.2 -> 1.2.3\n  cc 1.4.4 -> 1.4.5\n',
    )
    expect(run.out).toBe('')
  })

  it('reads cargo’s report off the error stream, which is where cargo writes it', async () => {
    // Reading only the output stream would read nothing at all: cargo prints
    // its progress, and therefore its answer, to the error stream.
    const run = await runGate('    Updating mio v1.2.2 -> v1.2.3')
    expect(run.code).toBe(1)
    expect(run.err).toContain('mio 1.2.2 -> 1.2.3')
  })
})

describe('what the gate asks cargo, and where', () => {
  it('reads the output stream too, because not every cargo writes only to one', async () => {
    // The two streams are joined and read together. A gate that dropped either
    // half would walk past whatever that half carried.
    const run = await runGate('', 0, '    Updating cc v1.4.4 -> v1.4.5')
    expect(run.code).toBe(1)
    expect(run.err).toContain('cc 1.4.4 -> 1.4.5')
  })

  it('asks cargo inside the crate directory it declares, and nowhere else', async () => {
    // Run anywhere else, cargo answers about another lockfile or none at all,
    // and the gate reports on a crate it was not pointed at. The directory the
    // gate ran in is the one this suite made for the crate, read through the
    // filesystem's own answer for the path, because the shell prints where it
    // stands by the physical route and the made root is reached by a symlinked
    // one. It is not the root itself: a constant emptied of its value would
    // leave the gate asking cargo in the very directory it was spawned in,
    // where no crate lives. That the constant names the real crate is what the
    // shipped gate proves on the real tree, where cargo answers about a
    // lockfile or fails.
    const run = await runGate('    Updating crates.io index')
    expect(run.ran).toBe(await realpath(join(run.root, CRATE_DIRECTORY)))
    expect(run.ran).not.toBe(await realpath(run.root))
  })

  it('fails, and says what cargo said, when cargo itself fails', async () => {
    // A gate that read a failed run's empty report would call the lockfile
    // current on the strength of cargo not having answered.
    const run = await runGate('error: could not resolve the crate graph', 101)
    expect(run.code).toBe(1)
    expect(run.err).toContain('check-cargo: cargo update exited 101')
    expect(run.err).toContain('error: could not resolve the crate graph')
    expect(run.out).toBe('')
  })

  it('runs nothing when it is imported rather than run', async () => {
    await importRunsNothing(GATE, 'cargo-gate-')
  })
})
