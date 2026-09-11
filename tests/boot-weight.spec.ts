/**
 * What the shell has to parse before it can paint.
 *
 * The control plane and the harness client cannot share the page: the shell is
 * torn down before a client boots. The shell therefore exists to be usable
 * without the client — and `boot.ts` imported it at the top of the module
 * anyway, so every shell boot parsed and evaluated the heaviest dependency in
 * the tree to draw a roster the client is no part of. Measured in Chromium at
 * every designed width, that cost two long tasks (about 75ms and 190ms), a
 * first contentful paint around 150ms, and a 1.4MB entry chunk. Deferred to
 * the moment a session is opened: no long task at all, paint around 50ms, and
 * an entry chunk of about 66KB.
 *
 * A `import type` is erased and costs nothing. A value import is what has to
 * stay out, and that is what this reads.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { parseSync } from 'oxc-parser'
import { ROOT, repositoryFiles } from '../scripts/source-tree.ts'
import { TREE_SCAN_BUDGET_MS } from './tree-budget.ts'

/** The dependency the shell must not need in order to paint. */
const CLIENT = '@deepseek-ai/dsh-client-web'

/** Where the build writes its chunks. */
const ASSETS = `${ROOT}apps/deeptail/dist/assets/`

/**
 * The most the entry chunk may weigh, in bytes.
 *
 * It is about 66KB with the client split out and the client's own chunk is
 * about 1.3MB, so this sits far above what the shell's own growth can reach
 * and far below what pulling the client back in would cost — by any route,
 * including one this file's source reader cannot see, such as a transitive
 * dependency of some other import.
 */
const ENTRY_BUDGET = 300 * 1024

/**
 * Every built chunk, by name and size.
 *
 * The build is a precondition rather than something to skip around: a weight
 * check with nothing to weigh reports nothing, and reporting nothing is what
 * this file exists to prevent.
 * @returns each chunk's name and byte length.
 */
function builtChunks(): { readonly name: string; readonly bytes: number }[] {
  const listed = readdirSync(ASSETS, { withFileTypes: true }).filter(
    (entry) => entry.isFile() && entry.name.endsWith('.js'),
  )
  if (listed.length === 0) throw new Error(`no built chunks under ${ASSETS}; run \`bun run build\` first`)
  return listed.map((entry) => ({ name: entry.name, bytes: statSync(`${ASSETS}${entry.name}`).size }))
}

/**
 * Every module under the shell that imports a package for its value.
 * @param specifier - the package to look for.
 * @returns one label per module that would pull it into the entry chunk.
 */
function valueImporters(specifier: string): string[] {
  const found: string[] = []
  for (const file of repositoryFiles(['.ts'])) {
    if (!file.label.startsWith('apps/deeptail/src/')) continue
    const parsed = parseSync(file.label, readFileSync(file.path, 'utf8'))
    for (const statement of parsed.program.body) {
      if (statement.type !== 'ImportDeclaration' || statement.source.value !== specifier) continue
      // A type-only import, and one whose every named binding is a type, are
      // both erased before the bundler ever sees them.
      const wholeDeclaration = statement.importKind === 'type'
      const everySpecifier = statement.specifiers.every(
        (one) => one.type === 'ImportSpecifier' && one.importKind === 'type',
      )
      if (!wholeDeclaration && !everySpecifier) found.push(file.label)
    }
  }
  return found
}

describe('the shell’s entry weight', () => {
  it(
    'needs no value from the harness client in order to paint',
    () => {
      // The client is loaded with a dynamic `import()` at the moment a session is
      // actually opened. A static import here puts it back in the entry chunk,
      // and nothing else in the suite would notice.
      expect(valueImporters(CLIENT)).toEqual([])
    },
    TREE_SCAN_BUDGET_MS,
  )

  it('ships an entry chunk the shell can parse before it paints', () => {
    // The source reader above sees one specifier. This weighs what the bundler
    // actually produced, so the client returning by any route at all -- a
    // transitive dependency, a re-export, a differently spelled specifier --
    // is caught by the thing that matters, which is what the page must parse.
    const chunks = builtChunks()
    const entry = chunks.filter((chunk) => chunk.name.startsWith('index-'))
    expect(entry.length).toBe(1)
    expect([entry[0]?.name ?? '', (entry[0]?.bytes ?? Number.MAX_SAFE_INTEGER) <= ENTRY_BUDGET]).toEqual([
      entry[0]?.name ?? '',
      true,
    ])
  })

  it('splits the client into a chunk of its own, which is the weight being deferred', () => {
    // If the whole build were small the budget above would pass for the wrong
    // reason -- nothing deferred, nothing to defer. The client's own chunk is
    // by far the heaviest thing here, and it must exist separately from the
    // entry for the budget to mean anything.
    const chunks = builtChunks()
    const heaviest = chunks.reduce((most, chunk) => (chunk.bytes > most.bytes ? chunk : most))
    expect(heaviest.name.startsWith('index-')).toBe(false)
    expect(heaviest.bytes).toBeGreaterThan(ENTRY_BUDGET)
  })

  it(
    'reads a value import as one, so the check cannot pass by accident',
    () => {
      // The same reader against a package the shell really does import for its
      // value: if this returned nothing, the case above would be green whatever
      // `boot.ts` did.
      expect(valueImporters('@tauri-apps/api/core').length).toBeGreaterThan(0)
    },
    TREE_SCAN_BUDGET_MS,
  )
})
