/**
 * The shared parse the executed gates read.
 *
 * Both gates used to read source as lines, and both were bypassable the same
 * way: a line-by-line reader has to guess which lines are comments, which are
 * prose and which are its own rule table, and every guess is a way through.
 * They read a real parse now — oxc, the parser the project's linter already
 * uses — so a construct is judged by what it is rather than by how it is spelt.
 *
 * @module
 */

import { parseSync } from 'oxc-parser'

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
}

/** A parsed file: its syntax tree, its comments, and its line lookup. */
export interface Parsed {
  /** The program body. */
  readonly body: readonly Node[]
  /** Every comment in the file. */
  readonly comments: readonly Comment[]
  /** Errors that stopped the parse, if any. */
  readonly errors: readonly { readonly message: string }[]
  /** The line a byte offset falls on, one-based. */
  readonly lineAt: (offset: Field | undefined) => number
}

/**
 * Whether a value is a node the walk should descend into.
 * @param value - any value found on a parent node.
 * @returns true when it carries a node type.
 */
export function isNode(value: Field | undefined): value is Node {
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
 *
 * oxc keeps parentheses in the tree, and a type assertion is a node of its
 * own, so a rule written about what such a node holds would see the node
 * itself instead: one pair of brackets was enough to hide a call from every
 * rule here.
 * @param value - the node to read.
 * @returns the innermost expression, or the value unchanged.
 */
export function unwrap(value: Field | undefined): Field | undefined {
  let inner = value
  // Bounded so a tree that somehow refers to itself cannot spin here.
  for (let depth = 0; depth < 32; depth += 1) {
    if (!isNode(inner) || !TRANSPARENT.has(inner.type)) return inner
    inner = inner.expression
  }
  return inner
}

/**
 * The property name a member expression reads, when it is written plainly.
 * @param node - the member expression.
 * @returns the name, or undefined when it is computed or not an identifier.
 */
export function memberName(node: Node): string | undefined {
  if (node.computed === true) return undefined
  const property = unwrap(node.property)
  return isNode(property) && property.type === 'Identifier' && typeof property.name === 'string'
    ? property.name
    : undefined
}

/**
 * A reader that turns a byte offset into a line number.
 * @param text - the whole file.
 * @returns the reader.
 */
export function lineReader(text: string): (offset: Field | undefined) => number {
  const starts = [0]
  for (const [index, character] of [...text].entries()) {
    if (character === '\n') starts.push(index + 1)
  }
  return (offset) => {
    if (typeof offset !== 'number') return 1
    let low = 0
    let high = starts.length - 1
    while (low < high) {
      const middle = Math.ceil((low + high) / 2)
      if ((starts[middle] ?? 0) <= offset) low = middle
      else high = middle - 1
    }
    return low + 1
  }
}

/**
 * Read one of the parser's interface-typed statements as the structural node
 * the gates walk.
 *
 * oxc states its tree as a fixed family of interfaces while the gates read it
 * structurally, so at this single boundary the parser's plain object graph is
 * handed over whole rather than re-described node by node.
 * @param value - the statement, as the parser types it.
 * @returns the same object, as the walk reads it.
 */
function asNode(value: object): Node {
  return value as Node
}

/**
 * Parse one script, keeping everything the gates read off it.
 * @param label - the path, which selects the dialect.
 * @param text - the file's contents.
 * @returns the tree, the comments, the errors and the line lookup.
 */
export function parseScript(label: string, text: string): Parsed {
  const parsed = parseSync(label, text)
  return {
    body: parsed.program.body.map(asNode),
    comments: parsed.comments,
    errors: parsed.errors,
    lineAt: lineReader(text),
  }
}
