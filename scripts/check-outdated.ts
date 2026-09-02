/**
 * Refuse a dependency that is behind a version this workspace could install.
 *
 * The stack floors in `tests/stack.spec.ts` catch a downgrade; nothing caught
 * the floors themselves going stale, so a pin could sit a year behind and every
 * gate stayed green. This reads `bun outdated`, the package manager's own
 * report, rather than asking the registry directly: a hand-rolled fetch would
 * have to reimplement range resolution, workspace filtering, and the
 * supply-chain hold, and would drift from what `bun install` actually does.
 *
 * A version held back by `minimumReleaseAge` is not a failure. That hold is
 * this repository's own policy — a newly published version is not installable
 * until it has been on the registry long enough to be withdrawn — so a row
 * marked as held is the policy working, not a pin left behind. `bun outdated`
 * marks those rows, and reports the newest installable version separately from
 * the newest published one, which is the distinction this check turns on.
 *
 * @module
 */

import { spawnSync } from 'node:child_process'

/** One row of the `bun outdated` table. */
interface OutdatedRow {
  /** Package name, without the `(dev)` suffix the table appends. */
  readonly name: string
  /** The version installed now. */
  readonly current: string
  /** The newest version published, whether or not the hold admits it yet. */
  readonly latest: string
  /** Whether the hold is why `update` is not the newest published version. */
  readonly held: boolean
}

/** The cells of one table row, or undefined when the line is a rule or header. */
function cellsOf(line: string): string[] | undefined {
  if (!line.startsWith('|') || line.startsWith('|--')) return undefined
  const cells = line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim())
  return cells.length === 4 ? cells : undefined
}

/**
 * Read the `bun outdated` table.
 * @param output - what the command printed.
 * @returns one entry per package the table lists.
 */
export function parseOutdated(output: string): OutdatedRow[] {
  const rows: OutdatedRow[] = []
  for (const line of output.split('\n')) {
    const cells = cellsOf(line)
    if (cells === undefined) continue
    const [name = '', current = '', update = '', latest = ''] = cells
    if (name === 'Package') continue
    rows.push({
      name: name.replace(/\s*\(dev\)$/u, '').trim(),
      current: current.trim(),
      latest: latest.replace('*', '').trim(),
      // The marker sits on whichever column the hold applies to; a row is held
      // when either the in-range target or the newest published version carries
      // it.
      held: update.includes('*') || latest.includes('*'),
    })
  }
  return rows
}

/**
 * The packages behind a version this workspace could install today.
 *
 * Read from the newest published version, not from `bun outdated`'s in-range
 * "Update" column. Every dependency here is pinned exactly, so the in-range
 * target is always the version already installed and a check against it can
 * never fire — which is what this function did until a downgrade failed to
 * redden it. A row the hold marks is excluded instead, so the only thing that
 * suppresses a report is this repository's own policy.
 * @param rows - the parsed table.
 * @returns one line per package that is behind, empty when none is.
 */
export function behindInstallable(rows: readonly OutdatedRow[]): string[] {
  return rows
    .filter((row) => !row.held && row.latest !== '' && row.latest !== row.current)
    .map((row) => `${row.name} is at ${row.current} and ${row.latest} is installable now`)
}

/**
 * The packages whose newest version this repository's own hold is withholding.
 * @param rows - the parsed table.
 * @returns one line per held package, for the report.
 */
export function heldByPolicy(rows: readonly OutdatedRow[]): string[] {
  return rows.filter((row) => row.held).map((row) => `${row.name} ${row.current}`)
}

if (import.meta.main) {
  const run = spawnSync('bun', ['outdated'], { encoding: 'utf8' })
  if (run.status !== 0) {
    process.stderr.write(`check-outdated: bun outdated exited ${String(run.status)}\n${run.stderr}`)
    process.exit(1)
  }
  const rows = parseOutdated(run.stdout)
  const behind = behindInstallable(rows)
  const held = heldByPolicy(rows)
  if (held.length > 0) {
    process.stdout.write(`held by the supply-chain hold, which is the hold working: ${held.join(', ')}\n`)
  }
  if (behind.length > 0) {
    process.stderr.write(`check-outdated: dependencies behind an installable version:\n  ${behind.join('\n  ')}\n`)
    process.exit(1)
  }
  process.stdout.write(
    `every dependency is at the newest version this workspace can install (${String(rows.length)} checked)\n`,
  )
}
