/**
 * The outdated gate's program half, driven in this process.
 *
 * `outdated-gate.spec.ts` drives what the gate reads out of bun's table, and
 * `outdated-gate-program.spec.ts` drives it as a spawned process. This drives
 * the guard where it stands — `import.meta.main` reached by pointing `Bun.main`
 * at the script — so the writes the guard makes to each stream and the readers
 * the evaluated module exports are read exactly where the guard makes them,
 * including the branches a clean spawned run does not reach.
 */

import { describe, expect, it, spyOn } from 'bun:test'
import type { SpawnOptions } from 'bun'
import type {
  behindInstallable,
  outdatedReport,
  parseOutdated,
  rowOf,
  tablePrinted,
} from '../scripts/check-outdated.ts'
import { declaredPins } from '../scripts/pins.ts'
import { LISTING_COMMAND, ROOT } from '../scripts/source-tree.ts'

/** The program the merge chain runs, by absolute path. */
const GATE = new URL('../scripts/check-outdated.ts', import.meta.url).pathname

/**
 * A table with one package at the newest and two behind.
 *
 * The `Update` column is what the declared range admits, so for an exactly
 * pinned dependency it equals `Current` even when a newer version exists —
 * which is why knip reads 6.33.0 there while 6.34.0 is published.
 */
const TABLE = `bun outdated v1.4.0 (34cbb9a40)
|----------------------------------------------------|
| Package           | Current | Update   | Latest    |
|-------------------|---------|----------|-----------|
| @types/node (dev) | 26.4.0  | 26.4.0   | 26.4.0    |
|-------------------|---------|----------|-----------|
| knip (dev)        | 6.33.0  | 6.33.0   | 6.34.0    |
|-------------------|---------|----------|-----------|
| oxlint (dev)      | 1.80.0  | 1.80.0   | 1.81.0    |
|----------------------------------------------------|
`

/**
 * A package on a prerelease channel above the version its `latest` tag names:
 * 0.1.2-rc.1 is newer than the tag's 0.0.1-rc.1. A string comparison would
 * order it behind and redden the gate for running the newest release.
 */
const AHEAD_OF_TAG = `bun outdated v1.4.0
|-------------------------------------------------------------------|
| Package                     | Current     | Update     | Latest     |
|-----------------------------|-------------|------------|------------|
| @deepseek-ai/dsh-client-web | 0.1.2-rc.1  | 0.1.2-rc.1 | 0.0.1-rc.1 |
|-------------------------------------------------------------------|`

/** A package whose channel has moved on: a prerelease behind a newer one. */
const BEHIND_CHANNEL = `bun outdated v1.4.0
|-------------------------------------------------------------------|
| Package                     | Current       | Update     | Latest     |
|-----------------------------|---------------|------------|------------|
| @deepseek-ai/dsh-client-web | 0.1.2-alpha.3 | 0.1.2-rc.1 | 0.1.2-rc.1 |
|-------------------------------------------------------------------|`

/** A row carrying a version this gate cannot read, which may not pass silently. */
const UNREADABLE = `bun outdated v1.4.0
|-------------------------------------------------------|
| Package  | Current      | Update | Latest              |
|----------|--------------|--------|---------------------|
| future   | not-a-semver | 1.0.0  | 1.0.0               |
|-------------------------------------------------------|`

/** Every dependency at the newest installable version, so the gate is silent. */
const ALL_CURRENT = `|----------|
| Package  | Current | Update  | Latest   |
|----------|---------|---------|----------|
| knip     | 6.34.0  | 6.34.0  | 6.34.0   |
|----------|`

/** A header the gate can read above a row too short to carry the columns it reads. */
const SHORT_ROW = `| Package | Current | Update | Latest |
| knip    | 6.33.0  |
`

/** A row whose newest column bun left empty, which the comparison passes over. */
const BLANK_LATEST = `| Package | Current | Update | Latest |
| knip    | 6.34.0  | 6.34.0 |        |
`

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
    readonly rowOf: typeof rowOf
    readonly parseOutdated: typeof parseOutdated
    readonly behindInstallable: typeof behindInstallable
    readonly tablePrinted: typeof tablePrinted
    readonly outdatedReport: typeof outdatedReport
  }
}

/**
 * Run the gate's program half in this process.
 *
 * `import.meta.main` follows the entrypoint a module is loaded under, so the
 * guard is reached by pointing `Bun.main` at the script and importing it again
 * under a query no other import has used: the module evaluates fresh, its guard
 * sees a program, and the bun it asks is answered by the shell script given
 * here rather than by a registry. Bun is substituted, and only bun: the listing
 * the pins are read through runs the command `LISTING_COMMAND` names, so the
 * pins come from the manifests the workspaces ship. The type of `Bun.main`
 * names the property read-only, so the pointer is set the way the runtime sets
 * any property, and it is put back with the rest before the case asserts. The
 * streams are held by spies so the report is read exactly where the guard
 * writes it.
 * @param query - the query that keeps this evaluation out of the module cache.
 * @param script - what the substituted bun runs, in place of a real one.
 * @returns what the guard wrote, what it left the process under, and the
 * readers of the module instance that evaluated.
 */
