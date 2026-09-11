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

/** Where a run keeps the originals of the files it rewrote. */
const ORIGINALS = '.stryker-tmp'

/** The switch the instrumenter wraps around every mutated expression. */
const MARKER = ['stry', 'MutAct_'].join('')

/** A file as a run leaves it, rewritten around that switch. */
const INSTRUMENTED = `export const x = ${MARKER}("1") ? 2 : 1\n`

/** The same file as it was written. */
const ORIGINAL = 'export const x = 1\n'

/** The program the `mutate:*` scripts run on exit, by absolute path. */
const GUARD = new URL('../scripts/mutate-restore.ts', import.meta.url).pathname

/** What a finished run of the program said. */
interface Said {
  readonly code: number
  readonly out: string
  readonly err: string
}

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
 * Write one file, making the directories above it.
 * @param path - where to write.
 * @param text - what to write.
 */
async function write(path: string, text: string): Promise<void> {
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, text)
}

/**
 * A tree holding one backup and one working copy of a file.
 * @param original - what the backup holds.
 * @param working - what the working copy holds now.
 * @returns the tree's root and the working file's path.
 */
async function interruptedRun(original: string, working: string): Promise<{ root: string; file: string }> {
  const root = await scratch()
  await write(join(root, ORIGINALS, 'backup-abc123', 'src', 'thing.ts'), original)
  await write(join(root, 'src', 'thing.ts'), working)
  return { root, file: join(root, 'src', 'thing.ts') }
}

/**
 * Run the guard, and read back everything it said.
 * @param cwd - the working directory the program runs in, never the repository.
 * @param root - the tree to name on the command line; omitted to drive the
 *   default, which is the working directory.
 * @returns its status and both of its streams.
 */
async function guard(cwd: string, root?: string): Promise<Said> {
  const args = root === undefined ? [GUARD] : [GUARD, root]
  const run = Bun.spawn([process.execPath, ...args], { cwd, stdout: 'pipe', stderr: 'pipe' })
  const [out, err, code] = await Promise.all([
    new Response(run.stdout).text(),
    new Response(run.stderr).text(),
    run.exited,
  ])
  return { code, out, err }
}

/** What the program says when it restored nothing. */
const SILENT: Said = { code: 0, out: '', err: '' }

it('puts back a file the run left instrumented, and says so on both streams', async () => {
  const { root, file } = await interruptedRun(ORIGINAL, INSTRUMENTED)
  expect(await guard(root)).toEqual({
    code: 0,
    out: `${join('src', 'thing.ts')}\n`,
    err: 'mutate: restored 1 instrumented file(s)\n',
  })
  expect(await readFile(file, 'utf8')).toBe(ORIGINAL)
})

it('names every file it put back, one to a line, with nothing between them', async () => {
  // One path per line is what makes the report readable rather than counted.
  // Anything written between two of them is a path a reader cannot open.
  const { root } = await interruptedRun(ORIGINAL, INSTRUMENTED)
  await write(join(root, ORIGINALS, 'backup-abc123', 'src', 'other.ts'), ORIGINAL)
  await write(join(root, 'src', 'other.ts'), INSTRUMENTED)
  const said = await guard(root)
  expect(said.out.split('\n').toSorted()).toEqual(['', join('src', 'other.ts'), join('src', 'thing.ts')])
  expect([said.code, said.err]).toEqual([0, 'mutate: restored 2 instrumented file(s)\n'])
})

it('leaves a file that carries no instrumentation, so a stale backup reverts nothing', async () => {
  // The backup outlives the run that made it, and the source moves on. A guard
  // that restored everything it found would undo whatever was written since.
  const { root, file } = await interruptedRun(ORIGINAL, 'export const x = 3\n')
  expect(await guard(root)).toEqual(SILENT)
  expect(await readFile(file, 'utf8')).toBe('export const x = 3\n')
})

it('reads the whole switch, not either half of it', async () => {
  // Both halves are written in ordinary sources: this repository's own scripts
  // name the backup directory and the identifier the instrumenter numbers. A
  // guard matching a half would revert a file that merely describes a run.
  const halves = ["export const at = '.stryker-tmp'\n", "export const at = 'MutAct_9fa48'\n"]
  const trees = await Promise.all(halves.map(async (working) => await interruptedRun(ORIGINAL, working)))
  const said = await Promise.all(trees.map(async (tree) => await guard(tree.root)))
  const held = await Promise.all(trees.map(async (tree) => await readFile(tree.file, 'utf8')))
  expect([said, held]).toEqual([[SILENT, SILENT], halves])
})

it('does nothing at all where no run has left a backup', async () => {
  expect(await guard(await scratch())).toEqual(SILENT)
})

it('reads the backups a run took, and nothing else kept beside them', async () => {
  // A run keeps more under that directory than the originals: its own sandbox
  // copies, and whatever a reporter wrote. Restoring from one of those would
  // put a file back to a state no one asked for, and a stray file there is not
  // a directory a walk can even open.
  const { root, file } = await interruptedRun(ORIGINAL, INSTRUMENTED)
  await write(join(root, ORIGINALS, 'sandbox-xyz789', 'src', 'thing.ts'), 'export const x = 99\n')
  await write(join(root, ORIGINALS, 'reporter.json'), '{}\n')
  expect(await guard(root)).toEqual({
    code: 0,
    out: `${join('src', 'thing.ts')}\n`,
    err: 'mutate: restored 1 instrumented file(s)\n',
  })
  expect(await readFile(file, 'utf8')).toBe(ORIGINAL)
})

it('passes over a backup of a file the working tree no longer holds', async () => {
  // A backup names what the run rewrote, not what the tree holds now. A file
  // deleted since is not a file to write back into existence.
  const root = await scratch()
  await write(join(root, ORIGINALS, 'backup-abc123', 'src', 'gone.ts'), ORIGINAL)
  expect(await guard(root)).toEqual(SILENT)
  expect(await Bun.file(join(root, 'src', 'gone.ts')).exists()).toBe(false)
})

it('restores the tree it is named, not the one it happens to be run in', async () => {
  // The two are the same directory in every other case here, so nothing else
  // says which one is read. Run from a directory holding no backup at all, a
  // guard that reads its surroundings instead of its argument restores
  // nothing — and, in a mutation run, would reach the repository instead.
  const { root, file } = await interruptedRun(ORIGINAL, INSTRUMENTED)
  const said = await guard(await scratch(), root)
  expect([said.code, said.out]).toEqual([0, `${join('src', 'thing.ts')}\n`])
  expect(await readFile(file, 'utf8')).toBe(ORIGINAL)
})

it('does nothing when the module is imported rather than run', async () => {
  // The line that cost a whole mutation scope its number. Imported from a tree
  // a run has just instrumented, a module that restores on import undoes the
  // run, and every mutant scheduled after it survives by never being active.
  const { root, file } = await interruptedRun(ORIGINAL, INSTRUMENTED)
  const source = `await import(${JSON.stringify(GUARD)})`
  const run = Bun.spawn([process.execPath, '-e', source], { cwd: root, stdout: 'pipe', stderr: 'pipe' })
  const [out, err, code] = await Promise.all([
    new Response(run.stdout).text(),
    new Response(run.stderr).text(),
    run.exited,
  ])
  expect({ code, out, err }).toEqual(SILENT)
  expect(await readFile(file, 'utf8')).toBe(INSTRUMENTED)
})
