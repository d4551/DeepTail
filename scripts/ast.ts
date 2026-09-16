/**
 * The shared parse the executed gates read.
 *
 * The gates read a real parse — oxc, the parser the project's linter already
 * uses — so a construct is judged by what it is rather than by how it is spelt.
 * Babel's traverse stands beside it as the independent walker: where a gate's
 * read rests on a node shape, the second parser pins that shape to the tree
 * the language defines rather than to one parser's dialect.
 *
 * @module
 */

import { parse as babelParse, type ParserPlugin } from '@babel/parser'
import traverse from '@babel/traverse'
import * as babelTypes from '@babel/types'
import { parseSync } from 'oxc-parser'
import { lineReader } from './lines.ts'

/**
 * A value found anywhere on a parsed node.
 *
 * The tree is walked structurally, so every property a node carries is one of
 * these; nothing the gates read is left untyped. A parser also emits plain
 * records that are not nodes — a template element's text is one — so a record
 * shape is here alongside the node it is read from.
 */
export type Field = null | boolean | number | string | Node | readonly Field[] | Record

/** A parser record that is not a node, such as a template element's text. */
export type Record = { readonly [key: string]: Field }

/** A parsed node, walked structurally rather than by declared shape. */
export type Node = { readonly [key: string]: Field } & { readonly type: string }

/** One comment, which is the only form a checker directive ever takes. */
export interface Comment {
  /** The comment's text, without its delimiters. */
  readonly value: string
  /** Byte offset the comment starts at. */
  readonly start: number
  /** Byte offset just past the comment's closing delimiter. */
  readonly end: number
}

/** A parsed file: its syntax tree, its comments, and its line lookup. */
export interface Parsed {
  /** The program body. */
  readonly body: readonly Node[]
  /** Every comment in the file. */
  readonly comments: readonly Comment[]
  /** Errors that stopped the parse; the list is empty when the parse is whole. */
  readonly errors: readonly { readonly message: string }[]
  /** The line a byte offset falls on, one-based. */
  readonly lineAt: (offset: Field | undefined) => number
}

/**
 * Whether a value is a node the walk should descend into.
 *
 * Takes anything, because the parser's own statements arrive typed by the
 * parser and every other value arrives off a node: one predicate answers for
 * both, and neither is claimed to be a node without being read as one.
 * @param value - any value found on a parent node, or off the parser.
 * @returns true when it carries a node type.
 */
export function isNode(value: unknown): value is Node {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    !Array.isArray(value) &&
    typeof value.type === 'string'
  )
}

/** The values that carry properties under string keys. */
type Holder = Node | Record

/**
 * Whether a value carries properties under string keys.
 *
 * An array has keys of its own kind, not of a holder's, and a type predicate
 * is what rules it out of the narrowed type: `Array.isArray` alone does not,
 * because its guard speaks of arrays, not of the readonly arrays this tree
 * carries.
 * @param value - the value to judge.
 * @returns true when the value is a node or a parser record.
 */
