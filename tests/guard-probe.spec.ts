/**
 * The exit code an in-process gate driver leaves behind.
 *
 * Driving a gate where it stands — `Bun.main` pointed at the script — makes the
 * gate write the process exit code, and a refusal path writes a one. A driver
 * that does not put the code back leaves every later run in the same process
 * reporting a failure nothing in the suite earned, which is how a green chain
 * reads as red. `cargo-gate.spec.ts` and `outdated-guard-process.spec.ts` both
 * drive gates this way; this holds the restoration itself, so the next driver
 * inherits the contract rather than rediscovering the defect.
 */

import { expect, spyOn, test } from 'bun:test'
import type { SpawnOptions } from 'bun'
import { LISTING_COMMAND, ROOT } from '../scripts/source-tree.ts'

const GATE = new URL('../scripts/check-outdated.ts', import.meta.url).pathname

test('driving a gate in this process leaves the exit code as it found it', async () => {
  const entryMain = Bun.main
  const entryExit = process.exitCode
  const spawnSync = Bun.spawnSync
  const out = spyOn(process.stdout, 'write').mockImplementation(() => true)
  const err = spyOn(process.stderr, 'write').mockImplementation(() => true)
  const spawn = spyOn(Bun, 'spawnSync').mockImplementation(
    (asked: string[] | (SpawnOptions.SpawnSyncOptions<'ignore', 'pipe', 'pipe'> & { cmd: string[] })) =>
      Array.isArray(asked) && asked[0] === 'bun'
        ? spawnSync(['/bin/sh', '-c', "cat <<'REPORT' >&2\nerror: no lockfile\nREPORT\nexit 1"], {
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
  await import(`${GATE}?exit-contract=1`)
  const duringImport = process.exitCode
  spawn.mockRestore()
  err.mockRestore()
  out.mockRestore()
  Reflect.set(Bun, 'main', entryMain)
  process.exitCode = entryExit ?? 0
  expect(duringImport).toBe(1)
  expect(process.exitCode).toBe(0)
})
