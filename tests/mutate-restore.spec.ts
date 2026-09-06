/**
 * The guard that puts the tree back after a mutation run.
 *
 * The runs mutate in place, so an interrupted one leaves every file it touched
 * rewritten with the instrumenter's switch wrapped around every expression —
 * which happened here, to all of `scripts/`. The guard is what makes that
 * recoverable, and a guard that has only ever been watched work is a claim.
 */

import { afterEach, expect, it } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { restoreInstrumented } from '../scripts/mutate-restore.ts'

/** The switch the instrumenter wraps around every mutated expression. */
const MARKER = ['stry', 'MutAct_'].join('')

/** Trees this suite made, removed when it ends. */
const made: string[] = []

afterEach(async () => {
  await Promise.all(made.splice(0).map(async (root) => await rm(root, { recursive: true, force: true })))
})

/**
 * A tree holding one backup and one working copy of a file.
 * @param original - what the backup holds.
 * @param working - what the working copy holds now.
 * @returns the tree's root and the working file's path.
 */
async function interruptedRun(original: string, working: string): Promise<{ root: string; file: string }> {
  const root = await mkdtemp(join(tmpdir(), 'mutate-restore-'))
  made.push(root)
  await mkdir(join(root, '.stryker-tmp', 'backup-abc123', 'src'), { recursive: true })
  await mkdir(join(root, 'src'), { recursive: true })
  await writeFile(join(root, '.stryker-tmp', 'backup-abc123', 'src', 'thing.ts'), original)
  await writeFile(join(root, 'src', 'thing.ts'), working)
  return { root, file: join(root, 'src', 'thing.ts') }
}

it('puts back a file the run left instrumented', async () => {
  const { root, file } = await interruptedRun('export const x = 1\n', `export const x = ${MARKER}("1") ? 2 : 1\n`)
  expect(await restoreInstrumented(root)).toEqual([join('src', 'thing.ts')])
  expect(await readFile(file, 'utf8')).toBe('export const x = 1\n')
})

it('leaves a file that carries no instrumentation, so a stale backup reverts nothing', async () => {
  // The backup outlives the run that made it, and the source moves on. A guard
  // that restored everything it found would undo whatever was written since.
  const { root, file } = await interruptedRun('export const x = 1\n', 'export const x = 3\n')
  expect(await restoreInstrumented(root)).toEqual([])
  expect(await readFile(file, 'utf8')).toBe('export const x = 3\n')
})

it('does nothing at all where no run has left a backup', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mutate-restore-'))
  made.push(root)
  expect(await restoreInstrumented(root)).toEqual([])
})
