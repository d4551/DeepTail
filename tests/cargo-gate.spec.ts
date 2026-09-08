/**
 * The Rust freshness gate's reader, against the shapes cargo prints.
 *
 * The JavaScript half is held to `bun outdated` and the Rust half was held to
 * nothing, so `Cargo.lock` could sit a year behind every range `Cargo.toml`
 * declares with every gate green. This suite pins what the gate reads out of
 * cargo's own report, including the lines it must not read as a crate.
 */

import { describe, expect, it } from 'bun:test'
import { FRESHNESS_COMMAND, heldByRange, staleCrates } from '../scripts/cargo-freshness.ts'

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
