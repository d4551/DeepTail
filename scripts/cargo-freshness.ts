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

/** Where the crate whose lockfile this reads lives, relative to the tree root. */
export const CRATE_DIRECTORY = 'apps/deeptail/src-tauri'

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
 * The first three groups a pattern captured, when it captured all three.
 *
 * A group is optional to the compiler however sure the pattern is of it, and a
 * fallback value written per group is three pieces of unreachable code rather
 * than one readable rule. This is the rule: all three, or nothing to read.
 * @param found - what a pattern matched.
 * @returns the three captures, or undefined when the pattern left one behind.
 */
export function capturedThree(found: RegExpExecArray): readonly [string, string, string] | undefined {
  const [, first, second, third] = found
  if (first === undefined || second === undefined || third === undefined) return undefined
  return [first, second, third]
}

/**
 * The crates a lockfile refresh would move.
 * @param output - what the command printed.
 * @returns one entry per crate, in the order cargo listed them.
 */
export function staleCrates(output: string): StaleCrate[] {
  const stale: StaleCrate[] = []
  for (const line of output.split('\n')) {
    // `Updating crates.io index` is progress, not a crate: it has no arrow, so
    // the pattern does not match it.
    const found = UPDATING.exec(line)
    const parts = found === null ? undefined : capturedThree(found)
    if (parts !== undefined) stale.push({ name: parts[0], from: parts[1], to: parts[2] })
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

/** What the gate tells a reader, a shell, and each of the two streams. */
export interface Freshness {
  /** What is written to the output stream. */
  readonly out: string
  /** What is written to the error stream. */
  readonly err: string
  /** The code the shell is given. */
  readonly code: number
}

/**
 * What the gate reports for one cargo report.
 *
 * Separated from the run that produces the report, because the decision — what
 * a reader is told, and what the shell is told — is the half a suite can drive
 * without a crate tree and a registry behind it.
 * @param output - everything cargo printed, both streams together.
 * @returns the two streams and the exit code.
 */
export function freshnessReport(output: string): Freshness {
  const stale = staleCrates(output)
  const held = heldByRange(output)
  // Reported and never failed on: a major nothing in the tree admits is not a
  // lockfile left behind, and cargo does not say whose range holds it.
  const note = held > 0 ? `${String(held)} crates are behind a major some range in the tree does not admit\n` : ''
  if (stale.length === 0) {
    return { out: `${note}every crate is at the newest version its declared range admits\n`, err: '', code: 0 }
  }
  const lines = stale.map((crate) => `  ${crate.name} ${crate.from} -> ${crate.to}`)
  return {
    out: note,
    err: `check-cargo: the lockfile is behind what its own ranges admit:\n${lines.join('\n')}\n`,
    code: 1,
  }
}

if (import.meta.main) {
  // Both streams are asked for by name, so both come back as buffers and
  // neither read needs a fallback for a stream that was never captured.
  const run = Bun.spawnSync([...FRESHNESS_COMMAND], { cwd: CRATE_DIRECTORY, stdout: 'pipe', stderr: 'pipe' })
  if (run.exitCode === 0) {
    // cargo writes its report to stderr, and other versions of it write part to
    // stdout, so the two are read together rather than one of them guessed at.
    const report = freshnessReport(`${run.stdout.toString()}\n${run.stderr.toString()}`)
    process.stdout.write(report.out)
    process.stderr.write(report.err)
    process.exitCode = report.code
  } else {
    process.stderr.write(`check-cargo: cargo update exited ${String(run.exitCode)}\n${run.stderr.toString()}`)
    process.exitCode = 1
  }
}
