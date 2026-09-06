/**
 * The names a piece of source reaches for but does not bring with it.
 *
 * Two of this repository's suites hand their checks to a browser as *source
 * text*: the structural checks and the scripted Tauri IPC are both stringified
 * and evaluated in the page. A function moved into another module keeps
 * compiling and keeps type-checking — the import is still there, for the
 * module — while the text that arrives in the page names something the page has
 * not got. What follows is a `ReferenceError` thrown deep inside a callback,
 * which in one case silenced every structural check on the page and in another
 * hydrated the capability ledger to empty, both without a single red test.
 *
 * A name is free when nothing in the source binds it, so the reader here is a
 * scope walk rather than a search: parameters, declarations, catch bindings,
 * class and function names all bind, while a property name, a label and an
 * import's remote name are not references at all. What is left is what the
 * evaluating realm has to supply, and the caller is what decides whether it
 * does — the page's own globals, for injected source.
 *
 * @module
 */

import { type Field, fieldOf, isNode, type Node, parseScript } from './ast.ts'

/** One lexical scope, and the names it binds. */
interface Scope {
  /** Whether this scope holds `var` and hoisted function declarations. */
  readonly holdsVars: boolean
  readonly names: Set<string>
  readonly parent?: Scope
}

/** Node types that open a scope holding `var` declarations. */
const FUNCTION_LIKE = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'])

/** Node types that open a block scope. */
const BLOCK_LIKE = new Set([
  'BlockStatement',
  'StaticBlock',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'CatchClause',
  'SwitchStatement',
  'ClassDeclaration',
  'ClassExpression',
])

/**
 * Whether an identifier in this slot of its parent is a reference to a binding.
 *
 * A property name, a label and an import's remote name are spelt as
 * identifiers and name nothing in scope; everything else an identifier is
 * written as reads a binding, including the declaration ids, which read the
 * binding they themselves make.
 * @param parent - the node the identifier hangs off, or undefined when the
 * identifier is the whole expression.
 * @param key - the property of the parent the identifier sits under.
 * @returns true when the identifier reads a binding.
 */
function isReference(parent: Node | undefined, key: string): boolean {
  if (parent === undefined) return true
  const computed = fieldOf(parent, 'computed') === true
  switch (parent.type) {
    case 'MemberExpression':
      return key !== 'property' || computed
    case 'Property':
    case 'PropertyDefinition':
    case 'MethodDefinition':
    case 'AccessorProperty':
      return key !== 'key' || computed
    case 'LabeledStatement':
    case 'BreakStatement':
    case 'ContinueStatement':
      return key !== 'label'
    case 'ImportSpecifier':
      return key !== 'imported'
    case 'ExportSpecifier':
      return key !== 'exported' && key !== 'local'
    case 'MetaProperty':
      return false
    default:
      return true
  }
}

/**
 * Bind every name a binding pattern introduces.
 * @param pattern - an identifier, or any destructuring pattern around one.
 * @param into - the scope to bind them in.
 */
function declarePattern(pattern: Field | undefined, into: Set<string>): void {
  if (Array.isArray(pattern)) {
    for (const item of pattern) declarePattern(item, into)
    return
  }
  if (!isNode(pattern)) return
  const node = pattern
  if (node.type === 'Identifier' && typeof node.name === 'string') {
    into.add(node.name)
    return
  }
  for (const key of ['properties', 'elements', 'value', 'left', 'argument']) declarePattern(fieldOf(node, key), into)
}

/**
 * Bind the `var` and function declarations anywhere below a node, without
 * descending into a nested function, which holds its own.
 * @param value - the node or list to sweep.
 * @param into - the function scope to bind them in.
 */
function hoistVars(value: Field | undefined, into: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) hoistVars(item, into)
    return
  }
  if (!isNode(value)) return
  const node = value
  if (FUNCTION_LIKE.has(node.type)) {
    // Its name is hoisted into the scope holding it; its body is not.
    if (node.type === 'FunctionDeclaration') declarePattern(node.id, into)
    return
  }
  if (node.type === 'VariableDeclaration' && node.kind === 'var') {
    for (const declarator of (fieldOf(node, 'declarations') as readonly Node[] | null) ?? []) {
      declarePattern(fieldOf(declarator, 'id'), into)
    }
  }
  if (node.type === 'FunctionDeclaration') declarePattern(node.id, into)
  for (const [key, child] of Object.entries(node)) {
    if (key !== 'type') hoistVars(child, into)
  }
}

