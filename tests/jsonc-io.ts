/**
 * The disk half of JSON-with-comments reading: the pure parser in
 * `./jsonc.ts`, reached from a file path, for every suite that asserts
 * against a manifest or tsconfig as it ships on disk.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { readJsonc } from './jsonc.ts'

/**
 * Parse one JSON-with-comments file from disk, on the closed Json model.
 * @param path - the file to read.
 * @returns the parsed object.
 */
export function readJsoncSync(path: string): ReturnType<typeof readJsonc> {
  return readJsonc(readFileSync(path, 'utf8'))
}
