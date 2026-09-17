/**
 * The superseded faces this repository refuses.
 *
 * A face is what a tool is set to read: the module system a compiler emits, the
 * edition a crate is written in, the keys a runtime accepts. Each is read from
 * the tool's own shipped artifact — the inherited tsconfig, the edition guide
 * the toolchain ships, the schema the installed Tauri CLI declares — so an
 * upgrade moves what is refused with it. The declarations a face is read
 * through are read by `declaration-reader.ts`; the faces the installed bundler
 * and the installed test runner declare are held in `tests/vite-face.ts` and
 * `tests/playwright-face.ts`.
 *
 * @module
 */

import { coerce, gte } from 'semver'
import { EMPTY_SECTION, isJsonObject, type Json } from './jsonc.ts'

/** Module values the TypeScript 6 compiler shipped as its common face. */
const TS6_MODULES = new Set(['commonjs', 'amd', 'umd', 'system', 'none', 'es6', 'es2015', 'node16'])

/** Resolution values the TypeScript 6 compiler used before bundler/nodenext. */
const TS6_RESOLUTIONS = new Set(['node', 'node10', 'classic', 'node16'])

/** Targets below `esnext`: the TypeScript 6 emit faces this repository does not ship. */
const SUPERSEDED_TARGETS = new Set(
  'es3 es5 es6 es2015 es2016 es2017 es2018 es2019 es2020 es2021 es2022 es2023 es2024'.split(' '),
)

/**
 * The options the TypeScript 6.0 release notes deprecated whatever they carry,
 * and TypeScript 7 dropped outright.
 *
 * TypeScript 6 shipped as the last release of the JavaScript compiler and
 * deprecated each of these by name — `baseUrl`, which resolved every bare
 * specifier from one directory, and `outFile`, which concatenated the whole
 * program into one file. Its announcement states the term that decides this
 * table: "TypeScript 7.0 will not support any of these deprecated options." A
 * configuration still stating one is a TypeScript 6 face whatever it resolves
 * to there.
 */
const TS6_DROPPED_OPTIONS: ReadonlyMap<string, string> = new Map([
  ['baseUrl', 'baseUrl is the TypeScript 6 paths base TypeScript 7 dropped; prefix each paths entry instead'],
  ['outFile', 'outFile is the TypeScript 6 single-file emit TypeScript 7 dropped; let the bundler bundle'],
])

/**
 * The options TypeScript 6 allowed a project to switch off, which TypeScript 7
 * keeps on and refuses to have turned off.
 *
 * The same release notes list them: `--esModuleInterop false` and
 * `--allowSyntheticDefaultImports false` together, and `--alwaysStrict false`
 * on its own. Each is read only when the value is exactly `false`, because an
 * option that is absent has the compiler's own default rather than the
 * project's decision.
 */
const TS6_SWITCHED_OFF: ReadonlyMap<string, string> = new Map([
  ['esModuleInterop', 'esModuleInterop is off; the TypeScript 7 face keeps the ESM interop on'],
  [
    'allowSyntheticDefaultImports',
    'allowSyntheticDefaultImports is off; the TypeScript 7 face keeps the synthetic defaults on',
  ],
  ['alwaysStrict', 'alwaysStrict is off; the TypeScript 7 face keeps every file strict'],
])

/** The value an option states, when the set names it, lowercased. */
function statedOneOf(value: Json | undefined, named: ReadonlySet<string>): string | undefined {
  if (typeof value !== 'string') return undefined
  const stated = value.toLowerCase()
  return named.has(stated) ? stated : undefined
}

/**
 * Every TypeScript 6 (or earlier) option a compilerOptions section states.
 * @param options - one tsconfig's compilerOptions.
 * @returns one line per refused option, empty when the face is TypeScript 7.
 */
