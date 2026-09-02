/**
 * The bans on idioms the frameworks this product uses removed.
 *
 * React 19 deleted `ReactDOM.render` and its siblings, `findDOMNode`, string
 * refs, `defaultProps` and legacy context; Tauri 2 moved the API out of the
 * v1 module paths and off the `__TAURI__` global. A source that revives one of
 * them still builds — nothing at runtime stops a removed import from being
 * written — so they are banned here, read off the same parse as every other
 * rule.
 *
 * @module
 */

import { isNode, type Node } from './ast.ts'
import { callsGlobal, callsMethod, type Names, property, type Rule } from './rule-helpers.ts'

/** React DOM entry points removed in React 19, replaced by createRoot and refs. */
const REACT_REMOVED_CALLS = new Set(['render', 'hydrate', 'unmountComponentAtNode', 'findDOMNode'])

/** The Tauri v1 API paths, which the v2 core module and plugins replaced. */
const TAURI_V1_PATHS = [
  '@tauri-apps/api/tauri',
  '@tauri-apps/api/helpers',
  '@tauri-apps/api/notification',
  '@tauri-apps/api/updater',
  '@tauri-apps/api/dialog',
  '@tauri-apps/api/fs',
  '@tauri-apps/api/http',
  '@tauri-apps/api/clipboard',
  '@tauri-apps/api/shell',
  '@tauri-apps/api/process',
  '@tauri-apps/api/globalShortcut',
  '@tauri-apps/api/os',
] as const

/**
 * Whether a JSX attribute is a string ref, the React pre-19 spelling.
 * @param node - the attribute.
 * @returns true when it is `ref="name"`.
 */
function stringRef(node: Node): boolean {
  if (node.type !== 'JSXAttribute') return false
  const name = node.name
  if (!isNode(name) || name.type !== 'Identifier' || name.name !== 'ref') return false
  const value = node.value
  return isNode(value) && value.type === 'Literal' && typeof value.value === 'string'
}

/**
 * Whether an import names a Tauri v1 API path.
 * @param node - the import declaration.
 * @returns true when its source is one of the v1 modules.
 */
function v1TauriImport(node: Node): boolean {
  if (node.type !== 'ImportDeclaration') return false
  const source = node.source
  if (!isNode(source) || source.type !== 'Literal' || typeof source.value !== 'string') return false
  return TAURI_V1_PATHS.some((path) => source.value === path || source.value.startsWith(`${path}/`))
}

/** A member that names the wanted property, read through renames. */
function namesMember(node: Node, wanted: string, names: Names): boolean {
  return node.type === 'MemberExpression' && property(node, names) === wanted
}

/** Idioms React 19 and Tauri 2 removed, stated about the tree. */
export const LEGACY_RULES: readonly Rule[] = [
  {
    holds: (node, names) => callsMethod(node, 'ReactDOM', [...REACT_REMOVED_CALLS], names),
    why: 'ReactDOM render and its siblings were removed in React 19; use createRoot and refs',
  },
  {
    holds: (node, names) => callsGlobal(node, 'findDOMNode', names),
    why: 'findDOMNode was removed in React 19; use a ref',
  },
  {
    holds: (node, names) => namesMember(node, 'defaultProps', names),
    why: 'defaultProps on a component was removed in React 19; use default parameters',
  },
  {
    holds: (node, names) =>
      namesMember(node, 'childContextTypes', names) || namesMember(node, 'getChildContext', names),
    why: 'legacy context was removed in React 19; use the Context API',
  },
  { holds: (node) => stringRef(node), why: 'a string ref was removed in React 19; use a ref object or callback' },
  {
    holds: (node) => v1TauriImport(node),
    why: 'this is a Tauri v1 API path; use @tauri-apps/api/core or the v2 plugin',
  },
  {
    holds: (node, names) => node.type === 'MemberExpression' && property(node, names) === '__TAURI__',
    why: 'the __TAURI__ global is the Tauri v1 API; use invoke from @tauri-apps/api/core',
  },
]
