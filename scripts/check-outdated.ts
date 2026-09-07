/**
 * Refuse a dependency that is behind a version this workspace could install.
 *
 * The stack floors in `tests/stack.spec.ts` catch a downgrade; nothing caught
 * the floors themselves going stale, so a pin could sit a year behind and every
 * gate stayed green. This reads `bun outdated`, the package manager's own
 * report, rather than asking the registry directly: a hand-rolled fetch would
 * have to reimplement range resolution, workspace filtering, and version
 * currency, and would drift from what `bun install` actually does.
 *
 * @module
 */

import { compare, parse } from 'semver'
import { declaredPins } from './manifest.ts'

/** One row of the `bun outdated` table. */
interface OutdatedRow {
  /** Package name, without the `(dev)` suffix the table appends. */
  readonly name: string
  /** The version installed now. */
  readonly current: string
  /** The newest version published. */
  readonly latest: string
}

/**
 * The command that asks bun for every workspace's outdated table.
 *
 * `bun outdated` without a filter reports only the cwd workspace, so a pin
 * behind in `apps/deeptail` (playwright sat at 1.62.1 while 1.63.0 was
 * installable) never appeared. The filter is what makes the gate see the
 * same table a human gets from `bun outdated --filter "*"`.
 */
export const OUTDATED_COMMAND = ['bun', 'outdated', '--filter', '*'] as const

/** The cells of one table row, or undefined when the line is a rule or header. */
function cellsOf(line: string): string[] | undefined {
  if (!line.startsWith('|') || line.startsWith('|--')) return undefined
  const cells = line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim())
  // Four columns is one workspace. Five is the all-workspace table (Workspace
  // appended). Six or more is a later bun column the gate does not judge.
  // Dropping those rows used to hide an outdated pin behind an extra cell.
  return cells.length >= 4 ? cells : undefined
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
    const [name = '', current = '', , latest = ''] = cells
    if (name === 'Package') continue
    rows.push({
      name: name.replace(/\s*\(dev\)$/u, '').trim(),
      current: current.trim(),
      latest: latest.trim(),
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
 * redden it.
 * @param rows - the parsed table.
 * @returns one line per package that is behind, empty when none is.
 */
export function behindInstallable(rows: readonly OutdatedRow[]): string[] {
  const behind: string[] = []
  for (const row of rows) {
    if (row.latest === '') continue
    // Compared by version, not by string, and parsed, not coerced: `coerce`
    // drops the prerelease it was given, which would read 0.1.2-rc.1 and
    // 0.1.2-alpha.3 as equal and hide a channel that has moved on. A package
    // whose dist-tag `latest` lags a prerelease channel it publishes ahead of
    // (current 0.1.2-rc.1, `latest` tag 0.0.1-rc.1) is ahead, not behind — the
    // tag's age is the registry's bookkeeping, not a pin left behind.
    const published = parse(row.latest)
    const installed = parse(row.current)
    if (published === null || installed === null) {
      behind.push(`${row.name} reports versions this gate cannot read: ${row.current} vs ${row.latest}`)
      continue
    }
    if (compare(published, installed) === 1) {
      behind.push(`${row.name} is at ${row.current} and ${row.latest} is installable now`)
    }
  }
  return behind
}

/**
 * Whether bun printed a table this gate is supposed to read.
 *
 * An empty report (every pin current) has no table. A table whose header is
 * present and whose rows this parser dropped — a sixth column, a renamed
 * header — must not pass as "0 checked".
 * @param output - what the command printed.
 */
export function tablePrinted(output: string): boolean {
  return output.split('\n').some((line) => {
    if (!line.startsWith('|') || line.startsWith('|--')) return false
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim())
    return cells[0] === 'Package' && cells.length >= 4
  })
}

if (import.meta.main) {
  const run = Bun.spawnSync([...OUTDATED_COMMAND], { stderr: 'pipe' })
  if (run.exitCode !== 0) {
    process.stderr.write(`check-outdated: bun outdated exited ${String(run.exitCode)}\n${run.stderr?.toString() ?? ''}`)
    process.exit(1)
  }
  const output = run.stdout?.toString() ?? ''
  const rows = parseOutdated(output)
  if (tablePrinted(output) && rows.length === 0) {
    process.stderr.write('check-outdated: bun printed a table this gate could not read\n')
    process.exit(1)
  }
  const pins = declaredPins()
  if (pins.size === 0) {
    process.stderr.write('check-outdated: no dependencies are declared in any workspace manifest\n')
    process.exit(1)
  }
  const behind = behindInstallable(rows)
  if (behind.length > 0) {
    process.stderr.write(`check-outdated: dependencies behind an installable version:\n  ${behind.join('\n  ')}\n`)
    process.exit(1)
  }
  process.stdout.write(
    `every dependency is at the newest version this workspace can install (${String(pins.size)} declared pins current; bun listed ${String(rows.length)} outdated)\n`,
  )
}
