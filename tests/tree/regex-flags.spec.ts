/**
 * Every regular expression the shipped TypeScript reads carries the unicode
 * flag.
 *
 * A regex without `u` reads a surrogate pair as two characters, refuses the
 * `\p{…}` classes, and silences the strict-escape check — so a name splitter
 * or a vocabulary matcher written without it quietly mis-reads exactly the
 * input this product exists to display. The tree already spells the flag
 * everywhere; this is the gate that says so when one stops.
 *
 * A whole-tree property of the tree at rest, which is why it sits beside the
 * other tree suites and outside every mutation command.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { type Field, fieldOf, isNode, memberName, parseScript, unwrap, walk } from '../../scripts/ast.ts'
import { repositoryFiles } from '../../scripts/source-tree.ts'
import { TREE_SCAN_BUDGET_MS } from '../tree-budget.ts'

/** Where a regex is written without the flag. */
interface Offence {
  /** The file and line the expression sits on. */
  readonly where: string
  /** The spelling the file wrote, so the fix is a one-line read. */
  readonly written: string
}

/**
 * The name a called or constructed RegExp is reached by, when it is plain.
 * @param node - the call or new expression.
 * @returns `RegExp`, or undefined when the callee is something else.
 */
function calleeName(node: Field | undefined): string | undefined {
  const callee = unwrap(fieldOf(node, 'callee'))
  if (!isNode(callee)) return undefined
  if (callee.type === 'Identifier') return typeof callee.name === 'string' ? callee.name : undefined
  return memberName(callee)
}

/**
 * The flags argument a RegExp call carries, when it is written as a literal.
 * @param node - the call or new expression.
 * @returns the flags string, or undefined when the call names none.
 */
function callFlags(node: Field | undefined): string | undefined {
  const args = fieldOf(node, 'arguments')
  if (!Array.isArray(args) || args.length < 2) return undefined
  const flags = unwrap(args[1])
  if (!isNode(flags) || flags.type !== 'Literal') return undefined
  return typeof flags.value === 'string' ? flags.value : undefined
}

/**
 * Every regex one file writes without the unicode flag, however it is spelt.
 *
 * Both spellings are read: the literal `/…/flags` arrives from the parser as a
 * literal carrying its regex, and `new RegExp(a, b)` arrives as a call whose
 * second argument is the flags — a reader that knew only one of the two would
 * hold the tree to a rule half of it could not see.
 * @param label - the path, which selects the parse dialect.
 * @param text - the file's contents.
 * @returns one offence per flagless regex, in source order.
 */
function flaglessRegexes(label: string, text: string): readonly Offence[] {
  const parsed = parseScript(label, text)
  const found: Offence[] = []
  walk(parsed.body, (node) => {
    const line = parsed.lineAt(node.start)
    const regex = fieldOf(node, 'regex')
    if (regex !== null && regex !== undefined) {
      const flags = fieldOf(regex, 'flags')
      if (typeof flags === 'string' && !flags.includes('u')) {
        found.push({ where: `${label}:${String(line)}`, written: String(fieldOf(node, 'raw') ?? `flags "${flags}"`) })
      }
      return
    }
    if (node.type !== 'NewExpression' && node.type !== 'CallExpression') return
    if (calleeName(node) !== 'RegExp') return
    const flags = callFlags(node)
    if (flags === undefined) {
      found.push({ where: `${label}:${String(line)}`, written: 'RegExp called with no flags argument' })
    } else if (!flags.includes('u')) {
      found.push({ where: `${label}:${String(line)}`, written: `RegExp flags "${flags}"` })
    }
  })
  return found
}

describe('every regex the shipped TypeScript writes reads unicode', () => {
  it(
    'carries the u flag on every literal and every RegExp call, tree-wide',
    async () => {
      const files = repositoryFiles(['.ts', '.tsx'])
      expect(files.length).toBeGreaterThan(0)
      const read = await Promise.all(
        files.map(async (file) => ({ label: file.label, text: await readFile(file.path, 'utf8') })),
      )
      expect(read.flatMap((file) => flaglessRegexes(file.label, file.text).map((offence) => offence.where))).toEqual([])
    },
    TREE_SCAN_BUDGET_MS,
  )

  it('names the flagless spellings it must catch, rather than only ever being green', () => {
    // The case above has only ever been seen green if nobody drives the
    // detector against the cheat it exists for: a literal without the flag, a
    // call without the flag, and the flagged spellings beside them.
    const planted = [
      'const bare = /abc/',
      'const flagged = /abc/u',
      'const call = new RegExp("abc", "g")',
      'const called = new RegExp("abc", "gu")',
      'const members = String.raw`x`.match(/x/gu)',
    ].join('\n')
    expect(flaglessRegexes('planted.ts', planted).map((offence) => offence.where)).toEqual([
      'planted.ts:1',
      'planted.ts:3',
    ])
    expect(flaglessRegexes('clean.ts', 'const ok = /[\\p{Letter}]/gu.test("x")')).toEqual([])
  })
})
