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
import { readFileSync } from 'node:fs'
import { parseSync } from 'oxc-parser'
import { repositoryFiles } from '../scripts/source-tree.ts'

/** The dependency the shell must not need in order to paint. */
const CLIENT = '@deepseek-ai/dsh-client-web'

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
  it('needs no value from the harness client in order to paint', () => {
    // The client is loaded with a dynamic `import()` at the moment a session is
    // actually opened. A static import here puts it back in the entry chunk,
    // and nothing else in the suite would notice.
    expect(valueImporters(CLIENT)).toEqual([])
  })

  it('reads a value import as one, so the check cannot pass by accident', () => {
    // The same reader against a package the shell really does import for its
    // value: if this returned nothing, the case above would be green whatever
    // `boot.ts` did.
    expect(valueImporters('@tauri-apps/api/core').length).toBeGreaterThan(0)
  })
})