/**
 * Bind everything one statement list declares directly in its own scope.
 * @param statements - the list.
 * @param into - the scope to bind them in.
 */
function declareStatements(statements: readonly Node[], into: Set<string>): void {
  for (const statement of statements) {
    const node =
      statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration'
        ? ((fieldOf(statement, 'declaration') as Node | null) ?? statement)
        : statement
    if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') declarePattern(node.id, into)
    if (node.type === 'VariableDeclaration') {
      for (const declarator of (fieldOf(node, 'declarations') as readonly Node[] | null) ?? []) {
        declarePattern(fieldOf(declarator, 'id'), into)
      }
    }
    if (node.type === 'ImportDeclaration') {
      for (const specifier of (fieldOf(node, 'specifiers') as readonly Node[] | null) ?? []) {
        declarePattern(fieldOf(specifier, 'local'), into)
      }
    }
  }
}

/**
 * Open the scope a node introduces, with everything it binds already in it.
 * @param node - the node being entered.
 * @param parent - the scope it sits in.
 * @returns the new scope, or the parent when the node opens none.
 */
function scopeFor(node: Node, parent: Scope): Scope {
  const isFunction = FUNCTION_LIKE.has(node.type)
  if (!isFunction && !BLOCK_LIKE.has(node.type)) return parent
  const names = new Set<string>()
  const scope: Scope = { holdsVars: isFunction, names, parent }
  if (isFunction) {
    declarePattern(fieldOf(node, 'id'), names)
    for (const param of (fieldOf(node, 'params') as readonly Node[] | null) ?? []) declarePattern(param, names)
    hoistVars(fieldOf(node, 'body'), names)
  }
  if (node.type === 'CatchClause') declarePattern(fieldOf(node, 'param'), names)
  if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') declarePattern(fieldOf(node, 'id'), names)
  for (const key of ['body', 'init', 'left', 'cases']) {
    const field = fieldOf(node, key)
    const statements = Array.isArray(field) ? field : ((fieldOf(field, 'body') as readonly Node[] | null) ?? [])
    if (Array.isArray(statements)) declareStatements(statements as readonly Node[], names)
    if (isNode(field) && field.type === 'VariableDeclaration') declareStatements([field], names)
    if (Array.isArray(field)) {
      for (const item of field) if (isNode(item) && item.type === 'SwitchCase') declareStatements(itemBody(item), names)
    }
  }
  return scope
}

/**
 * The statements one switch case holds.
 * @param node - the case.
 * @returns its consequent statements.
 */
function itemBody(node: Node): readonly Node[] {
  const consequent = fieldOf(node, 'consequent')
  return Array.isArray(consequent) ? (consequent as readonly Node[]) : []
}

/**
 * Whether any scope in the chain binds a name.
 * @param scope - the innermost scope.
 * @param name - the name to look for.
 * @returns true when something binds it.
 */
function bound(scope: Scope | undefined, name: string): boolean {
  for (let current = scope; current !== undefined; current = current.parent) {
    if (current.names.has(name)) return true
  }
  return false
}

/**
 * Every name a source reads without binding it.
 * @param label - a path, which selects the dialect the source is parsed as.
 * @param text - the source.
 * @returns the free names, sorted, each reported once.
 */
export function freeNames(label: string, text: string): string[] {
  const parsed = parseScript(label, text)
  if (parsed.errors.length > 0) return [`this source does not parse: ${parsed.errors[0]?.message ?? ''}`]
  const top: Scope = { holdsVars: true, names: new Set<string>() }
  declareStatements(parsed.body, top.names)
  hoistVars(parsed.body, top.names)
  const free = new Set<string>()
  const visit = (node: Node, parent: Node | undefined, key: string, scope: Scope): void => {
    if (node.type === 'Identifier' && typeof node.name === 'string') {
      if (isReference(parent, key) && !bound(scope, node.name)) free.add(node.name)
      return
    }
    const inner = scopeFor(node, scope)
    for (const [childKey, child] of Object.entries(node)) {
      if (childKey === 'type') continue
      const items = Array.isArray(child) ? child : [child]
      for (const item of items) if (isNode(item)) visit(item, node, childKey, inner)
    }
  }
  for (const statement of parsed.body) visit(statement, undefined, 'body', top)
  return [...free].toSorted()
}
