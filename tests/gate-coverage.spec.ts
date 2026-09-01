/**
 * What the gates are pointed at.
 *
 * A rule that works is worth nothing if the file it would have caught is never
 * read. A previous gate walked a hand-written list of directories and reported
 * success over the trees the list left out, so what is asserted here is the
 * reach of the file list itself, and that the repository is clean under both
 * gates when every file it ships is actually read.
 */

import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import * as bans from '../scripts/ban-gate.ts'
import { repositoryFiles } from '../scripts/source-tree.ts'
import * as styles from '../scripts/style-gate.ts'

describe('the file list both gates read', () => {
  it('is every source file the repository ships, and nothing it builds', () => {
    const labels = repositoryFiles([...styles.SCRIPT_EXTENSIONS, ...styles.MARKUP_EXTENSIONS]).map((file) => file.label)
    // A gate that walks a hand-written list of directories is only as complete
    // as the list; these are the trees a previous list left out.
    for (const required of [
      'apps/deeptail/src/main.ts',
      'apps/deeptail/index.html',
      'apps/deeptail/vite.config.ts',
      'packages/host-fleet/src/index.ts',
      'scripts/check-no-inline-styles.ts',
      'scripts/style-gate.ts',
      'tests/gates.spec.ts',
    ]) {
      expect([required, labels.includes(required)]).toEqual([required, true])
    }
    expect(labels.filter((label) => /(?:^|\/)(?:node_modules|lib|dist|gen|target)\//u.test(label))).toEqual([])
  })

  it('reaches the Rust the suppression ban is written for', () => {
    const labels = repositoryFiles([...bans.PLAIN_EXTENSIONS]).map((file) => file.label)
    expect(labels).toContain('apps/deeptail/src-tauri/src/lib.rs')
    expect(labels).toContain('bunfig.toml')
  })

  it('leaves the repository clean under both gates', async () => {
    const files = repositoryFiles([...styles.SCRIPT_EXTENSIONS, ...styles.MARKUP_EXTENSIONS, ...bans.PLAIN_EXTENSIONS])
    const offences = await Promise.all(
      files.map(async (file) => {
        const text = await readFile(file.path, 'utf8')
        const found = [...styles.SCRIPT_EXTENSIONS, ...styles.MARKUP_EXTENSIONS].some((extension) =>
          file.label.endsWith(extension),
        )
          ? styles.scanSource(file.label, text)
          : []
        return [...found, ...bans.scanSource(file.label, text)].map(
          (offence) => `${offence.label}:${String(offence.line)}: ${offence.why}`,
        )
      }),
    )
    expect(offences.flat()).toEqual([])
  })
})