function isHolder(value: Field | undefined): value is Holder {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * The nodes one field holds, when it holds a list of them.
 *
 * A field is a list of anything the model admits, so a walk that wants the
 * child nodes under a key reads them here rather than claiming the list is
 * one: a member that is not a node is not a child to descend into.
 * @param value - the node or record to read.
 * @param key - the field.
 * @returns the nodes, in the order the field holds them.
 */
export function nodesAt(value: Field | undefined, key: string): readonly Node[] {
  const field = fieldOf(value, key)
  return Array.isArray(field) ? field.flatMap((item) => (isNode(item) ? [item] : [])) : []
}

/**
 * The node one field holds, when it holds one.
 * @param value - the node or record to read.
 * @param key - the field.
 * @returns the node, or undefined.
 */
export function nodeAt(value: Field | undefined, key: string): Node | undefined {
  const field = fieldOf(value, key)
  return isNode(field) ? field : undefined
}

/**
 * The value a node or parser record carries under a key, when there is one.
 *
 * The parser emits some values as plain records rather than nodes — a template
 * element's text has no `type` of its own — so the holder is only required to
 * be an object that has the key.
 * @param value - the node or record to read, or any value found on one.
 * @param key - the property to read.
 * @returns the value, or null when it is absent or the holder has no keys.
 */
export function fieldOf(value: Field | undefined, key: string): Field {
  if (!isHolder(value)) return null
  return value[key] ?? null
}

/**
 * Visit every node below a root, parents before children.
 * @param root - the node, or array of nodes, to start from.
 * @param visit - called once per node.
 */
export function walk(root: Field | undefined, visit: (node: Node) => void): void {
  if (Array.isArray(root)) {
    for (const item of root) walk(item, visit)
    return
  }
  if (!isNode(root)) return
  visit(root)
  for (const [key, value] of Object.entries(root)) {
    if (key !== 'type') walk(value, visit)
  }
}

/** Node types that change nothing about the value they hold. */
const TRANSPARENT = new Set([
  'ParenthesizedExpression',
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSNonNullExpression',
  'TSInstantiationExpression',
])

/**
 * The expression inside any number of nodes that do not change it.
 * @param value - the node to read.
 * @returns the innermost expression, or the value unchanged.
 */
export function unwrap(value: Field | undefined): Field | undefined {
  let inner = value
  // Bounded so a tree that somehow refers to itself cannot spin here.
  for (let depth = 0; depth < 32; depth += 1) {
    if (!isNode(inner) || !TRANSPARENT.has(inner.type)) return inner
    inner = inner['expression']
  }
  return inner
}

/**
 * The property name a member expression reads, when it is written plainly.
 * @param node - the member expression, or any value found where one may be.
 * @returns the name, or undefined when it is computed or not an identifier.
 */
export function memberName(node: Field | undefined): string | undefined {
  if (fieldOf(node, 'computed') === true) return undefined
  const property = unwrap(fieldOf(node, 'property'))
  return isNode(property) && property.type === 'Identifier' && typeof property['name'] === 'string'
    ? property['name']
    : undefined
}

/**
 * Parse one script, keeping everything the gates read off it.
 * @param label - the path, which selects the dialect.
 * @param text - the file's contents.
 * @returns the tree, the comments, the errors and the line lookup.
 */
export function parseScript(label: string, text: string): Parsed {
  const parsed = parseSync(label, text)
  const at = lineReader(text)
  return {
    // Read as nodes rather than claimed to be them: the parser types its
    // statements its own way, and what the gates walk is the structure.
    body: parsed.program.body.flatMap((statement) => (isNode(statement) ? [statement] : [])),
    comments: parsed.comments,
    errors: parsed.errors,
    lineAt: (offset: Field | undefined) => (typeof offset === 'number' ? at(offset) : 1),
  }
}

/** The names a walk of the oxc tree sees defined, by function declaration. */
export function oxcDefinedNames(parsed: Parsed): Set<string> {
  const names = new Set<string>()
  walk(parsed.body, (node) => {
    if (node.type !== 'FunctionDeclaration') return
    const name = fieldOf(nodeAt(node, 'id'), 'name')
    if (typeof name === 'string') names.add(name)
  })
  return names
}

/** The names a walk of the oxc tree sees called, by plain callee. */
export function oxcCallNames(parsed: Parsed): Set<string> {
  const names = new Set<string>()
  walk(parsed.body, (node) => {
    if (node.type !== 'CallExpression') return
    const callee = nodeAt(node, 'callee')
    if (callee === undefined || callee.type !== 'Identifier') return
    const name = fieldOf(callee, 'name')
    if (typeof name === 'string') names.add(name)
  })
  return names
}

/** The Babel parse of one script: the tree the independent walker descends. */
export interface BabelParsed {
  /** The parsed file, typed by the validator package the walker reads. */
  readonly file: babelTypes.File
  /** What the parser recovered rather than refused, by message. */
  readonly errors: readonly string[]
}

/** The plugins each dialect is parsed with, longest suffix first. */
const BABEL_DIALECTS: readonly (readonly [suffix: string, plugins: readonly ParserPlugin[]])[] = [
  ['.tsx', ['typescript', 'jsx']],
  ['.mts', ['typescript']],
  ['.cts', ['typescript']],
  ['.ts', ['typescript']],
  ['.jsx', ['jsx']],
  ['.mjs', []],
  ['.js', []],
]

/**
 * Parse one script the way Babel reads it, for the walker to descend.
 * @param label - the path, whose suffix selects the dialect plugins.
 * @param text - the file's contents.
 * @returns the file node and whatever the parser recovered.
 */
export function parseScriptWithBabel(label: string, text: string): BabelParsed {
  const plugins = BABEL_DIALECTS.find(([suffix]) => label.endsWith(suffix))?.[1] ?? []
  const file = babelParse(text, { sourceType: 'module', plugins: [...plugins], errorRecovery: true })
  return { file, errors: file.errors.map((error) => error.message) }
}

/** The names the Babel walker sees defined, by function declaration. */
export function babelDefinedNames(parsed: BabelParsed): Set<string> {
  const names = new Set<string>()
  traverse(parsed.file, {
    FunctionDeclaration(path) {
      const id = path.node.id
      if (id !== null && id !== undefined) names.add(id.name)
    },
  })
  return names
}

/** The names the Babel walker sees called, by plain callee. */
export function babelCallNames(parsed: BabelParsed): Set<string> {
  const names = new Set<string>()
  traverse(parsed.file, {
    CallExpression(path) {
      const callee = path.node.callee
      if (babelTypes.isIdentifier(callee)) names.add(callee.name)
    },
  })
  return names
}
