/**
 * Idioms the project has moved past, and directives that switch a checker off.
 *
 * A toolchain that silently slips back, or source that revives an idiom the
 * project has left behind, is a regression no other gate reports: the build
 * still succeeds and every other suite stays green.
 *
 * Both bans are read off a parse. That matters most for the suppression ban,
 * because a directive is *only ever a comment* — so the comments are what is
 * searched, and the tables below, being string data in code, are not comments
 * and cannot match themselves. There is no declaration to skip, and therefore
 * no shape a directive can be dressed in to slip past the skipping.
 *
 * @module
 */

import { isNode, type Node, parseScript, walk } from './ast.ts'

/** Extensions whose bans are read off a syntax tree. */
export const SCRIPT_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'] as const

/** Extensions whose bans are read line by line, having no parser here. */
export const PLAIN_EXTENSIONS = ['.rs', '.toml', '.yml', '.yaml', '.json'] as const

/** One rejected construct. */
export interface Offence {
  /** Repository-relative path of the file it was found in. */
  readonly label: string
  /** One-based line number. */
  readonly line: number
  /** What is wrong, and what to do instead. */
  readonly why: string
}

/**
 * Directives that switch a checker off, in every language the repository uses.
 *
 * Suppressing a rule hides the defect rather than fixing it, so the ban is
 * absolute; a rule that genuinely does not apply is a rule to remove from the
 * configuration, where the removal is visible.
 */
