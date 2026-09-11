/**
 * The scaffolding the gate-program suites share: a tree made for one run that
 * cleans up after its file, a gate run as a process with a substituted
 * executable first on its path, and the import-runs-nothing case every entry
 * gate owes.
 *
 * `cargo-gate-program.spec.ts` and `outdated-gate-program.spec.ts` both drive
 * their gate where it stands — `import.meta.main` reached in a spawned process
 * — and both need the same three pieces to do it. They live here once so the
 * two suites read as what differs (which executable is substituted, which
 * report it prints) rather than as two copies of the plumbing.
 *
 * The child's environment is written out rather than inherited: the gate needs
 * the substituted executable first on its path, the system directories beside
 * it, and a home inside the tree it runs in — and nothing else, so a run
 * cannot depend on whatever the suite's own shell happened to carry.
 *
 * @module
 */

import { afterEach, expect } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** Directories the gate-program suites made, removed when each file ends. */
const made: string[] = []

afterEach(async () => {
  await Promise.all(made.splice(0).map(async (root) => await rm(root, { recursive: true, force: true })))
})

/**
 * Make a directory for one run, which the importing suite removes when it ends.
 * @param prefix - the made-directory name prefix, naming the suite that made it.
 * @returns the root's path.
 */
export async function suiteRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix))
  made.push(root)
  return root
}

/** What one run of a gate program told the two streams and the shell. */
export interface GateRun {
  /** Everything the gate wrote to its output stream. */
  readonly out: string
  /** Everything the gate wrote to its error stream. */
  readonly err: string
  /** What the gate exited with. */
  readonly code: number
}

/**
 * Run one gate program as a process, with one directory prepended to the path
 * so the substituted executable is the one the gate finds first.
 * @param gate - the gate program, by absolute path.
 * @param root - the directory the gate runs in, and the home it is given.
 * @param pathPrepend - the directory put first on the child's path.
 * @returns what the gate printed and exited with.
 */
export async function runGateProgram(gate: string, root: string, pathPrepend: string): Promise<GateRun> {
  const run = Bun.spawn([process.execPath, gate], {
    cwd: root,
    env: { PATH: `${pathPrepend}:/usr/bin:/bin`, HOME: root },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const out = await new Response(run.stdout).text()
  const err = await new Response(run.stderr).text()
  return { out, err, code: await run.exited }
}

/**
 * Assert a gate program does nothing at all when it is imported rather than
 * run: the import answers, and the module wrote nothing on the way in.
 * @param gate - the gate program, by absolute path.
 * @param prefix - the made-directory name prefix, naming the suite that made it.
 */
export async function importRunsNothing(gate: string, prefix: string): Promise<void> {
  const root = await suiteRoot(prefix)
  const source = `await import(${JSON.stringify(gate)})\nprocess.stdout.write('imported')\n`
  const run = Bun.spawn([process.execPath, '-e', source], { cwd: root, stdout: 'pipe', stderr: 'pipe' })
  expect([await run.exited, await new Response(run.stdout).text()]).toEqual([0, 'imported'])
}
