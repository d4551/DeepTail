/**
 * Refuse a Cargo lockfile behind the versions its own ranges admit.
 *
 * The JavaScript half of this repository is held to `bun outdated`, and the
 * Rust half was held to nothing: `Cargo.lock` could sit a year behind every
 * range `Cargo.toml` declares and every gate stayed green. `cargo update
 * --dry-run` is cargo's own answer to the same question — what would move if
 * the lockfile were refreshed — so this reads that rather than asking the
 * registry itself and reimplementing semver resolution.
 *
 * A crate cargo calls "behind latest" but does not offer to update is behind a
 * major this some range in the tree does not admit — this repository's own
 * `Cargo.toml` for a direct dependency, another crate's manifest for a
 * transitive one. Which of the two it is, cargo does not say here, so neither
 * does this: they are reported as a count and never failed on, because a major
 * nothing in the tree admits is not a lockfile left behind.
 *
 * @module
 */

/** The command that asks cargo what refreshing the lockfile would move. */
export const FRESHNESS_COMMAND = ['cargo', 'update', '--dry-run'] as const

/** One crate cargo would move, were the lockfile refreshed. */
export interface StaleCrate {
  readonly name: string
  readonly from: string
  readonly to: string
}

/** A line naming a crate cargo would move. */
const UPDATING = /^\s*Updating\s+(\S+)\s+v(\S+)\s+->\s+v(\S+)\s*$/u

/** The note cargo prints for crates a declared range holds back. */
const HELD = /(\d+)\s+unchanged dependencies behind latest/u

/**
 * The crates a lockfile refresh would move.
 * @param output - what the command printed.
 * @returns one entry per crate, in the order cargo listed them.
 */
export function staleCrates(output: string): StaleCrate[] {
  const stale: StaleCrate[] = []
  for (const line of output.split('\n')) {
    const found = UPDATING.exec(line)
    // `Updating crates.io index` is progress, not a crate: it has no arrow, so
    // the pattern does not match it.
    if (found !== null) stale.push({ name: found[1] ?? '', from: found[2] ?? '', to: found[3] ?? '' })
  }
  return stale
}

/**
 * How many crates a declared range is holding back.
 * @param output - what the command printed.
 * @returns the count cargo reported, or zero when it reported none.
 */
export function heldByRange(output: string): number {
  const found = HELD.exec(output)
  return found === null ? 0 : Number(found[1])
}

if (import.meta.main) {
  const run = Bun.spawnSync([...FRESHNESS_COMMAND], { cwd: 'apps/deeptail/src-tauri', stderr: 'pipe' })
  if (run.exitCode !== 0) {
    process.stderr.write(`check-cargo: cargo update exited ${String(run.exitCode)}\n${run.stderr?.toString() ?? ''}`)
    process.exit(1)
  }
  // cargo writes its progress to stderr and nothing to stdout, so both are read.
  const output = `${run.stdout?.toString() ?? ''}\n${run.stderr?.toString() ?? ''}`
  const stale = staleCrates(output)
  const held = heldByRange(output)
  if (held > 0) {
    process.stdout.write(`${String(held)} crates are behind a major some range in the tree does not admit\n`)
  }
  if (stale.length > 0) {
    const lines = stale.map((crate) => `  ${crate.name} ${crate.from} -> ${crate.to}`)
    process.stderr.write(`check-cargo: the lockfile is behind what its own ranges admit:\n${lines.join('\n')}\n`)
    process.exit(1)
  }
  process.stdout.write('every crate is at the newest version its declared range admits\n')
}
