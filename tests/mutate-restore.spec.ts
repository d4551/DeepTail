/**
 * The guard that puts the tree back after a mutation run.
 *
 * The runs mutate in place, so an interrupted one leaves every file it touched
 * rewritten with the instrumenter's switch wrapped around every expression —
 * which happened here, to all of `scripts/`. The guard is what makes that
 * recoverable, and a guard that has only ever been watched work is a claim.
 *
 * Every case drives the guard as the program the `mutate:*` scripts actually
 * run, in a process whose working directory is a tree this suite made. Driving
 * it in process was a hole with teeth: a mutant that reads the working
 * directory instead of the tree it is handed restored the repository itself,
 * mid-run, from the backup the run had just taken. That put every instrumented
 * file back to its original text, so every mutant scheduled after it was never
 * active and survived — `pipeline-guard-jobs.ts` scored 65.19 alone and 0.00
 * beside this file, and the scope reported 48.57 where it had earned no number.
 * A working directory the repository is not in is what makes that impossible
 * rather than unlikely.
 */

import { expect, it } from 'bun:test'
import { clearTreesAfterEach, type FixtureTree, fixtureTree } from './fixtures.ts'
import { type GateRun, runProgram } from './gate-program.ts'
import { PROGRAMS } from './programs.ts'

/** Where a run keeps the originals of the files it rewrote. */
const ORIGINALS = '.stryker-tmp'

/** The switch the instrumenter wraps around every mutated expression. */
const MARKER = ['stry', 'MutAct_'].join('')

/** A file as a run leaves it, rewritten around that switch. */
const INSTRUMENTED = `export const x = ${MARKER}("1") ? 2 : 1\n`

/** The same file as it was written. */
const ORIGINAL = 'export const x = 1\n'

/** The source a run rewrites, under whichever tree is being restored. */
const THING = 'src/thing.ts'

/** The program the `mutate:*` scripts run on exit. */
const GUARD = PROGRAMS.mutateRestore

/** A tree a run left behind, and the working copy it left in it. */
interface Interrupted {
  /** The tree. */
  readonly tree: FixtureTree
  /** The working copy of the one source the run rewrote. */
  readonly file: string
}

/** Trees this suite seated, taken down when each of its cases ends. */
const made: FixtureTree[] = []

clearTreesAfterEach(made)

/**
 * A directory this suite owns, seated so a program can be run inside it before
 * the case has written anything there.
 * @returns the tree.
 */
async function scratch(): Promise<FixtureTree> {
  const tree = fixtureTree('mutate-restore')
  made.push(tree)
  await tree.seat()
  return tree
}

/**
 * A tree as an interrupted run leaves it: the original under the run's backup
 * directory, and the working copy as the run left it.
 * @param working - what the working copy holds now.
 * @param original - what the run's backup of it holds.
 * @returns the tree, and the working file's path.
 */
async function interrupted(working = INSTRUMENTED, original = ORIGINAL): Promise<Interrupted> {
  const tree = await scratch()
  await Bun.write(tree.pathOf(`${ORIGINALS}/backup-abc123/${THING}`), original)
  const file = tree.pathOf(THING)
  await Bun.write(file, working)
  return { tree, file }
}

/**
 * Assert the working copy is back to the text the run found there, which is the
 * whole of what the guard is for.
 * @param held - the tree a case drove the guard against.
 */
async function putBack(held: Interrupted): Promise<void> {
  expect(await Bun.file(held.file).text()).toBe(ORIGINAL)
}

/**
 * Run the guard, and read back everything it said.
 * @param cwd - the working directory the program runs in, never the repository.
 * @param root - the tree to name on the command line; omitted to drive the
 *   default, which is the working directory.
 * @returns its status and both of its streams.
 */
async function guard(cwd: string, root?: string): Promise<GateRun> {
  return await runProgram(GUARD, root === undefined ? [] : [root], cwd)
}

/** What the program says when it restored nothing. */
const SILENT: GateRun = { code: 0, out: '', err: '' }

/** What the program says when it restored the one instrumented file. */
const RESTORED_THING: GateRun = {
  code: 0,
  out: `${THING}\n`,
  err: 'mutate: restored 1 instrumented file(s)\n',
}

it('puts back a file the run left instrumented, and says so on both streams', async () => {
  const held = await interrupted()
  expect(await guard(held.tree.root)).toEqual(RESTORED_THING)
  await putBack(held)
})