const SUPPRESSIONS: readonly { readonly pattern: RegExp; readonly why: string }[] = [
  { pattern: /@ts-(?:ignore|nocheck|expect-error)/u, why: 'suppressing the type checker hides the defect' },
  {
    pattern: /(?:eslint|oxlint|biome|knip|rustfmt|clippy)-(?:disable|ignore)/u,
    why: 'suppressing a rule hides the defect',
  },
  { pattern: /(?:istanbul|c8|v8)\s+ignore/u, why: 'excluding a line from coverage hides the gap' },
  { pattern: /@?biome-ignore/u, why: 'suppressing a rule hides the defect' },
  { pattern: /@public\b/u, why: 'marking an unused export public hides that nothing imports it' },
  { pattern: /#!?\[\s*(?:allow|expect)\s*\(/u, why: 'suppressing a Rust lint hides the defect' },
]

/** A rule stated about a node, rather than about the text of a line. */
interface Rule {
  /** Whether this node is the banned construct. */
  readonly holds: (node: Node) => boolean
  /** What is wrong, and what to do instead. */
  readonly why: string
}

/**
 * The name an identifier carries, when it is one.
 * @param value - the node to read.
 * @returns the name, or undefined.
 */
function identifier(value: unknown): string | undefined {
  return isNode(value) && value.type === 'Identifier' && typeof value['name'] === 'string' ? value['name'] : undefined
}

/**
 * The property a member expression names, when it is written plainly.
 * @param node - the member expression.
 * @returns the property name, or undefined.
 */
function property(node: Node): string | undefined {
  if (node.type !== 'MemberExpression' || node['computed'] === true) return undefined
  return identifier(node['property'])
}

/**
 * Whether a call goes through a plain global of the given name.
 * @param node - the node to test.
 * @param name - the global's name.
 * @returns true when the node is that call.
 */
function callsGlobal(node: Node, name: string): boolean {
  return node.type === 'CallExpression' && identifier(node['callee']) === name
}

/**
 * Whether a call goes through a named method on a named object.
 * @param node - the node to test.
 * @param host - the object's name.
 * @param methods - the method names to reject.
 * @returns true when the node is one of those calls.
 */
function callsMethod(node: Node, host: string, methods: readonly string[]): boolean {
  if (node.type !== 'CallExpression') return false
  const callee = node['callee']
  if (!isNode(callee)) return false
  const method = property(callee)
  return method !== undefined && methods.includes(method) && identifier(callee['object']) === host
}

/** Idioms the project has moved past, stated about the tree. */
const BANNED: readonly Rule[] = [
  { holds: (node) => node.type === 'VariableDeclaration' && node['kind'] === 'var', why: 'use const or let' },
  { holds: (node) => callsGlobal(node, 'require'), why: 'use ES module imports' },
  { holds: (node) => callsGlobal(node, 'eval'), why: 'eval executes text as code; call the function directly' },
  { holds: (node) => node.type === 'WithStatement', why: 'with is forbidden in strict mode; name the object' },
  {
    holds: (node) => node.type === 'AssignmentExpression' && writesMarkup(node['left']),
    why: 'use textContent, or insertAdjacentHTML with markup this repository does not author',
  },
  {
    holds: (node) => callsMethod(node, 'document', ['write', 'writeln']),
    why: 'document.write is removed from modern engines',
  },
  {
    holds: (node) => node.type === 'MemberExpression' && property(node) === 'substr',
    why: 'String.prototype.substr is deprecated; use slice',
  },
  {
    holds: (node) => node.type === 'NewExpression' && identifier(node['callee']) === 'Array',
    why: 'use an array literal or Array.from',
  },
  {
    holds: (node) => callsGlobal(node, 'escape') || callsGlobal(node, 'unescape'),
    why: 'the global escape and unescape are deprecated; use encodeURIComponent, or CSS.escape for a selector',
  },
  { holds: (node) => namesPrototype(node), why: 'use Object.getPrototypeOf or Object.create' },
  { holds: (node) => node.type === 'TSAnyKeyword', why: 'any defeats the type system; name the shape' },
  {
    holds: (node) => skipsTest(node),
    why: 'a test that is skipped, focused or expected to fail is a test that does not report',
  },
  {
    holds: (node) => node.type === 'TSNonNullExpression',
    why: 'a non-null assertion overrides the checker; narrow the value or handle the absent case',
  },
]

/** Test runners whose modifiers take a case out of the run. */
const RUNNERS = new Set(['it', 'test', 'describe'])

/** Modifiers that stop a case reporting, or stop its siblings reporting. */
const MODIFIERS = new Set(['skip', 'only', 'todo', 'failing', 'skipIf', 'todoIf'])

/**
 * Whether a node takes a test case out of the run, or takes every other case
 * out of it.
 * @param node - the node to test.
 * @returns true when it does.
 */
function skipsTest(node: Node): boolean {
  if (node.type !== 'MemberExpression') return false
  const modifier = property(node)
  if (modifier === undefined || !MODIFIERS.has(modifier)) return false
  const host = node['object']
  const name = identifier(host) ?? (isNode(host) ? identifier(host['object']) : undefined)
  return name !== undefined && RUNNERS.has(name)
}

/**
 * Whether an assignment target writes an element's markup.
 * @param target - the left-hand side.
 * @returns true when it is innerHTML or outerHTML.
 */
function writesMarkup(target: unknown): boolean {
  if (!isNode(target) || target.type !== 'MemberExpression') return false
  const name = property(target)
  return name === 'innerHTML' || name === 'outerHTML'
}

/**
 * Whether a node names the legacy prototype accessor, as a property or a key.
 * @param node - the node to test.
 * @returns true when it does.
 */
function namesPrototype(node: Node): boolean {
  const name = '__proto__'
  if (node.type === 'MemberExpression') return property(node) === name || literalKey(node['property']) === name
  if (node.type === 'Property') return identifier(node['key']) === name || literalKey(node['key']) === name
  return false
}

/**
 * The string a literal carries, when it is a string.
 * @param value - the node to read.
 * @returns the string, or undefined.
 */
function literalKey(value: unknown): string | undefined {
  return isNode(value) && value.type === 'Literal' && typeof value.value === 'string' ? value.value : undefined
}

/**
 * Every ban a script breaks.
 * @param label - the path to report offences under.
 * @param text - the file's contents.
 * @returns one offence per rejected construct.
 */
export function scanScript(label: string, text: string): Offence[] {
  const parsed = parseScript(label, text)
  const offences: Offence[] = parsed.errors.map((error) => ({
    label,
    line: 1,
    why: `this file does not parse, so it cannot be checked: ${error.message}`,
  }))
  for (const comment of parsed.comments) {
    for (const { pattern, why } of SUPPRESSIONS) {
      if (pattern.test(comment.value)) offences.push({ label, line: parsed.lineAt(comment.start), why })
    }
  }
  walk(parsed.body, (node) => {
    for (const { holds, why } of BANNED) {
      if (holds(node)) offences.push({ label, line: parsed.lineAt(node['start']), why })
    }
  })
  return offences
}

/**
 * Every suppression a file with no parser here carries.
 *
 * Rust and the configuration formats are read line by line. A directive named
 * inside one of their comments is still rejected: a directive that is merely
 * commented out is one someone is keeping.
 * @param label - the path to report offences under.
 * @param text - the file's contents.
 * @returns one offence per directive.
 */
export function scanPlain(label: string, text: string): Offence[] {
  const offences: Offence[] = []
  for (const [index, line] of text.split('\n').entries()) {
    for (const { pattern, why } of SUPPRESSIONS) {
      if (pattern.test(line)) offences.push({ label, line: index + 1, why })
    }
  }
  return offences
}

/**
 * Scan one file, choosing the reader its extension calls for.
 * @param label - the path, which also selects the reader.
 * @param text - the file's contents.
 * @returns one offence per rejected construct.
 */
export function scanSource(label: string, text: string): Offence[] {
  if (SCRIPT_EXTENSIONS.some((extension) => label.endsWith(extension))) return scanScript(label, text)
  return scanPlain(label, text)
}
