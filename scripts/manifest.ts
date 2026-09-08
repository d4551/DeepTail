/**
 * A package manifest, read onto the closed JSON model rather than claimed.
 *
 * Five readers each opened `package.json` with `JSON.parse` and then told the
 * compiler what they had found, which is a claim about a file on disk that
 * nothing checks: a manifest whose `scripts` is a string, or whose commands are
 * numbers, reads as the declared shape and fails somewhere else entirely. The
 * document goes through the shared JSONC reader here, and what is not a string
 * is not a command.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { EMPTY_SECTION, isJsonObject, type Json, readJsonc } from './jsonc.ts'

/**
 * One manifest, on the closed JSON model.
 * @param path - the manifest to read.
 * @returns its members.
 */
export function readManifest(path: string): { [key: string]: Json } {
  return readJsonc(readFileSync(path, 'utf8'))
}

/**
 * The string members of one section of a manifest.
 *
 * A section that is not an object declares nothing, and a member that is not a
 * string is not the thing the section holds — a command, a range, a name — so
 * neither reads as one.
 * @param manifest - the manifest's members.
 * @param section - the key the section is written under.
 * @returns each member that is a string, in the order the file writes them.
 */
export function sectionOf(manifest: { [key: string]: Json }, section: string): Map<string, string> {
  const held = manifest[section]
  const declared = isJsonObject(held) ? held : EMPTY_SECTION
  const found = new Map<string, string>()
  for (const [name, value] of Object.entries(declared)) {
    if (typeof value === 'string') found.set(name, value)
  }
  return found
}

/**
 * The scripts one manifest declares.
 * @param path - the manifest to read.
 * @returns script name to the command it runs.
 */
export function manifestScripts(path = 'package.json'): Map<string, string> {
  return sectionOf(readManifest(path), 'scripts')
}