it('names every file it put back, one to a line, with nothing between them', async () => {
  // One path per line is what makes the report readable rather than counted.
  // Anything written between two of them is a path a reader cannot open.
  const two = await interrupted()
  await Bun.write(two.tree.pathOf(`${ORIGINALS}/backup-abc123/src/other.ts`), ORIGINAL)
  await Bun.write(two.tree.pathOf('src/other.ts'), INSTRUMENTED)
  const said = await guard(two.tree.root)
  expect(said.out.split('\n').toSorted()).toEqual(['', 'src/other.ts', THING])
  expect([said.code, said.err]).toEqual([0, 'mutate: restored 2 instrumented file(s)\n'])
})

it('leaves a file that carries no instrumentation, so a stale backup reverts nothing', async () => {
  // The backup outlives the run that made it, and the source moves on. A guard
  // that restored everything it found would undo whatever was written since.
  const untouched = 'export const x = 3\n'
  const run = await interrupted(untouched)
  expect(await guard(run.tree.root)).toEqual(SILENT)
  expect(await Bun.file(run.file).text()).toBe(untouched)
})

it('reads the whole switch, not either half of it', async () => {
  // Both halves are written in ordinary sources: this repository's own scripts
  // name the backup directory and the identifier the instrumenter numbers. A
  // guard matching a half would revert a file that merely describes a run.
  const halves = ["export const at = '.stryker-tmp'\n", "export const at = 'MutAct_9fa48'\n"]
  const trees = await Promise.all(halves.map(async (half) => await interrupted(half)))
  const said = await Promise.all(trees.map(async (one) => await guard(one.tree.root)))
  const kept = await Promise.all(trees.map(async (one) => await Bun.file(one.file).text()))
  expect([said, kept]).toEqual([[SILENT, SILENT], halves])
})

it('does nothing at all where no run has left a backup', async () => {
  const seated = await scratch()
  expect(await guard(seated.root)).toEqual(SILENT)
})

it('reads the backups a run took, and nothing else kept beside them', async () => {
  // A run keeps more under that directory than the originals: its own sandbox
  // copies, and whatever a reporter wrote. Restoring from one of those would
  // put a file back to a state no one asked for, and a stray file there is not
  // a directory a walk can even open.
  const restored = await interrupted()
  await Bun.write(restored.tree.pathOf(`${ORIGINALS}/sandbox-xyz789/${THING}`), 'export const x = 99\n')
  await Bun.write(restored.tree.pathOf(`${ORIGINALS}/reporter.json`), '{}\n')
  expect(await guard(restored.tree.root)).toEqual(RESTORED_THING)
  await putBack(restored)
})

it('passes over a backup of a file the working tree no longer holds', async () => {
  // A backup names what the run rewrote, not what the tree holds now. A file
  // deleted since is not a file to write back into existence.
  const deleted = 'src/gone.ts'
  const tree = await scratch()
  await Bun.write(tree.pathOf(`${ORIGINALS}/backup-abc123/${deleted}`), ORIGINAL)
  expect(await guard(tree.root)).toEqual(SILENT)
  expect(await Bun.file(tree.pathOf(deleted)).exists()).toBe(false)
})

it('restores the tree it is named, not the one it happens to be run in', async () => {
  // The two are the same directory in every other case here, so nothing else
  // says which one is read. Run from a directory holding no backup at all, a
  // guard that reads its surroundings instead of its argument restores
  // nothing — and, in a mutation run, would reach the repository instead.
  const named = await interrupted()
  const elsewhere = await scratch()
  const said = await guard(elsewhere.root, named.tree.root)
  expect([said.code, said.out]).toEqual([0, `${THING}\n`])
  await putBack(named)
})

it('does nothing when the module is imported rather than run', async () => {
  // The line that cost a whole mutation scope its number. Imported from a tree
  // a run has just instrumented, a module that restores on import undoes the
  // run, and every mutant scheduled after it survives by never being active.
  // The probe is seated in that same tree rather than in one of its own: an
  // import that restored somewhere else entirely would leave this copy
  // instrumented and answer green.
  const instrumented = await interrupted()
  const probe = instrumented.tree.pathOf('.import-probe.ts')
  await Bun.write(probe, `await import(${JSON.stringify(GUARD)})`)
  expect(await runProgram(probe, [], instrumented.tree.root)).toEqual(SILENT)
  expect(await Bun.file(instrumented.file).text()).toBe(INSTRUMENTED)
})
