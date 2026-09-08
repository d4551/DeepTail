/**
 * The names a piece of source reaches for but does not bring with it.
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

import { type Field, fieldOf, isNode, type Node, nodeOr, nodesOf, parseScript } from './ast.ts'

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
 * Bind every name one variable declaration introduces.
 *
 * The same walk answers a `var` swept up by the hoist and a `let` or `const`
 * declared in a block: a declaration binds its declarators' patterns whichever
 * scope it lands in, and it was written out twice.
 * @param node - the VariableDeclaration.
 * @param into - the scope to bind them in.
 */
function declareVariableNames(node: Node, into: Set<string>): void {
  for (const declarator of nodesOf(fieldOf(node, 'declarations'))) declarePattern(fieldOf(declarator, 'id'), into)
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
  // A function declaration is function-like, so the branch above is the only
  // one that ever sees one. A second binding of the same id stood after it and
  // could not be reached: `FUNCTION_LIKE` holds `FunctionDeclaration`, so the
  // return had already been taken.
  if (FUNCTION_LIKE.has(node.type)) {
    if (node.type === 'FunctionDeclaration') declarePattern(node.id, into)
    return
  }
  if (node.type === 'VariableDeclaration' && node.kind === 'var') declareVariableNames(node, into)
  for (const [key, child] of Object.entries(node)) {
    if (key !== 'type') hoistVars(child, into)
  }
}

/**
 * The declaration an export statement wraps, or the statement itself.
 * @param statement - the statement.
 * @returns what actually declares a name.
 */
function declaring(statement: Node): Node {
  return statement.type === 'ExportNamedDeclaration' || statement.type === 'ExportDefaultDeclaration'
    ? nodeOr(fieldOf(statement, 'declaration'), statement)
    : statement
}

/**
 * Bind everything one statement declares directly in its own scope.
 * @param node - the statement, already unwrapped from any export around it.
 * @param into - the scope to bind them in.
 */
function declareStatement(node: Node, into: Set<string>): void {
  if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') declarePattern(node.id, into)
  if (node.type === 'VariableDeclaration') declareVariableNames(node, into)
  if (node.type === 'ImportDeclaration') {
    for (const specifier of nodesOf(fieldOf(node, 'specifiers'))) declarePattern(fieldOf(specifier, 'local'), into)
  }
}

/**
 * Bind everything one statement list declares directly in its own scope.
 * @param statements - the list.
 * @param into - the scope to bind them in.
 */
function declareStatements(statements: readonly Node[], into: Set<string>): void {
  for (const statement of statements) declareStatement(declaring(statement), into)
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
  if (isFunction) declareFunctionNames(node, names)
  if (node.type === 'CatchClause') declarePattern(fieldOf(node, 'param'), names)
  if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') declarePattern(fieldOf(node, 'id'), names)
  for (const key of ['body', 'init', 'left', 'cases']) declareFieldNames(fieldOf(node, key), names)
  return scope
}

/**
 * Bind what a function brings with it: its own name, its parameters, and every
 * `var` and function declaration hoisted out of its body.
 * @param node - the function node.
 * @param names - the scope being opened.
 */
function declareFunctionNames(node: Node, names: Set<string>): void {
  declarePattern(fieldOf(node, 'id'), names)
  for (const param of nodesOf(fieldOf(node, 'params'))) declarePattern(param, names)
  hoistVars(fieldOf(node, 'body'), names)
}

/**
 * Bind what one field of a scope-opening node declares.
 *
 * A field is a statement list, a block holding one, a bare declaration — a
 * `for` head's `init` — or a list of switch cases, and each of those declares
 * into the scope the node opened.
 * @param field - the field's value.
 * @param names - the scope being opened.
 */
function declareFieldNames(field: Field | undefined, names: Set<string>): void {
  declareStatements(Array.isArray(field) ? nodesOf(field) : nodesOf(fieldOf(field, 'body')), names)
  if (isNode(field) && field.type === 'VariableDeclaration') declareStatements([field], names)
  if (!Array.isArray(field)) return
  for (const item of field) if (isNode(item) && item.type === 'SwitchCase') declareStatements(itemBody(item), names)
}

/**
 * The statements one switch case holds.
 * @param node - the case.
 * @returns its consequent statements.
 */
function itemBody(node: Node): readonly Node[] {
  return nodesOf(fieldOf(node, 'consequent'))
}

/**
 * Every child node a node holds, each with the field it was read from.
 *
 * The field name is carried alongside, because whether an identifier is a
 * reference at all is a question about which slot of its parent it sits in.
 * @param node - the parent.
 * @returns the field name and the child, in the order the fields are written.
 */
function childEntries(node: Node): (readonly [string, Node])[] {
  const found: (readonly [string, Node])[] = []
  for (const [key, child] of Object.entries(node)) {
    if (key === 'type') continue
    for (const item of Array.isArray(child) ? child : [child]) if (isNode(item)) found.push([key, item])
  }
  return found
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
    for (const [childKey, child] of childEntries(node)) visit(child, node, childKey, inner)
  }
  for (const statement of parsed.body) visit(statement, undefined, 'body', top)
  return [...free].toSorted()
}
