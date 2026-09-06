/**
 * What a module may do when it is merely imported.
 *
 * Importing a module must run nothing. A script that does its work at the top
 * level does that work whenever anything reaches for what it exports, and the
 * reach is usually a suite wanting one reader out of it.
 *
 * The cost is not a stray line of output. `mutate-restore.ts` shipped
 * unguarded, its suite was named in a mutation command, and so every mutant run
 * imported it, restored the tree Stryker had just instrumented, and reported
 * the whole scope as nought per cent — a fictitious number, with nothing amiss
 * in the log. The convention that prevents it was already in this repository,
 * in the two scripts that had it; this is what holds every script to it.
 *
 * @module
 */

import { isNode, type Node, parseScript } from './ast.ts'
import type { Offence } from './offence.ts'

/** Statement types that declare something rather than doing something. */
const DECLARATIONS = new Set([
  'ImportDeclaration',
  'ExportNamedDeclaration',
  'ExportDefaultDeclaration',
  'ExportAllDeclaration',
  'VariableDeclaration',
  'FunctionDeclaration',
  'ClassDeclaration',
  'TSTypeAliasDeclaration',
  'TSInterfaceDeclaration',
  'TSEnumDeclaration',
  'TSModuleDeclaration',
  'TSDeclareFunction',
  'TSImportEqualsDeclaration',
  'EmptyStatement',
])

/**
 * Whether a statement is the guard a runnable script does its work behind.
 * @param node - the top-level statement.
 * @returns true when it is `if (import.meta.main) …`.
 */
function isEntryGuard(node: Node): boolean {
  if (node.type !== 'IfStatement') return false
  const test = node.test
  if (!isNode(test) || test.type !== 'MemberExpression') return false
  const object = test.object
  const property = test.property
  return (
    isNode(object) &&
    object.type === 'MetaProperty' &&
    isNode(property) &&
    property.type === 'Identifier' &&
    property.name === 'main'
  )
}

/**
 * Every top-level statement a module runs when it is imported.
 * @param label - the path to report offences under.
 * @param text - the file's contents.
 * @returns one offence per statement that runs at import.
 */
export function scanEntry(label: string, text: string): Offence[] {
  const parsed = parseScript(label, text)
  const offences: Offence[] = parsed.errors.map((error) => ({
    label,
    line: 1,
    why: `this file does not parse, so it cannot be checked: ${error.message}`,
  }))
  for (const statement of parsed.body) {
    if (DECLARATIONS.has(statement.type) || isEntryGuard(statement)) continue
    offences.push({
      label,
      line: parsed.lineAt(statement.start),
      why: 'this runs when the module is imported; put the work behind `if (import.meta.main)`',
    })
  }
  return offences
}
