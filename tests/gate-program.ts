/**
 * The scaffolding the gate-program suites share: a tree made for one run that
 * cleans up after its file, a program driven as a process with its two streams
 * and its status read back, and the two assertions every entry gate's own cases
 * are decided by.
 *
 * Seven suites drive a program where it stands — `import.meta.main` reached in
 * a spawned process — and they need the same pieces to do it. Those pieces live
 * here once, so each suite reads as what differs about its own gate rather than
 * as another copy of the plumbing.
 *
 * The child's environment is written out rather than inherited where a gate is
 * run against a substituted executable: the gate needs that executable first on
 * its path, the system directories beside it, and a home inside the tree it
 * runs in — and nothing else, so a run cannot depend on whatever the suite's own
 * shell happened to carry.
 *
 * @module
 */

import { expect, it } from 'bun:test'
import { clearTreesAfterEach, type FixtureTree, fixtureTree } from './fixtures.ts'

/** Trees the gate-program suites seated, taken down when each file ends. */
const made: FixtureTree[] = []

clearTreesAfterEach(made)

/**
 * Seat a directory for one run, which the importing suite removes when it ends.
 * @param prefix - the name the tree is filed under, naming the suite that made it.
 * @returns the tree, whose root a program can be run in.
 */
export async function suiteTree(prefix: string): Promise<FixtureTree> {
  const tree = fixtureTree(prefix)
  made.push(tree)
  await tree.seat()
  return tree
}

/**
 * Seat a directory for one run, and answer with its path alone. Read by the
 * import probe below, which hands a program a working directory of its own.
 * @param prefix - the name the tree is filed under, naming the suite that made it.
 * @returns the root's path.
 */
async function suiteRoot(prefix: string): Promise<string> {
  return (await suiteTree(prefix)).root
}

/** What one run of a program told the two streams and the shell. */
export interface GateRun {
  /** Everything the program wrote to its output stream. */
  readonly out: string
  /** Everything the program wrote to its error stream. */
  readonly err: string
  /** What the program exited with. */
  readonly code: number
}

/**
 * Assert a run answered with nothing to complain about.
 *
 * Read together, and read in one place: a program that exited zero having
 * written a complaint is not a clean run, and a program that failed quietly is
 * not one either. Every suite here that reads a clean run says it this way.
 * @param run - what the program printed and exited with.
 */
export function cleanRun(run: GateRun): void {
  expect([run.code, run.err]).toEqual([0, ''])
}

/**
 * Run a program as a process, and read back both of its streams and its status.
 *
 * The two streams are drained together rather than one after the other: a
 * program that fills the stream nobody is reading yet blocks on the write, and
 * a reader waiting for it to exit blocks with it.
 * @param program - the program, by absolute path.
 * @param args - the arguments a reader would type after the program's name.
 * @param cwd - the directory the program runs in, which is never the repository
 *   for a suite that drives a gate.
 * @param env - the whole environment to give the child; the suite's own when
 *   omitted.
 * @returns what the program wrote and exited with.
 */
export async function runProgram(
  program: string,
  args: readonly string[],
  cwd: string,
  env?: Readonly<Record<string, string>>,
): Promise<GateRun> {
  const run = Bun.spawn([process.execPath, program, ...args], {
    cwd,
    ...(env === undefined ? {} : { env }),
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [out, err, code] = await Promise.all([
    new Response(run.stdout).text(),
    new Response(run.stderr).text(),
    run.exited,
  ])
  return { out, err, code }
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
  return await runProgram(gate, [], root, { PATH: `${pathPrepend}:/usr/bin:/bin`, HOME: root })
}

/**
 * Assert a gate program does nothing at all when it is imported rather than
 * run: the import answers, and the module wrote nothing on the way in.
 *
 * Six suites register this as a case of their own, titled for the program each
 * one is about, because what the case proves is about that program and belongs
 * in the file that drives it. The coverage gate's suite registers the shared
 * case below instead, and `mutate-restore.spec.ts` drives a probe of its own —
 * it has a tree to read back afterwards, not only two streams. The assertion
 * itself is stated once here, so the seven suites that reach it cannot drift
 * into seven slightly different questions.
 * @param gate - the gate program, by absolute path.
 * @param prefix - the made-directory name prefix, naming the suite that made it.
 */
export async function importRunsNothing(gate: string, prefix: string): Promise<void> {
  const root = await suiteRoot(prefix)
  const source = `await import(${JSON.stringify(gate)})\nprocess.stdout.write('imported')\n`
  const run = Bun.spawn([process.execPath, '-e', source], { cwd: root, stdout: 'pipe', stderr: 'pipe' })
  expect([await run.exited, await new Response(run.stdout).text()]).toEqual([0, 'imported'])
}

/**
 * Register the same assertion as a case of whichever suite calls this.
 * @param gate - the gate program, by absolute path.
 * @param prefix - the made-directory name prefix, naming the suite that made it.
 */
export function importRunsNothingCase(gate: string, prefix: string): void {
  it('runs nothing when it is imported rather than run', async () => {
    await importRunsNothing(gate, prefix)
  })
}
