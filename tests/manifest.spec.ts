/**
 * A package manifest, read onto the closed JSON model rather than claimed.
 *
 * Five readers opened `package.json` with `JSON.parse` and then told the
 * compiler what they had found. That is a claim about a file on disk that
 * nothing checks: a manifest whose `scripts` is a string, or whose commands are
 * numbers, reads as the declared shape and fails somewhere else entirely — and
 * the gates that read those commands would then be reading nothing while
 * reporting on something.
 */

import { describe, expect, it } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Json } from '../scripts/jsonc.ts'
import { manifestScripts, readManifest, sectionOf } from '../scripts/manifest.ts'

/**
 * Write one manifest and read it back the way the gates do.
 * @param text - the manifest's contents.
 * @returns the scripts it declares.
 */
async function scriptsOf(text: string): Promise<[string, string][]> {
  const root = await mkdtemp(join(tmpdir(), 'manifest-'))
  const path = join(root, 'package.json')
  try {
    await writeFile(path, text)
    return [...sectionOf(readManifest(path), 'scripts')]
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

describe('one section of a manifest', () => {
  it('reads every member that is a string, in the order the file writes them', () => {
    const manifest: { [key: string]: Json } = { scripts: { build: 'vite build', test: 'bun test' } }
    expect([...sectionOf(manifest, 'scripts')]).toEqual([
      ['build', 'vite build'],
      ['test', 'bun test'],
    ])
  })

  it('reads a member that is not a string as no member at all', () => {
    // A command is a command. A number read as one is a gate the chain would
    // report on and never run.
    const manifest: { [key: string]: Json } = { scripts: { build: 'vite build', broken: 7, absent: null } }
    expect([...sectionOf(manifest, 'scripts')]).toEqual([['build', 'vite build']])
  })

  it('reads a section that is not a mapping, or is not there, as declaring nothing', () => {
    expect([...sectionOf({ scripts: 'all of them' }, 'scripts')]).toEqual([])
    expect([...sectionOf({ scripts: ['build'] }, 'scripts')]).toEqual([])
    expect([...sectionOf({}, 'scripts')]).toEqual([])
  })

  it('reads the section it was asked for, and not another', () => {
    const manifest: { [key: string]: Json } = { scripts: { a: '1' }, devDependencies: { b: '2' } }
    expect([...sectionOf(manifest, 'devDependencies')]).toEqual([['b', '2']])
  })
})

describe('a manifest on disk', () => {
  it('is read through the shared JSONC reader, comments and all', async () => {
    expect(await scriptsOf('{ /* the chain */ "scripts": { "lint": "biome check .", } }')).toEqual([
      ['lint', 'biome check .'],
    ])
  })

  it('refuses a manifest that is not a document at all', async () => {
    await expect(scriptsOf('[]')).rejects.toThrow('expected a JSON object at the root')
    await expect(scriptsOf('{ "scripts": ')).rejects.toThrow('jsonc parse errors')
  })
})

describe('the manifest the gates read', () => {
  it('is this repository’s own, and carries the chain that decides ship-worthiness', () => {
    const scripts = manifestScripts()
    expect(scripts.get('validate')?.includes('bun run lint')).toBe(true)
    expect(scripts.get('test')?.startsWith('bun test ')).toBe(true)
  })
})
