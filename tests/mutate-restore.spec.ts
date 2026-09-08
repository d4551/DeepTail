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

import { afterEach, expect, it } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** The switch the instrumenter wraps around every mutated expression. */
const MARKER = ['stry', 'MutAct_'].join('')

/** The program the `mutate:*` scripts run on exit, by absolute path. */
const GUARD = new URL('../scripts/mutate-restore.ts', import.meta.url).pathname

/** Trees this suite made, removed when it ends. */
const made: string[] = []

afterEach(async () => {
  await Promise.all(made.splice(0).map(async (root) => await rm(root, { recursive: true, force: true })))
})

/**
 * A directory this suite owns, removed when the case ends.
 * @returns the directory's path.
 */
async function scratch(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'mutate-restore-'))
  made.push(root)
  return root
}

/**
 * A tree holding one backup and one working copy of a file.
 * @param original - what the backup holds.
 * @param working - what the working copy holds now.
 * @returns the tree's root and the working file's path.
 */
async function interruptedRun(original: string, working: string): Promise<{ root: string; file: string }> {
  const root = await scratch()
  await mkdir(join(root, '.stryker-tmp', 'backup-abc123', 'src'), { recursive: true })
  await mkdir(join(root, 'src'), { recursive: true })
  await writeFile(join(root, '.stryker-tmp', 'backup-abc123', 'src', 'thing.ts'), original)
  await writeFile(join(root, 'src', 'thing.ts'), working)
  return { root, file: join(root, 'src', 'thing.ts') }
}

/**
 * Run the guard, and read back the paths it says it restored.
 * @param cwd - the working directory the program runs in, never the repository.
 * @param root - the tree to name on the command line; omitted to drive the
 *   default, which is the working directory.
 * @returns one entry per path the program reported.
 */
async function guard(cwd: string, root?: string): Promise<string[]> {
  const args = root === undefined ? [GUARD] : [GUARD, root]
  const run = Bun.spawn([process.execPath, ...args], { cwd, stdout: 'pipe', stderr: 'pipe' })
  const printed = await new Response(run.stdout).text()
  const complaint = await new Response(run.stderr).text()
  // The exit code and anything written to the error stream are read together,
  // so a program that died having printed nothing cannot read as "restored
  // nothing" — which is what every assertion below would then be agreeing to.
  expect([await run.exited, complaint.includes('error:')]).toEqual([0, false])
  return printed.split('\n').filter((line) => line !== '')
}

it('puts back a file the run left instrumented', async () => {
  const { root, file } = await interruptedRun('export const x = 1\n', `export const x = ${MARKER}("1") ? 2 : 1\n`)
  expect(await guard(root)).toEqual([join('src', 'thing.ts')])
  expect(await readFile(file, 'utf8')).toBe('export const x = 1\n')
})

it('leaves a file that carries no instrumentation, so a stale backup reverts nothing', async () => {
  // The backup outlives the run that made it, and the source moves on. A guard
  // that restored everything it found would undo whatever was written since.
  const { root, file } = await interruptedRun('export const x = 1\n', 'export const x = 3\n')
  expect(await guard(root)).toEqual([])
  expect(await readFile(file, 'utf8')).toBe('export const x = 3\n')
})

it('does nothing at all where no run has left a backup', async () => {
  expect(await guard(await scratch())).toEqual([])
})

it('restores the tree it is named, not the one it happens to be run in', async () => {
  // The two are the same directory in every other case here, so nothing else
  // says which one is read. Run from a directory holding no backup at all, a
  // guard that reads its surroundings instead of its argument restores
  // nothing — and, in a mutation run, would reach the repository instead.
  const { root, file } = await interruptedRun('export const x = 1\n', `export const x = ${MARKER}("1") ? 2 : 1\n`)
  expect(await guard(await scratch(), root)).toEqual([join('src', 'thing.ts')])
  expect(await readFile(file, 'utf8')).toBe('export const x = 1\n')
})
