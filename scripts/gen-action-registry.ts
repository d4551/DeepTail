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
 *
 * Exported so the refusal is driven rather than reached only through a run of
 * the generator, which writes.
 * @param lane - the repository-relative path the entry names.
 * @param id - the entry that named it.
 */
export function requireLane(lane: string, id: string): void {
  if (!existsSync(`${ROOT}${lane}`))
    throw new Error(`actions.bao: action "${id}" names lane "${lane}", which is not a file`)
}

/**
 * One face, as it must be.
 *
 * A face that cannot be read at all reads as empty, so a missing generated
 * file is drift rather than a crash — and drift is what the chain acts on.
 * Exported so both answers are driven: this comparison is the whole of what
 * `--check` decides on, and the chain trusts its zero.
 * @param path - repository-relative path it is written to.
 * @param written - the bytes the generator produces.
 * @returns whether the file on disk already carries those bytes.
 */
export async function matches(path: string, written: string): Promise<boolean> {
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
    [SOURCES.capabilities, emitCapabilities(registry)],
    [SOURCES.actionTable, emitActionTable(registry)],
    [SOURCES.rust, emitRust(registry)],
  ]
  if (check) {
    const read = await Promise.all(faces.map(async ([path, written]) => ((await matches(path, written)) ? '' : path)))
    const drifted = read.filter((path) => path !== '')
    if (drifted.length > 0) {
      process.stderr.write(`action registry is stale: ${drifted.join(', ')}\n`)
      return 1
    }
    return 0
  }
  await Promise.all(
    faces.map(async ([path, written]) => {
      await mkdir(`${ROOT}${path.slice(0, path.lastIndexOf('/') + 1)}`, { recursive: true })
      await writeFile(`${ROOT}${path}`, written, 'utf8')
    }),
  )
  return 0
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2))
