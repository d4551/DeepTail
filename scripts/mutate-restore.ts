/**
 * Put the tree back after a mutation run, however that run ended.
 *
 * The runs mutate in place — the gates read the repository through
 * `git ls-files`, and a sandbox copy is not a repository — so an interrupted
 * run leaves every file it touched rewritten with the instrumenter's switch
 * wrapped around every expression. That tree still type-checks and still passes
 * its suites, so nothing says so; it happened here, to all of `scripts/`.
 *
 * The `mutate` scripts run this on exit, whether the run finished, failed or
 * was interrupted. Only a file that still carries the instrumenter's marker is
 * restored, so a stale backup can never overwrite work done since, and running
 * this on a tree that is already whole does nothing at all.
 *
 * @module
 */

import { copyFile, mkdir, readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'

/** Where Stryker keeps the originals of the files it rewrote. */
const TEMP = '.stryker-tmp'

/** Where a run keeps its backups, under the tree being restored. */
function backupRoot(root: string): string {
  return join(root, TEMP)
}

/** The switch the instrumenter wraps around every mutated expression. */
const MARKER = ['stry', 'MutAct_'].join('')

/**
 * Every file under a directory, as paths relative to it.
 * @param root - the directory to walk.
 * @param at - the directory being walked, relative to the root.
 * @returns the relative paths, in no particular order.
 */
async function filesUnder(root: string, at = ''): Promise<string[]> {
  const entries = await readdir(join(root, at), { withFileTypes: true }).catch(() => [])
  const nested = await Promise.all(
    entries.map(async (entry) =>
      entry.isDirectory() ? await filesUnder(root, join(at, entry.name)) : [join(at, entry.name)],
    ),
  )
  return nested.flat()
}

/**
 * Put back every file a run left instrumented.
 *
 * A file is restored only when it still carries the marker, so this is a no-op
 * after a run that finished and cannot revert an edit made since.
 * @param root - the tree to restore, which a suite points at its own.
 * @returns the paths restored.
 */
export async function restoreInstrumented(root = '.'): Promise<string[]> {
  const backups = (await readdir(backupRoot(root), { withFileTypes: true }).catch(() => []))
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('backup-'))
    .map((entry) => join(backupRoot(root), entry.name))
  const held = await Promise.all(
    backups.map(async (backup) =>
      (await filesUnder(backup)).map((path) => ({ backup, path, target: join(root, relative('.', path)) })),
    ),
  )
  const instrumented = await Promise.all(
    held.flat().map(async (file) => ({
      ...file,
      stale: (await readFile(file.target, 'utf8').catch(() => '')).includes(MARKER),
    })),
  )
  const wanted = instrumented.filter((file) => file.stale)
  await Promise.all(wanted.map(async (file) => await mkdir(dirname(file.target), { recursive: true })))
  await Promise.all(wanted.map(async (file) => await copyFile(join(file.backup, file.path), file.target)))
  return wanted.map((file) => relative(root, file.target))
}

const restored = await restoreInstrumented()
if (restored.length > 0) process.stderr.write(`mutate: restored ${String(restored.length)} instrumented file(s)\n`)
