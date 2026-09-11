/**
 * The Rust freshness gate's reader, against the shapes cargo prints.
 *
 * The JavaScript half is held to `bun outdated` and the Rust half was held to
 * nothing, so `Cargo.lock` could sit a year behind every range `Cargo.toml`
 * declares with every gate green. This suite pins what the gate reads out of
 * cargo's own report, including the lines it must not read as a crate — and
 * the program half the `import.meta.main` guard keeps from an importing suite,
 * driven here in this process against a cargo that answers from a captured
 * report.
 */

import { describe, expect, it, spyOn } from 'bun:test'
import { FRESHNESS_COMMAND, type freshnessReport, heldByRange, staleCrates } from '../scripts/cargo-freshness.ts'

/** The program the merge chain runs, by absolute path. */
const GATE = new URL('../scripts/cargo-freshness.ts', import.meta.url).pathname

describe('the cargo freshness reader', () => {
  it('reads every crate a lockfile refresh would move', () => {
    const report = [
      '    Updating crates.io index',
      '    Updating mio v1.2.2 -> v1.2.3',
      '    Updating cc v1.4.4 -> v1.4.5',
    ].join('\n')
    expect(staleCrates(report)).toEqual([
      { name: 'mio', from: '1.2.2', to: '1.2.3' },
      { name: 'cc', from: '1.4.4', to: '1.4.5' },
    ])
  })

  it('reads no crate out of cargo’s own progress lines', () => {
    // "Updating crates.io index" is the registry fetch, not a crate; a reader
    // that matched on the word alone reported it as a dependency behind.
    expect(staleCrates('    Updating crates.io index')).toEqual([])
    expect(staleCrates('     Locking 0 packages to latest Rust 1.85 compatible versions')).toEqual([])
    expect(staleCrates('warning: not updating lockfile due to dry run')).toEqual([])
  })

  it('reads a version with a build tag, which cargo prints for some crates', () => {
    expect(staleCrates('    Updating toml v1.1.4+spec-1.1.0 -> v1.1.5+spec-1.1.0')).toEqual([
      { name: 'toml', from: '1.1.4+spec-1.1.0', to: '1.1.5+spec-1.1.0' },
    ])
  })

  it('counts the crates a range in the tree holds back, without claiming whose range it is', () => {
    expect(heldByRange('note: pass `--verbose` to see 26 unchanged dependencies behind latest')).toBe(26)
    expect(heldByRange('every crate is current')).toBe(0)
  })

  it('reads a note cargo spaced differently, rather than counting nothing', () => {
    // cargo pads its notes to line them up, so the run of spaces before the
    // word is a run, not a space. A reader that admitted exactly one would
    // report zero held back for a report that named twenty-six.
    expect(heldByRange('note: 26  unchanged dependencies behind latest')).toBe(26)
  })
})

describe('the shapes the cargo reader admits and refuses', () => {
  it('reads a crate however cargo spaced the line, and not one it did not name', () => {
    // Every gap in that line is a run of whitespace cargo chooses the width of,
    // and a reader that admitted exactly one space at any of them would walk
    // past the crate entirely.
    expect(staleCrates('    Updating  mio  v1.2.2  ->  v1.2.3')).toEqual([{ name: 'mio', from: '1.2.2', to: '1.2.3' }])
    // Trailing whitespace is still the end of the line.
    expect(staleCrates('    Updating mio v1.2.2 -> v1.2.3   ')).toEqual([{ name: 'mio', from: '1.2.2', to: '1.2.3' }])
  })

  it('reads no crate out of a line that merely mentions one', () => {
    // The word has to open the line. A reader that found it anywhere would read
    // cargo's own prose, and a warning naming a crate would fail the gate.
    expect(staleCrates('warning: Updating mio v1.2.2 -> v1.2.3 was skipped')).toEqual([])
    expect(staleCrates('  Blocking Updating mio v1.2.2 -> v1.2.3')).toEqual([])
  })

  it('reads no crate out of a line that carries anything after the version', () => {
    // The line ends at the version cargo would move to. Reading past it would
    // take a note about a crate for the move itself.
    expect(staleCrates('    Updating mio v1.2.2 -> v1.2.3 (held back)')).toEqual([])
  })

  it('asks cargo rather than the registry', () => {
    // Reading cargo's own answer is what keeps the gate from drifting from
    // what `cargo build` would actually resolve.
    expect([...FRESHNESS_COMMAND]).toEqual(['cargo', 'update', '--dry-run'])
  })
})

