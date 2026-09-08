/**
 * The shared parse the executed gates read.
 *
 * The gates read a real parse — oxc, the parser the project's linter already
 * uses — so a construct is judged by what it is rather than by how it is spelt.
 *
 * @module
 */

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

/**
 * A parsed node, walked structurally rather than by declared shape.
 *
 * The properties the gates read are declared here as well, so a reader can
 * address them plainly; the index signature stays, because a gate must also
 * read whatever the parser emits beyond those it names.
 */
export type Node = { readonly [key: string]: Field } & {
  readonly type: string
  readonly arguments?: Field
  readonly body?: Field
  readonly callee?: Field
  readonly cases?: Field
  readonly computed?: Field
  readonly consequent?: Field
  readonly declarations?: Field
  readonly elements?: Field
  readonly expression?: Field
  readonly expressions?: Field
  readonly id?: Field
  readonly imported?: Field
  readonly init?: Field
  readonly key?: Field
  readonly kind?: Field
  readonly left?: Field
  readonly local?: Field
  readonly name?: Field
  readonly object?: Field
  readonly operator?: Field
  readonly param?: Field
  readonly params?: Field
  readonly properties?: Field
  readonly property?: Field
  readonly quasis?: Field
  readonly right?: Field
  readonly source?: Field
  readonly specifiers?: Field
  readonly start?: Field
  readonly test?: Field
  readonly value?: Field
}

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
 * The parameter admits a plain object as well as a field found on a parent,
 * because the parser hands its statements out as interface-typed values that
 * carry no index signature. Widening it here is what lets the entry point
 * below check a statement rather than assert it into the structural shape the
 * gates walk.
 * @param value - any value found on a parent node, or one the parser returned.
 * @returns true when it carries a node type.
 */
export function isNode(value: Field | object | undefined): value is Node {
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
 * The nodes one field holds, when it holds a list of them.
 *
 * A field is whatever the parser put there, so the list is filtered rather
 * than asserted: a declarations array carrying anything but nodes yields the
 * nodes it does carry, and a field that is not a list at all yields none.
 * @param value - the field to read.
 * @returns the nodes, in the order the field holds them.
 */
export function nodesOf(value: Field | undefined): readonly Node[] {
  return Array.isArray(value) ? value.filter((one) => isNode(one)) : []
}

/**
 * One field read as a node, or the node given when it does not hold one.
 * @param value - the field to read.
 * @param instead - the node to answer with when the field holds none.
 * @returns the field's node, or the one given.
 */
export function nodeOr(value: Field | undefined, instead: Node): Node {
  return isNode(value) ? value : instead
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
 * Read one of the parser's interface-typed statements as the structural node
 * the gates walk.
 *
 * Checked rather than asserted. A statement carrying no `type` is not one the
 * walk can read, and asserting it into the shape put a value the gates cannot
 * address at the head of the tree — where every rule would then read
 * `undefined` from it and find nothing to refuse.
 * @param value - the statement, as the parser types it.
 * @param label - the path, named when a statement cannot be read.
 * @returns the same object, as the walk reads it.
 * @throws Error when the parser handed out a statement carrying no type.
 */
function asNode(value: object, label: string): Node {
  if (!isNode(value)) throw new Error(`${label}: the parser produced a statement with no type`)
  return value
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
    body: parsed.program.body.map((statement) => asNode(statement, label)),
    comments: parsed.comments,
    errors: parsed.errors,
    lineAt: (offset: Field | undefined) => (typeof offset === 'number' ? at(offset) : 1),
  }
}
