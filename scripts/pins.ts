/**
 * Every dependency a workspace manifest declares, of any kind.
 *
 * Shared by the outdated gate (so a silent bun table cannot report "0 checked"
 * when dozens of pins exist) and the floor suite, so the two cannot disagree
 * on what is installed.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { EMPTY_SECTION, isJsonObject, readJsonc } from './jsonc.ts'
import { repositoryFiles } from './source-tree.ts'

/** Every kind of dependency a manifest can declare. */
const DEPENDENCY_KINDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const

/**
 * Every dependency this repository declares, from every manifest it ships.
 * @returns name to declared range.
 */
export function declaredPins(): Map<string, string> {
  const found = new Map<string, string>()
  for (const manifest of repositoryFiles(['package.json'])) {
    const parsed = readJsonc(readFileSync(manifest.path, 'utf8'))
    for (const kind of DEPENDENCY_KINDS) {
      const raw = parsed[kind]
      const declarations = isJsonObject(raw) ? raw : EMPTY_SECTION
      for (const [name, range] of Object.entries(declarations)) {
        if (typeof range === 'string') found.set(name, range)
      }
    }
  }
  return found
}
