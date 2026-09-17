/**
 * Names that say the code stands in for something real.
 *
 * A name is a claim about what the thing is, and `stubDeps` or `FakeSocket`
 * claims the thing is standing in for something else — which is either false,
 * in which case the name misleads every later reader, or true, in which case
 * the debt is the defect and the name is the record of it.
 *
 * Split from `ban-rules.ts`, which holds the idiom bans: this one is about
 * vocabulary rather than about syntax, and it carries the tables of where a
 * file writes a name of its own.
 *
 * @module
 */

import { type Field, isNode, type Node, unwrap } from './ast.ts'

/**
 * Words that name a thing as counterfeit, unfinished, or kept for its own sake.
 *
 * A name is a claim about what the thing is. `stubDeps` and `FakeSocket` each
 * say the code is standing in for something real, which is either false — the
 * double really does answer, so say what it answers — or true, in which case
 * the debt is the defect and the name is the record of it.
 *
 * The words are matched against the parts of a name rather than against the
 * whole, so `broadcast` and `company` carry no claim and `readStubRow` does;
 * matching them as substrings would be a rule nobody could satisfy. `any`,
 * `cast`, `ignore` and `suppress` are absent because each is refused exactly
 * where it can occur — as a type keyword, an as-expression, and a directive in
 * a comment — and a second reading by spelling would be the weaker of the two.
 * `placeholder` is absent for the opposite reason: it is the name of the DOM
 * property this product sets on an input, so in this tree the word names a
 * platform member rather than a claim about the code.
 */
const DEBT_WORDS: ReadonlySet<string> = new Set([
  'todo',
  'fixme',
  'hack',
  'xxx',
  'stub',
  'stubs',
  'stubbed',
  'mock',
  'mocks',
  'mocked',
  'fake',
  'fakes',
  'faked',
  'dummy',
  'noop',
  'temporary',
  'temp',
  'hardcoded',
  'shim',
  'polyfill',
  'workaround',
  'legacy',
  'barrel',
  'compat',
])

/** Where a file writes a name of its own choosing, and under which field. */
const NAMED: ReadonlyMap<string, string> = new Map([
  ['VariableDeclarator', 'id'],
  ['FunctionDeclaration', 'id'],
  ['ClassDeclaration', 'id'],
  ['TSInterfaceDeclaration', 'id'],
  ['TSTypeAliasDeclaration', 'id'],
  ['TSEnumDeclaration', 'id'],
  ['TSEnumMember', 'id'],
  ['PropertyDefinition', 'key'],
  ['MethodDefinition', 'key'],
  ['TSPropertySignature', 'key'],
  ['TSMethodSignature', 'key'],
])

/** The node types whose parameters are names the file chose. */
const PARAMETERISED = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'TSDeclareFunction',
  'TSMethodSignature',
  'TSFunctionType',
])

/**
 * Whether a word written as part of a name is one of the debt words.
 *
 * The name is split on the boundaries a name is written with — the hump
 * between a lower-case run and an upper-case one, underscores and dashes — so
 * `LEGACY_RULES`, `stubDeps` and `read-mock-row` each yield whole words while
 * `broadcast` and `stubborn` yield themselves.
 * @param name - the name as written.
 * @returns true when one of its parts is a debt word.
 */
function debtName(name: string): boolean {
  return name
    .split(/(?<=[a-z0-9])(?=[A-Z])|[_-]/u)
    .map((part) => part.toLowerCase())
    .some((part) => DEBT_WORDS.has(part))
}

/**
 * Every name one binding target introduces, patterns included.
 *
 * A destructuring binds names as surely as a plain declarator does, so the
 * pattern is walked rather than read as a single identifier.
 * @param target - the binding target, or the key of a member.
 * @returns the names it introduces.
 */
function boundNames(target: Field | undefined): string[] {
  const node = unwrap(target)
  if (!isNode(node)) return []
  if (node.type === 'Identifier') {
    const name = node['name']
    return typeof name === 'string' ? [name] : []
  }
  if (node.type === 'AssignmentPattern') return boundNames(node['left'])
  if (node.type === 'RestElement') return boundNames(node['argument'])
  if (node.type === 'ArrayPattern') {
    const elements = node['elements']
    return Array.isArray(elements) ? elements.flatMap((element) => boundNames(element)) : []
  }
  if (node.type !== 'ObjectPattern') return []
  const properties = node['properties']
  if (!Array.isArray(properties)) return []
  return properties.flatMap((property_) => {
    if (!isNode(property_)) return []
    return boundNames(property_.type === 'Property' ? property_['value'] : property_)
  })
}

/**
 * Whether a declaration names itself as debt.
 *
 * Only the names this file chooses are read: a member reached on someone
 * else's object — `input.placeholder`, `it.todo` — is that API's name, not a
 * claim this repository is making, and a computed key is an expression rather
 * than a name at all.
 * @param node - the node to test.
 * @returns true when a name it introduces carries a debt word.
 */
export function namesDebt(node: Node): boolean {
  const named: string[] = []
  const field = NAMED.get(node.type)
  if (field !== undefined && node['computed'] !== true) named.push(...boundNames(node[field]))
  if (PARAMETERISED.has(node.type)) {
    const params = node['params']
    if (Array.isArray(params)) named.push(...params.flatMap((param) => boundNames(param)))
  }
  if (node.type === 'ObjectExpression') named.push(...literalMembers(node))
  return named.some((name) => debtName(name))
}

/**
 * The members an object literal names.
 *
 * Read off the literal rather than off each property, because the same node
 * shape is what a destructuring is written with — and there the key is the
 * *source* object's member, a name this repository is reading rather than
 * choosing.
 * @param node - the object literal.
 * @returns the member names it writes.
 */
function literalMembers(node: Node): string[] {
  const properties = node['properties']
  if (!Array.isArray(properties)) return []
  return properties.flatMap((property_) => {
    if (!isNode(property_) || property_.type !== 'Property' || property_['computed'] === true) return []
    return boundNames(property_['key'])
  })
}