async function runGuard(query: string, script: string): Promise<GuardRun> {
  const entryMain = Bun.main
  const entryExit = process.exitCode
  const spawnSync = Bun.spawnSync
  const out = spyOn(process.stdout, 'write').mockImplementation(() => true)
  const err = spyOn(process.stderr, 'write').mockImplementation(() => true)
  const spawn = spyOn(Bun, 'spawnSync').mockImplementation(
    (asked: string[] | (SpawnOptions.SpawnSyncOptions<'ignore', 'pipe', 'pipe'> & { cmd: string[] })) =>
      Array.isArray(asked) && asked[0] === 'bun'
        ? spawnSync(['/bin/sh', '-c', script], {
            stdout: 'pipe',
            stderr: 'pipe',
          })
        : spawnSync([...LISTING_COMMAND], {
            cwd: ROOT,
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
    loaded: typeof mod.outdatedReport === 'function',
    reader: {
      rowOf: mod.rowOf,
      parseOutdated: mod.parseOutdated,
      behindInstallable: mod.behindInstallable,
      tablePrinted: mod.tablePrinted,
      outdatedReport: mod.outdatedReport,
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
  it('says what its bun said, and fails, when its bun itself fails', async () => {
    const run = await runGuard('guard-failed=1', "cat <<'REPORT' >&2\nerror: no lockfile\nREPORT\nexit 1")
    expect(run.loaded).toBe(true)
    expect(run.out).toEqual([])
    expect(run.err).toEqual(['check-outdated: bun outdated exited 1\nerror: no lockfile\n'])
    expect(run.exit).toBe(1)
  })

  it('reads what its bun printed, counts the declared pins, and exits nought', async () => {
    // The pins are read where the guard reads them, from the manifests the
    // workspaces ship, so the count in the answer is the count the gate saw.
    const pins = declaredPins()
    const run = await runGuard('guard-current=1', "cat <<'REPORT'\nbun outdated v1.4.2 (744846f84)\nREPORT\nexit 0")
    expect(run.loaded).toBe(true)
    expect(run.out).toEqual([
      `every dependency is at the newest version this workspace can install (${String(pins.size)} declared pins current; bun listed 0 outdated)\n`,
    ])
    expect(run.err).toEqual([''])
    expect(run.exit).toBe(0)
  })
})

describe('the readers the evaluated instance exports', () => {
  it('answers every branch the clean run does not reach, from the module the guard ran', async () => {
    // The readers are driven through the instance the guard evaluated, so the
    // branches a clean run does not reach are answered by the same module the
    // merge chain would load.
    const pins = declaredPins()
    const { reader } = await runGuard('guard-readers=1', 'exit 0')
    expect(reader.parseOutdated(TABLE).map((row) => row.name)).toEqual(['@types/node', 'knip', 'oxlint'])
    expect(reader.parseOutdated(SHORT_ROW)).toEqual([])
    expect(reader.behindInstallable(reader.parseOutdated(TABLE))).toEqual([
      'knip is at 6.33.0 and 6.34.0 is installable now',
      'oxlint is at 1.80.0 and 1.81.0 is installable now',
    ])
    expect(reader.behindInstallable(reader.parseOutdated(ALL_CURRENT))).toEqual([])
    expect(reader.behindInstallable(reader.parseOutdated(UNREADABLE))).toEqual([
      'future reports versions this gate cannot read: not-a-semver vs 1.0.0',
    ])
    expect(reader.behindInstallable(reader.parseOutdated(BLANK_LATEST))).toEqual([])
    expect(reader.behindInstallable(reader.parseOutdated(AHEAD_OF_TAG))).toEqual([])
    expect(reader.behindInstallable(reader.parseOutdated(BEHIND_CHANNEL))).toEqual([
      '@deepseek-ai/dsh-client-web is at 0.1.2-alpha.3 and 0.1.2-rc.1 is installable now',
    ])
    expect(reader.tablePrinted(TABLE)).toBe(true)
    expect(reader.tablePrinted('bun outdated v1.4.2\n')).toBe(false)
    expect(reader.outdatedReport('', new Map())).toEqual({
      out: '',
      err: 'check-outdated: no dependencies are declared in any workspace manifest\n',
      code: 1,
    })
    expect(reader.outdatedReport(SHORT_ROW, pins)).toEqual({
      out: '',
      err: 'check-outdated: bun printed a table this gate could not read\n',
      code: 1,
    })
    expect(reader.outdatedReport(TABLE, pins)).toEqual({
      out: '',
      err:
        'check-outdated: dependencies behind an installable version:\n' +
        '  knip is at 6.33.0 and 6.34.0 is installable now\n' +
        '  oxlint is at 1.80.0 and 1.81.0 is installable now\n',
      code: 1,
    })
  })
})
