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

/** A parsed node, walked structurally rather than by declared shape. */
export type Node = Record<string, unknown> & { readonly type: string }

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
  readonly body: unknown
  /** Every comment in the file. */
  readonly comments: readonly Comment[]
  /** Errors that stopped the parse, if any. */
  readonly errors: readonly { readonly message: string }[]
  /** The line a byte offset falls on, one-based. */
  readonly lineAt: (offset: unknown) => number
}

/**
 * Whether a value is a node the walk should descend into.
 * @param value - any value found on a parent node.
 * @returns true when it carries a node type.
 */
export function isNode(value: unknown): value is Node {
  return typeof value === 'object' && value !== null && typeof (value as { type?: unknown }).type === 'string'
}

/**
 * Visit every node below a root, parents before children.
 * @param root - the node, or array of nodes, to start from.
 * @param visit - called once per node.
 */
export function walk(root: unknown, visit: (node: Node) => void): void {
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

/** Wrappers that change nothing about the value inside them. */
const TRANSPARENT = new Set([
  'ParenthesizedExpression',
  'TSAsExpression',
  'TSSatisfiesExpression',
  'TSNonNullExpression',
  'TSInstantiationExpression',
])

/**
 * The expression inside any number of wrappers that do not change it.
 *
 * oxc keeps parentheses in the tree, and a type assertion is a node of its own,
 * so a rule written about what it wraps sees the wrapper instead: one pair of
 * brackets was enough to hide a call from every rule here.
 * @param value - the node to unwrap.
 * @returns the innermost expression, or the value unchanged.
 */
export function unwrap(value: unknown): unknown {
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
 * @param node - the member expression.
 * @returns the name, or undefined when it is computed or not an identifier.
 */
export function memberName(node: Node): string | undefined {
  if (node['computed'] === true) return undefined
  const property = unwrap(node['property'])
  return isNode(property) && property.type === 'Identifier' && typeof property['name'] === 'string'
    ? property['name']
    : undefined
}

/**
 * A reader that turns a byte offset into a line number.
 * @param text - the whole file.
 * @returns the reader.
 */
export function lineReader(text: string): (offset: unknown) => number {
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
 * Parse one script, keeping everything the gates read off it.
 * @param label - the path, which selects the dialect.
 * @param text - the file's contents.
 * @returns the tree, the comments, the errors and the line lookup.
 */
export function parseScript(label: string, text: string): Parsed {
  const parsed = parseSync(label, text)
  return {
    body: parsed.program.body,
    comments: parsed.comments,
    errors: parsed.errors,
    lineAt: lineReader(text),
  }
}
