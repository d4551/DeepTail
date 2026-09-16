/**
 * The face the installed Vite declares.
 *
 * Two things are read out of the installed bundler rather than stated by hand:
 * the stylesheet suffixes it compiles, from its own runtime, and the config keys
 * it marks `@deprecated` plus the preprocessors it loads options for, from its
 * own declarations. An upgrade moves what is refused with it, and a name that
 * could only have come from memory is caught by the cases that drive these.
 *
 * @module
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fieldOf, isNode, type Node, nodeAt, nodesAt, parseScript, unwrap, walk } from '../scripts/ast.ts'
import { interfaceMembers } from '../scripts/declaration-reader.ts'
import type { Offence } from '../scripts/offence.ts'
import { ROOT } from '../scripts/source-tree.ts'
import { objectKey } from './stack-policy.ts'

/** Where the installed Vite keeps everything it ships. */
const VITE_DIST = `${ROOT}apps/deeptail/node_modules/vite/dist/node`

/**
 * What the installed Vite ships, filtered to the files a reader is for.
 * @param suffix - the file kind to read.
 * @returns the files' text, joined.
 */
export function installedVite(suffix: string): string {
  const paths = readdirSync(VITE_DIST, { recursive: true, encoding: 'utf8' }).filter((path) => path.endsWith(suffix))
  return paths.map((path) => readFileSync(join(VITE_DIST, path), 'utf8')).join('\n')
}

/** The pattern in the installed bundler that names every stylesheet it compiles. */
const SHEET_DIALECTS = /[a-z|]*(?:css\|less\|sass\|scss\|styl\|stylus\|pcss\|postcss\|sss)[a-z|]*/u

/**
 * The stylesheet extensions the installed Vite compiles, `.css` aside.
 *
 * Read from Vite's own runtime, which is where the list of dialects it handles
 * is written: its stylesheet pattern is the one place a dialect would have to
 * be added for Vite to compile it. A runtime that states no pattern throws, so
 * an upgrade that moves it fails here rather than quietly refusing nothing.
 * @param viteRuntime - the installed Vite's own text.
 * @returns the dialect suffixes, in the order Vite names them.
 */
export function viteDialectSuffixes(viteRuntime: string): string[] {
  const found = SHEET_DIALECTS.exec(viteRuntime)
  if (found === null) throw new Error('the installed Vite states no stylesheet extension list')
  return found[0]
    .split('|')
    .filter((extension) => extension !== 'css')
    .map((extension) => `.${extension}`)
}

/** The interface Vite documents the whole config as. */
const USER_CONFIG = 'UserConfig'

/** The interface Vite documents its CSS options as. */
const CSS_OPTIONS = 'CSSOptions'

/** The Vite CSS member that turns a preprocessor on. */
const PREPROCESSOR_OPTIONS = 'preprocessorOptions'

/**
 * The config key paths the installed Vite marks `@deprecated`, followed from
 * `UserConfig`: a member whose type names another declaration is walked into,
 * so the deprecated `rollupOptions` under `build` is read at
 * `build.rollupOptions`, the path a config states it at.
 * @param declarations - the installed Vite's declarations.
 * @returns config key path to what the marker said.
 */
export function viteSupersededKeys(declarations: string): Map<string, string> {
  const interfaces = interfaceMembers(declarations)
  const superseded = new Map<string, string>()
  const follow = (declaration: string, prefix: string, step: number): void => {
    if (step > 2) return
    const declared = interfaces.get(declaration)
    if (declared === undefined) return
    for (const [path, member] of declared) {
      const stated = prefix === '' ? path : `${prefix}.${path}`
      if (member.deprecated !== undefined) superseded.set(stated, member.deprecated)
      if (member.named !== undefined) follow(member.named, stated, step + 1)
    }
  }
  follow(USER_CONFIG, '', 0)
  return superseded
}

/**
 * The preprocessor names the installed Vite loads options for, derived the same
 * way: `CSSOptions` declares one member per preprocessor under
 * `preprocessorOptions`, and a config stating one of those paths has turned
 * that dialect on for the whole build.
 * @param declarations - the installed Vite's declarations.
 * @returns the preprocessor names a config can turn on.
 */
