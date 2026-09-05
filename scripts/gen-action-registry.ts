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
import { emitRust, emitTypeScript } from './action-registry-emit.ts'
import { readRegistry } from './action-registry.ts'
import { ROOT } from './source-tree.ts'

/** Where the registry lives, and where each face is written. */
const SOURCES = {
  registry: 'apps/deeptail/src/actions/actions.bao',
  typescript: 'apps/deeptail/src/actions/registry.ts',
  rust: 'apps/deeptail/src-tauri/src/capability/catalog.rs',
} as const

/**
 * Refuse a registry whose entries are not all verified.
 *
 * An entry naming no file is an action that has never been driven: the matrix
 * would claim a control is covered on the strength of a row nobody ran.
 * @param lane - the repository-relative path the entry names.
 * @param id - the entry that named it.
 */
function requireLane(lane: string, id: string): void {
  if (!existsSync(`${ROOT}${lane}`)) throw new Error(`actions.bao: action "${id}" names lane "${lane}", which is not a file`)
}

/**
 * One face, as it must be.
 * @param path - repository-relative path it is written to.
 * @param written - the bytes the generator produces.
 * @returns whether the file on disk already carries those bytes.
 */
async function matches(path: string, written: string): Promise<boolean> {
  const onDisk = await readFile(`${ROOT}${path}`, 'utf8').then(
    (text) => text,
    () => '',
  )
  return onDisk === written
}

/**
 * Run the generator.
 * @param argv - the process arguments; `--check` compares instead of writing.
 * @returns the process exit code: 0 when the faces are current or refreshed.
 */
export async function main(argv: readonly string[]): Promise<number> {
  const check = argv.includes('--check')
  const registry = readRegistry(await readFile(`${ROOT}${SOURCES.registry}`, 'utf8'))
  for (const action of registry.actions) requireLane(action.lane, action.id)

  const faces: readonly (readonly [string, string])[] = [
    [SOURCES.typescript, emitTypeScript(registry)],
    [SOURCES.rust, emitRust(registry)],
  ]
  if (check) {
    const drifted: string[] = []
    for (const [path, written] of faces) {
      if (!(await matches(path, written))) drifted.push(path)
    }
    if (drifted.length > 0) {
      process.stderr.write(`action registry is stale: ${drifted.join(', ')}\n`)
      return 1
    }
    return 0
  }
  for (const [path, written] of faces) {
    await mkdir(`${ROOT}${path.slice(0, path.lastIndexOf('/') + 1)}`, { recursive: true })
    await writeFile(`${ROOT}${path}`, written, 'utf8')
  }
  return 0
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2))