export function compilerFaceOffences(options: { readonly [key: string]: Json }): string[] {
  const offences: string[] = []
  const moduleValue = statedOneOf(options['module'], TS6_MODULES)
  if (moduleValue !== undefined) {
    offences.push(`module ${moduleValue} is a TypeScript 6 module system; use esnext with bundler resolution`)
  }
  const resolution = statedOneOf(options['moduleResolution'], TS6_RESOLUTIONS)
  if (resolution !== undefined) {
    offences.push(`moduleResolution ${resolution} is a TypeScript 6 resolver; use bundler`)
  }
  const target = statedOneOf(options['target'], SUPERSEDED_TARGETS)
  if (target !== undefined) {
    offences.push(`target ${target} is a TypeScript ≤6 emit face; use esnext`)
  }
  for (const flag of ['importsNotUsedAsValues', 'preserveValueImports', 'downlevelIteration']) {
    if (options[flag] !== undefined) {
      offences.push(`${flag} is a TypeScript 6 module-interop flag; TypeScript 7 verbatimModuleSyntax replaced it`)
    }
  }
  for (const [option, why] of TS6_DROPPED_OPTIONS) {
    if (options[option] !== undefined) offences.push(why)
  }
  for (const [option, why] of TS6_SWITCHED_OFF) {
    if (options[option] === false) offences.push(why)
  }
  if (options['skipLibCheck'] === true) {
    offences.push("skipLibCheck silences a dependency's diagnostics instead of fixing them")
  }
  if (options['ignoreDeprecations'] !== undefined) {
    offences.push('ignoreDeprecations keeps a TypeScript 6 option working; remove the option')
  }
  if (options['strict'] === false) {
    offences.push('strict is off; the TypeScript 7 face keeps it on')
  }
  if (options['isolatedModules'] === false) {
    offences.push('isolatedModules is off; the TypeScript 7 face keeps it on')
  }
  if (options['verbatimModuleSyntax'] === false) {
    offences.push('verbatimModuleSyntax is off; the TypeScript 7 face keeps it on')
  }
  if (options['erasableSyntaxOnly'] === false) {
    offences.push('erasableSyntaxOnly is off; TypeScript 7 uses it to refuse enum, namespace, and import-equals')
  }
  return offences
}

/** The Rust edition this crate ships. */
export const RUST_EDITION = '2024'

/** The compiler edition 2024 needs, as https://doc.rust-lang.org/edition-guide/rust-2024/ states it. */
export const RUST_VERSION = '1.85'

/** The same floor at patch level, which is the depth a semver comparison reads. */
const RUST_VERSION_FLOOR = `${RUST_VERSION}.0`

/** The editions Rust shipped before 2024. */
const SUPERSEDED_EDITIONS = new Set(['2015', '2018', '2021'])

/** The manifest section a crate states its own fields in. */
const CRATE_SECTION = 'package'

/** The section a virtual manifest states, which describes no crate of its own. */
const WORKSPACE_SECTION = 'workspace'

/** The keys each section of a crate manifest states, read section by section. */
function manifestSections(manifest: string): Map<string, Map<string, string>> {
  const sections = new Map<string, Map<string, string>>()
  let section: Map<string, string> | undefined
  for (const raw of manifest.split('\n')) {
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) continue
    if (line.startsWith('[') && line.includes(']')) {
      const name = line.slice(line.lastIndexOf('[') + 1, line.lastIndexOf(']')).trim()
      section = new Map()
      sections.set(name, section)
      continue
    }
    const equals = line.indexOf('=')
    if (equals === -1 || section === undefined) continue
    const value = line.slice(equals + 1).trim()
    const quoted = value.length > 1 && value.startsWith('"') && value.endsWith('"')
    section.set(line.slice(0, equals).trim(), quoted ? value.slice(1, -1) : value)
  }
  return sections
}

/** The edition a crate manifest states, or the empty string when it states none. */
export function cargoEdition(manifest: string): string {
  return manifestSections(manifest).get(CRATE_SECTION)?.get('edition') ?? ''
}

/**
 * Every Rust ≤2021 face a crate manifest states: an edition from before 2024, a
 * missing edition (read by cargo as 2015), or a compiler floor below the one
 * edition 2024 needs.
 * @param manifest - the manifest's contents.
 * @returns one line per refused field, empty when the crate is edition 2024.
 */
