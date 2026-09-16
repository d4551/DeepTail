/**
 * The Tauri v1 config face, read through the schema the installed CLI ships
 * rather than through a remembered list of the keys v1 had.
 *
 * A key the shipped schema does not declare is a key that release does not
 * read, whether it was renamed, moved into a whole section that no longer
 * exists, or marked deprecated in place.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { tauriConfigOffences } from '../scripts/compiler-face.ts'
import { type Json, readJsonc } from '../scripts/jsonc.ts'
import { ROOT } from '../scripts/source-tree.ts'
import { TREE_SCAN_BUDGET_MS } from './tree-budget.ts'

/** The schema the installed Tauri CLI ships, and the config this repository ships. */
const TAURI_SCHEMA = 'node_modules/@tauri-apps/cli/config.schema.json'
const TAURI_CONFIG = 'apps/deeptail/src-tauri/tauri.conf.json'

/**
 * The schema the installed Tauri CLI ships.
 * @returns the parsed schema.
 */
async function tauriSchema(): Promise<{ [key: string]: Json }> {
  return readJsonc(await readFile(`${ROOT}${TAURI_SCHEMA}`, 'utf8'))
}

describe('the Tauri v1 config face', () => {
  it('names a v1 key, a whole v1 section, and a key the shipped schema marks deprecated', async () => {
    const schema = await tauriSchema()
    expect(
      tauriConfigOffences(schema, readJsonc('{"productName":"x","build":{"devPath":"../dist","distDir":"../dist"}}')),
    ).toEqual([
      'build.devPath is not a key the shipped Tauri v2 schema declares',
      'build.distDir is not a key the shipped Tauri v2 schema declares',
    ])
    expect(tauriConfigOffences(schema, readJsonc('{"productName":"x","tauri":{"allowlist":{}}}'))).toEqual([
      'tauri is not a key the shipped Tauri v2 schema declares',
    ])
    expect(
      tauriConfigOffences(schema, readJsonc('{"bundle":{"windows":{"nsis":{"minimumWebview2Version":"1"}}}}')),
    ).toEqual(['bundle.windows.nsis.minimumWebview2Version is a key the shipped Tauri v2 schema marks deprecated'])
    // The live key of that name, one section up, is where v2 moved it: a reader
    // that refused the name wherever it stood would refuse this one too.
    expect(tauriConfigOffences(schema, readJsonc('{"bundle":{"windows":{"minimumWebview2Version":"1"}}}'))).toEqual([])
  })

  it(
    'holds the shipped configuration to the shipped schema',
    async () => {
      const schema = await tauriSchema()
      const config = readJsonc(await readFile(`${ROOT}${TAURI_CONFIG}`, 'utf8'))
      expect(tauriConfigOffences(schema, config)).toEqual([])
    },
    TREE_SCAN_BUDGET_MS,
  )
})