export function vitePreprocessorNames(declarations: string): Set<string> {
  const members = interfaceMembers(declarations).get(CSS_OPTIONS)
  const names = new Set<string>()
  if (members === undefined) return names
  for (const path of members.keys()) {
    if (path.startsWith(`${PREPROCESSOR_OPTIONS}.`)) names.add(path.slice(PREPROCESSOR_OPTIONS.length + 1))
  }
  return names
}

/** One key a config states, and the line it is written on. */
interface StatedKey {
  /** The dotted path the key is written at. */
  readonly path: string
  /** The one-based line the key is written on. */
  readonly line: number
}

/** The keys a config states, and what stops them being read. */
interface ConfigKeys {
  /** Every key path the config writes out, in file order. */
  readonly keys: readonly StatedKey[]
  /** One offence per key with no name to read. */
  readonly offences: readonly Offence[]
}

/**
 * Every key a configuration file states, by the path and line it is written at.
 *
 * Read off a parse, so a key inside a string or a comment is not one. A spread,
 * or a key whose name is computed, is refused in its own right: a key this
 * reader does not see is a key no gate can hold.
 * @param label - the config's path, which selects the dialect to parse as.
 * @param config - the config's contents.
 * @returns the keys, and one offence per key that has no name to read.
 */
function configKeys(label: string, config: string): ConfigKeys {
  const parsed = parseScript(label, config)
  if (parsed.errors.length > 0) {
    return { keys: [], offences: [{ label, line: 1, why: 'it does not parse, so no key it states can be read' }] }
  }
  const roots: Node[] = []
  walk(parsed.body, (node) => {
    if (node.type === 'ExportDefaultDeclaration') {
      const exported = unwrap(nodeAt(node, 'declaration'))
      if (isNode(exported) && exported.type === 'ObjectExpression') roots.push(exported)
    }
    if (node.type === 'CallExpression' && fieldOf(nodeAt(node, 'callee'), 'name') === 'defineConfig') {
      const passed = unwrap(nodesAt(node, 'arguments')[0])
      if (isNode(passed) && passed.type === 'ObjectExpression') roots.push(passed)
    }
  })
  if (roots.length === 0) {
    return { keys: [], offences: [{ label, line: 1, why: 'it states no configuration object' }] }
  }
  const keys: StatedKey[] = []
  const offences: Offence[] = []
  const flatten = (object: Node, prefix: string): void => {
    for (const property of nodesAt(object, 'properties')) {
      const line = parsed.lineAt(fieldOf(property, 'start'))
      const written = property.type === 'Property' ? objectKey(property) : undefined
      if (written === undefined) {
        const holder = prefix === '' ? 'the configuration root' : prefix
        offences.push({ label, line, why: `${holder} carries a property that is not a key written out` })
        continue
      }
      const path = prefix === '' ? written : `${prefix}.${written}`
      keys.push({ path, line })
      const value = unwrap(fieldOf(property, 'value'))
      if (isNode(value) && value.type === 'ObjectExpression') flatten(value, path)
    }
  }
  for (const root of roots) flatten(root, '')
  return { keys, offences }
}

/**
 * Every Vite ≤7 or preprocessor config key a config file states.
 * @param declarations - the installed Vite's declarations.
 * @param label - the config's path.
 * @param config - the config's contents.
 * @returns one offence per superseded key it states, empty when it states none.
 */
export function viteFaceOffences(declarations: string, label: string, config: string): Offence[] {
  const superseded = viteSupersededKeys(declarations)
  const preprocessors = vitePreprocessorNames(declarations)
  const read = configKeys(label, config)
  const offences = [...read.offences]
  for (const stated of read.keys) {
    const said = superseded.get(stated.path)
    const tail = stated.path.slice(stated.path.lastIndexOf('.') + 1)
    const turnsOn = stated.path.includes(`${PREPROCESSOR_OPTIONS}.`) && preprocessors.has(tail)
    if (said !== undefined) {
      const why =
        said === ''
          ? 'it is a Vite ≤7 config key the installed Vite marks @deprecated'
          : `it is a Vite ≤7 config key the installed Vite marks @deprecated: ${said}`
      offences.push({ label, line: stated.line, why })
    } else if (turnsOn) {
      offences.push({
        label,
        line: stated.line,
        why: `it turns on the ${tail} preprocessor, a stylesheet dialect this design system retired`,
      })
    }
  }
  return offences
}
