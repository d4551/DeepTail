/**
 * Put the tree back after a mutation run, however that run ended.
 *
 * The runs mutate in place, and only a file that still carries the
 * instrumenter's marker is restored, so a stale backup can never overwrite
 * work done since.
 *
 * The `mutate` scripts run this on exit, whether the run finished, failed or
 * was interrupted.
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
  const entries = await readdir(join(root, at), { withFileTypes: true }).then(
    (found) => found,
    () => [],
  )
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
 * @param root - the tree to restore, which a suite points at its own.
 * @returns the paths restored.
 */
export async function restoreInstrumented(root = '.'): Promise<string[]> {
  const backups = (
    await readdir(backupRoot(root), { withFileTypes: true }).then(
      (found) => found,
      () => [],
    )
  )
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
      stale: (
        await readFile(file.target, 'utf8').then(
          (text) => text,
          () => '',
        )
      ).includes(MARKER),
    })),
  )
  const wanted = instrumented.filter((file) => file.stale)
  await Promise.all(wanted.map(async (file) => await mkdir(dirname(file.target), { recursive: true })))
  await Promise.all(wanted.map(async (file) => await copyFile(join(file.backup, file.path), file.target)))
  return wanted.map((file) => relative(root, file.target))
}

// Guarded, as every runnable script here is: importing a module must run nothing.
if (import.meta.main) {
  const restored = await restoreInstrumented()
  if (restored.length > 0) process.stderr.write(`mutate: restored ${String(restored.length)} instrumented file(s)\n`)
}
