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

import { copyFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

/** Where Stryker keeps the originals of the files it rewrote. */
const TEMP = '.stryker-tmp'

/** What a run names the directory holding one set of originals. */
const BACKUP = 'backup-'

/** The switch the instrumenter wraps around every mutated expression. */
const MARKER = ['stry', 'MutAct_'].join('')

/**
 * Where a run keeps its backups, under the tree being restored.
 * @param root - the tree being restored.
 * @returns the directory the backups sit in.
 */
function backupRoot(root: string): string {
  return join(root, TEMP)
}

/**
 * Every file under a directory, as paths relative to it.
 * @param root - the directory to walk.
 * @param at - the directory being walked, relative to the root.
 * @returns the relative paths, in no particular order.
 */
async function filesUnder(root: string, at = ''): Promise<string[]> {
  const entries = await readdir(join(root, at), { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) =>
      entry.isDirectory() ? await filesUnder(root, join(at, entry.name)) : [join(at, entry.name)],
    ),
  )
  return nested.flat()
}

/**
 * Whether the file at a path is one a run left rewritten.
 * @param path - the file to read.
 * @returns true when it is on disk and carries the instrumenter's switch.
 */
async function carriesMarker(path: string): Promise<boolean> {
  const held = Bun.file(path)
  return (await held.exists()) && (await held.text()).includes(MARKER)
}

/**
 * Put back every file a run left instrumented.
 *
 * @param root - the tree to restore, which a suite points at its own.
 * @returns the paths restored, relative to that tree.
 */
export async function restoreInstrumented(root: string): Promise<string[]> {
  const kept = await readdir(backupRoot(root), { withFileTypes: true }).then(
    (found) => found,
    () => [],
  )
  const backups = kept
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(BACKUP))
    .map((entry) => join(backupRoot(root), entry.name))
  const held = await Promise.all(
    backups.map(async (backup) =>
      (await filesUnder(backup)).map((path) => ({ backup, path, target: join(root, path) })),
    ),
  )
  const instrumented = await Promise.all(
    held.flat().map(async (file) => ({ ...file, stale: await carriesMarker(file.target) })),
  )
  const wanted = instrumented.filter((file) => file.stale)
  await Promise.all(wanted.map(async (file) => await copyFile(join(file.backup, file.path), file.target)))
  return wanted.map((file) => file.path)
}

// Guarded, as every runnable script here is: importing a module must run nothing.
if (import.meta.main) {
  // The working directory unless a tree is named, so the suite can drive this
  // program against a tree of its own — in a process whose working directory is
  // that tree — and the repository is never in reach of what it restores.
  // Driving it in process was: a mutant that reads the working directory
  // instead of the tree it was given restored the repository mid-run, which put
  // every file back to its uninstrumented text, and every mutant tested after
  // that survived by never having been active. Three files reported a score of
  // zero that way, and the run reported 48.57 where it had earned no number.
  const restored = await restoreInstrumented(process.argv[2] ?? process.cwd())
  // One path per line, so what was restored is readable rather than counted.
  process.stdout.write(restored.map((path) => `${path}\n`).join(''))
  if (restored.length > 0) process.stderr.write(`mutate: restored ${String(restored.length)} instrumented file(s)\n`)
}