/** What one in-process run of the guard wrote, and what it left the process under. */
interface GuardRun {
  /** Every write the guard made to the output stream, in order. */
  readonly out: readonly string[]
  /** Every write the guard made to the error stream, in order. */
  readonly err: readonly string[]
  /** The exit status the guard left the process under, as the process types it. */
  readonly exit: string | number | null | undefined
  /** Whether the freshly evaluated module exported its reader. */
  readonly loaded: boolean
  /** The freshly evaluated module's readers, for the branches a guard run does not reach. */
  readonly reader: {
    readonly freshnessReport: typeof freshnessReport
    readonly heldByRange: typeof heldByRange
  }
}

/**
 * Run the gate's program half in this process.
 *
 * `import.meta.main` follows the entrypoint a module is loaded under, so the
 * guard is reached by pointing `Bun.main` at the script and importing it again
 * under a query no other import has used: the module evaluates fresh, its guard
 * sees a program, and the cargo it asks is answered by the shell script given
 * here rather than by a crate tree. The type of `Bun.main` names the property
 * read-only, so the pointer is set the way the runtime sets any property, and
 * it is put back with the rest before the case asserts. The streams are held
 * by spies so the report is read exactly where the guard writes it. The exit
 * status is put back to nought when the process carried none: the runtime holds
 * a status once it is set, and an unset one and a nought exit alike.
 * @param query - the query that keeps this evaluation out of the module cache.
 * @param script - what the substituted cargo runs, in place of a real one.
 * @returns what the guard wrote, what it left the process under, and the
 * readers of the module instance that evaluated.
 */
async function runGuard(query: string, script: string): Promise<GuardRun> {
  const entryMain = Bun.main
  const entryExit = process.exitCode
  const spawnSync = Bun.spawnSync
  const out = spyOn(process.stdout, 'write').mockImplementation(() => true)
  const err = spyOn(process.stderr, 'write').mockImplementation(() => true)
  const spawn = spyOn(Bun, 'spawnSync').mockImplementation(() =>
    spawnSync(['/bin/sh', '-c', script], {
      stdout: 'pipe',
      stderr: 'pipe',
    }),
  )
  Reflect.set(Bun, 'main', GATE)
  const mod = await import(`${GATE}?${query}`)
  const run: GuardRun = {
    out: out.mock.calls.map((call) => String(call[0])),
    err: err.mock.calls.map((call) => String(call[0])),
    exit: process.exitCode,
    loaded: typeof mod.freshnessReport === 'function',
    reader: {
      freshnessReport: mod.freshnessReport,
      heldByRange: mod.heldByRange,
    },
  }
  spawn.mockRestore()
  err.mockRestore()
  out.mockRestore()
  Reflect.set(Bun, 'main', entryMain)
  process.exitCode = entryExit ?? 0
  return run
}

describe('the gate as the program, driven in this process', () => {
  it('says what its cargo said, and fails, when its cargo itself fails', async () => {
    const run = await runGuard(
      'guard-failed=1',
      "cat <<'REPORT' >&2\nerror: could not resolve the crate graph\nREPORT\nexit 101",
    )
    expect(run.loaded).toBe(true)
    expect(run.out).toEqual([])
    expect(run.err).toEqual(['check-cargo: cargo update exited 101\nerror: could not resolve the crate graph\n'])
    expect(run.exit).toBe(1)
  })

  it('reads what its cargo printed, says the lockfile is current, and exits nought', async () => {
    // The readers are driven through the instance this case evaluated, so the
    // branches the clean run does not reach are answered by the same module the
    // guard ran: the failure report, and the count of a range that holds back.
    const run = await runGuard('guard-current=1', "cat <<'REPORT' >&2\n    Updating crates.io index\nREPORT\nexit 0")
    expect(run.loaded).toBe(true)
    expect(run.out).toEqual(['every crate is at the newest version its declared range admits\n'])
    expect(run.err).toEqual([''])
    expect(run.exit).toBe(0)
    expect(
      run.reader.freshnessReport('    Updating mio v1.2.2 -> v1.2.3\nwarning: not updating lockfile due to dry run'),
    ).toEqual({
      out: '',
      err: 'check-cargo: the lockfile is behind what its own ranges admit:\n  mio 1.2.2 -> 1.2.3\n',
      code: 1,
    })
    expect(run.reader.heldByRange('note: pass `--verbose` to see 26 unchanged dependencies behind latest')).toBe(26)
  })
})