export function rustEditionOffences(manifest: string): string[] {
  const sections = manifestSections(manifest)
  const crate = sections.get(CRATE_SECTION)
  if (crate === undefined) {
    return sections.has(WORKSPACE_SECTION)
      ? []
      : ['the manifest declares no [package] section, so it describes no crate']
  }
  const edition = crate.get('edition')
  if (edition === undefined) {
    return ['the crate states no edition; cargo reads that as the 2015 edition, which is a Rust ≤2021 face']
  }
  const offences: string[] = []
  if (SUPERSEDED_EDITIONS.has(edition)) {
    offences.push(`edition ${edition} is a Rust ≤2021 face; this crate ships edition ${RUST_EDITION}`)
  } else if (edition !== RUST_EDITION) {
    offences.push(`edition ${edition} is not the edition this crate ships: ${RUST_EDITION}`)
  }
  const version = crate.get('rust-version')
  if (version === undefined) {
    offences.push(
      `the crate states no rust-version, so nothing holds it to the ${RUST_VERSION} edition ${RUST_EDITION} needs`,
    )
  } else {
    const stated = coerce(version)
    if (stated === null) offences.push(`rust-version ${version} is not a version this reader can read`)
    else if (!gte(stated, RUST_VERSION_FLOOR)) {
      offences.push(`rust-version ${version} is below ${RUST_VERSION}, which edition ${RUST_EDITION} needs`)
    }
  }
  return offences
}

/** The schema node a `$ref` points at, when it points inside this schema. */
function referenced(schema: { [key: string]: Json }, node: { [key: string]: Json }): { [key: string]: Json } {
  const ref = node['$ref']
  if (typeof ref !== 'string' || !ref.startsWith('#/')) return node
  let at: Json = schema
  for (const step of ref.slice(2).split('/')) {
    if (!isJsonObject(at)) return node
    at = at[step] ?? null
  }
  return isJsonObject(at) ? at : node
}

/** The node a config is read against: a `$ref` target, or the branch of an
 * `allOf`/`anyOf`/`oneOf` around one that declares keys, which is how Tauri
 * writes every section of its root. */
function schemaNode(schema: { [key: string]: Json }, node: { [key: string]: Json }): { [key: string]: Json } {
  const resolved = referenced(schema, node)
  if (isJsonObject(resolved['properties'])) return resolved
  const merged: { [key: string]: Json } = {}
  let declares = false
  for (const keyword of ['allOf', 'anyOf', 'oneOf']) {
    const branches = resolved[keyword]
    if (!Array.isArray(branches)) continue
    for (const branch of branches) {
      if (!isJsonObject(branch)) continue
      const inner = referenced(schema, branch)
      if (!isJsonObject(inner['properties'])) continue
      Object.assign(merged, inner['properties'])
      declares = true
    }
  }
  return declares ? { ...resolved, properties: merged } : resolved
}

/** Every key one configuration states that the schema under it does not. */
function walkTauri(
  schema: { [key: string]: Json },
  node: { [key: string]: Json },
  stated: { [key: string]: Json },
  prefix: string,
  offences: string[],
): void {
  const declared = isJsonObject(node['properties']) ? node['properties'] : EMPTY_SECTION
  const declaresKeys = isJsonObject(node['properties'])
  const extra = node['additionalProperties']
  const allowsOwnKeys = extra === true || isJsonObject(extra)
  for (const [key, value] of Object.entries(stated)) {
    const path = prefix === '' ? key : `${prefix}.${key}`
    const property = declared[key]
    if (property === undefined) {
      if (declaresKeys && !allowsOwnKeys) {
        offences.push(`${path} is not a key the shipped Tauri v2 schema declares`)
      }
      continue
    }
    if (!isJsonObject(property)) continue
    const resolved = schemaNode(schema, property)
    if (resolved['deprecated'] === true) {
      offences.push(`${path} is a key the shipped Tauri v2 schema marks deprecated`)
    }
    if (isJsonObject(value)) walkTauri(schema, resolved, value, path, offences)
  }
}

/**
 * Every Tauri v1 config key a configuration states, refused through the schema
 * the installed CLI ships rather than through a list of the keys v1 had: what
 * the shipped schema declares is what that release reads. The v1 JavaScript API
 * paths are refused where they are written, by `react-tauri-rules.ts`.
 * @param schema - the schema the installed Tauri CLI ships, parsed.
 * @param config - the tauri configuration, parsed.
 * @returns one line per key the schema does not hold, empty when it holds them all.
 */
export function tauriConfigOffences(schema: { [key: string]: Json }, config: { [key: string]: Json }): string[] {
  const offences: string[] = []
  walkTauri(schema, schema, config, '', offences)
  return offences
}
