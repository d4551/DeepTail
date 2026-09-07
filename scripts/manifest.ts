/**
 * The manifests and the lockfile, on one named shape.
 *
 * Four suites and one gate had each written out their own idea of what
 * `package.json` holds, every one of them an assertion about a document nobody
 * had validated: a parse whose result was asserted into shape. Two of them
 * disagreed about the same field, and none of them would have said so — an
 * assertion cannot fail on a document that never matched it.
 *
 * The documents are decoded here instead. Every field is proven at the point it
 * is read, so what leaves this module is a value whose type is a fact rather
 * than a claim, and a section that is missing or of the wrong kind arrives
 * empty rather than as a shape the compiler was told to believe.
 *
 * A section whose keys are the data — the scripts, the dependency ranges, the
 * lock's resolutions — is a `Map`, because that is what it is: nothing reads a
 * script by writing its name as a property, so nothing can misspell one and
 * read `undefined` as an answer.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { isJsonObject, type Json, readJsonc } from './jsonc.ts'
import { repositoryFiles } from './source-tree.ts'

/** Every kind of dependency a manifest can declare. */
const DEPENDENCY_KINDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const

/**
 * One member of a decoded document, read by a key the caller supplies.
 *
 * The key travels as a value rather than as a written property, which is what
 * keeps every read here honest about the document being a map at this point:
 * it has not yet been proven to have the member at all.
 * @param document - the decoded document.
 * @param key - the member to read.
 * @returns the member, or undefined when the document has none.
 */
function member(document: { [key: string]: Json }, key: string): Json | undefined {
  return document[key]
}

/**
 * One string member, or the empty string when it is absent or of another kind.
 * @param document - the decoded document.
 * @param key - the member to read.
 * @returns the member's text.
 */
function text(document: { [key: string]: Json }, key: string): string {
  const found = member(document, key)
  return typeof found === 'string' ? found : ''
}

/**
 * One section of string-valued members, as a map.
 * @param document - the decoded document.
 * @param key - the section to read.
 * @returns name to value, empty when the section is absent or of another kind.
 */
function stringSection(document: { [key: string]: Json }, key: string): Map<string, string> {
  const found = member(document, key)
  const entries = isJsonObject(found) ? Object.entries(found) : []
  return new Map(entries.flatMap(([name, value]) => (typeof value === 'string' ? [[name, value] as const] : [])))
}

/** One workspace manifest, as everything that reads one needs it. */
export interface PackageManifest {
  /** The package manager pin, verbatim; empty when the manifest states none. */
  readonly packageManager: string
  /** Script name to command line. */
  readonly scripts: ReadonlyMap<string, string>
  /** Dependency name to declared range, across every kind the manifest uses. */
  readonly dependencies: ReadonlyMap<string, string>
}

/**
 * Read one workspace manifest.
 * @param path - the manifest to read.
 * @returns the decoded manifest.
 */
export function readManifest(path: string): PackageManifest {
  const document = readJsonc(readFileSync(path, 'utf8'))
  const dependencies = new Map<string, string>()
  for (const kind of DEPENDENCY_KINDS) {
    for (const [name, range] of stringSection(document, kind)) dependencies.set(name, range)
  }
  return {
    packageManager: text(document, 'packageManager'),
    scripts: stringSection(document, 'scripts'),
    dependencies,
  }
}

/**
 * Every dependency this repository declares, from every manifest it ships.
 *
 * Shared by the outdated gate — so a silent bun table cannot report "0 checked"
 * when dozens of pins exist — and the floor suite, so the two cannot disagree
 * on what is installed.
 * @returns name to declared range.
 */
export function declaredPins(): Map<string, string> {
  const found = new Map<string, string>()
  for (const manifest of repositoryFiles(['package.json'])) {
    for (const [name, range] of readManifest(manifest.path).dependencies) found.set(name, range)
  }
  return found
}

/** One workspace member, as the lockfile records it. */
export interface LockWorkspace {
  /** The package name the workspace publishes under. */
  readonly name: string
  /** Its own version, or undefined when the manifest states none. */
  readonly version: string | undefined
}

/** The lockfile, on the two sections every reader of it needs. */
export interface BunLock {
  /**
   * Package name to the tuple the lock records for it, whose first element is
   * the resolution, spelled "name@version".
   */
  readonly packages: ReadonlyMap<string, readonly Json[]>
  /** Workspace path to what the lock records about that workspace. */
  readonly workspaces: ReadonlyMap<string, LockWorkspace>
}

/**
 * Read the lockfile.
 *
 * Workspace members are versioned by their own manifest, mirrored in the lock's
 * workspaces section rather than resolved as registry packages, so the two
 * sections are decoded apart and answered together.
 * @param path - the lockfile to read.
 * @returns the decoded lockfile.
 */
export function readLock(path: string): BunLock {
  const document = readJsonc(readFileSync(path, 'utf8'))
  const packagesSection = member(document, 'packages')
  const packages = new Map<string, readonly Json[]>()
  for (const [key, entry] of isJsonObject(packagesSection) ? Object.entries(packagesSection) : []) {
    if (Array.isArray(entry)) packages.set(key, entry)
  }
  const workspacesSection = member(document, 'workspaces')
  const workspaces = new Map<string, LockWorkspace>()
  for (const [key, entry] of isJsonObject(workspacesSection) ? Object.entries(workspacesSection) : []) {
    if (!isJsonObject(entry)) continue
    const name = member(entry, 'name')
    const version = member(entry, 'version')
    if (typeof name !== 'string') continue
    workspaces.set(key, { name, version: typeof version === 'string' ? version : undefined })
  }
  return { packages, workspaces }
}
