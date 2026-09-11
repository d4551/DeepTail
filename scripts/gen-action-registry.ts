/**
 * Write the generated faces of the action registry.
 *
 * `bun scripts/gen-action-registry.ts` rewrites them;
 * `bun scripts/gen-action-registry.ts --check` reports a face that has drifted
 * from the registry without touching it, which is what the suite runs. A
 * generated file is only worth trusting when something compares its bytes to
 * what the registry says they must be.
 */

import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { readRegistry } from './action-registry.ts'
import { emitActionTable, emitCapabilities, emitTypeScript } from './action-registry-emit.ts'
import { emitRust } from './action-registry-rust.ts'
import { ROOT } from './source-tree.ts'

/** Where the registry lives, and where each face is written. */
export const SOURCES = {
  registry: 'apps/deeptail/src/actions/actions.bao',
  typescript: 'apps/deeptail/src/actions/registry.ts',
  capabilities: 'apps/deeptail/src/actions/capabilities.ts',
  actionTable: 'apps/deeptail/src/actions/action-table.ts',
  rust: 'apps/deeptail/src-tauri/src/capability/catalog.rs',
} as const

/**
 * Refuse a registry whose entries are not all verified.
 *
 * An entry naming no file is an action that has never been driven: the matrix
 * would claim a control is covered on the strength of a row nobody ran.
 * @param root - the tree the lane is resolved against.
 * @param lane - the repository-relative path the entry names.
 * @param id - the entry that named it.
 */
function requireLane(root: string, lane: string, id: string): void {
  if (!existsSync(`${root}${lane}`))
    throw new Error(`actions.bao: action "${id}" names lane "${lane}", which is not a file`)
}

/** What a face on disk is, against what the registry says it must be. */
type FaceState = 'current' | 'drifted' | 'missing'

/**
 * One face, as it must be.
 *
 * A face that is gone and a face that has been edited are different faults —
 * one is a checkout that never ran the generator, the other is a hand edit to
 * generated source — and a check that reported them alike sent a reader looking
 * for a diff that does not exist.
 * @param root - the tree the face is read from.
 * @param path - repository-relative path it is written to.
 * @param written - the bytes the generator produces.
 * @returns what the file on disk is against those bytes.
 */
async function faceState(root: string, path: string, written: string): Promise<FaceState> {
  const onDisk = await readFile(`${root}${path}`, 'utf8').then(
    (text) => text,
    () => null,
  )
  if (onDisk === null) return 'missing'
  return onDisk === written ? 'current' : 'drifted'
}

/** The flag that points the generator at a tree other than this repository. */
export const ROOT_FLAG = '--root'

/** The flag that compares the faces instead of writing them. */
export const CHECK_FLAG = '--check'

/**
 * Every argument this program does not understand.
 *
 * An argument it ignores is a command that did something other than what was
 * typed: `--chekc` writes the faces where `--check` would have compared them,
 * and the gate that runs this would then rewrite the drift it exists to report.
 * @param argv - the arguments a reader typed.
 * @returns one entry per argument that is not part of this program's grammar.
 */
export function unknownArguments(argv: readonly string[]): string[] {
  const at = argv.indexOf(ROOT_FLAG)
  const value = at === -1 ? -1 : at + 1
  return argv.filter((word, index) => word !== CHECK_FLAG && index !== at && index !== value)
}

/**
 * The tree the generator reads the registry from and writes the faces into.
 *
 * Read off the arguments rather than fixed to this repository, because a
 * generator that can only ever write here is one whose writing half no suite
 * can drive: it would have to be watched working against the tree it is being
 * measured in. The trailing separator is added when it is missing, so a tree
 * named either way is the same tree.
 * @param argv - the process arguments.
 * @returns the tree named after the flag, or this repository.
 */
export function rootOf(argv: readonly string[]): string {
  const at = argv.indexOf(ROOT_FLAG)
  const named = at === -1 ? '' : (argv[at + 1] ?? '')
  if (named === '') return ROOT
  return named.endsWith('/') ? named : `${named}/`
}

/**
 * Run the generator.
 * @param argv - the process arguments; `--check` compares instead of writing,
 *   and `--root` names the tree to work in.
 * @returns the process exit code: 0 when the faces are current or refreshed.
 */
export async function main(argv: readonly string[]): Promise<number> {
  const unknown = unknownArguments(argv)
  if (unknown.length > 0) {
    process.stderr.write(`gen-action-registry: unknown argument(s): ${unknown.join(', ')}\n`)
    return 2
  }
  const check = argv.includes(CHECK_FLAG)
  const root = rootOf(argv)
  const registry = readRegistry(await readFile(`${root}${SOURCES.registry}`, 'utf8'))
  for (const action of registry.actions) requireLane(root, action.lane, action.id)

  const faces: readonly (readonly [string, string])[] = [
    [SOURCES.typescript, emitTypeScript(registry)],
    [SOURCES.capabilities, emitCapabilities(registry)],
    [SOURCES.actionTable, emitActionTable(registry)],
    [SOURCES.rust, emitRust(registry)],
  ]
  if (check) {
    const read = await Promise.all(
      faces.map(async ([path, written]) => {
        const state = await faceState(root, path, written)
        return state === 'current' ? '' : `${path} (${state})`
      }),
    )
    const stale = read.filter((entry) => entry !== '')
    if (stale.length > 0) {
      process.stderr.write(`action registry is stale: ${stale.join(', ')}\n`)
      return 1
    }
    return 0
  }
  await Promise.all(
    faces.map(async ([path, written]) => {
      await mkdir(`${root}${path.slice(0, path.lastIndexOf('/') + 1)}`, { recursive: true })
      await writeFile(`${root}${path}`, written)
    }),
  )
  // What was written, one path per line: a generator that rewrites four files
  // and says nothing leaves a reader unable to tell it ran at all.
  process.stdout.write(faces.map(([path]) => `${path}\n`).join(''))
  return 0
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2))
