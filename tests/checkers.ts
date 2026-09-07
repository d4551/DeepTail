/**
 * The checkers' own configuration files, on named shapes.
 *
 * Two suites read these documents, and each had written out its own idea of
 * what one holds — a parse asserted into shape rather than proven to have it.
 * A key spelled wrong in either read as "absent", which is exactly what a
 * config with nothing to hide also reads as, so a suite that was looking at the
 * wrong field passed for the same reason a clean config does.
 *
 * They are decoded here instead, once, and every section whose keys are the
 * data — the rule levels, the category levels — is a `Map`, because that is
 * what it is.
 *
 * @module
 */

import { isJsonObject, type Json } from '../scripts/jsonc.ts'
import { readJsoncSync } from './jsonc-io.ts'

/**
 * One member of a decoded document, read by a key the caller supplies.
 * @param document - the decoded document.
 * @param key - the member to read.
 * @returns the member, or undefined when the document has none.
 */
function member(document: { [key: string]: Json }, key: string): Json | undefined {
  return document[key]
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

/**
 * One section of strings, as a list.
 * @param document - the decoded document.
 * @param key - the section to read.
 * @returns the strings, empty when the section is absent or of another kind.
 */
function stringList(document: { [key: string]: Json }, key: string): string[] {
  const found = member(document, key)
  return Array.isArray(found) ? found.filter((entry) => typeof entry === 'string') : []
}

/** The second linter's configuration, as the suites that read it need it. */
export interface OxlintConfig {
  /** The plugin names it turns on, in the order it states them. */
  readonly plugins: readonly string[]
  /** Category name to the level it is held at. */
  readonly categories: ReadonlyMap<string, string>
  /** Rule name to the level it is held at. */
  readonly rules: ReadonlyMap<string, string>
  /** Every top-level key the document states, so an added list is visible. */
  readonly keys: readonly string[]
}

/**
 * Read the second linter's configuration.
 * @param path - the file to read.
 * @returns the decoded configuration.
 */
export function readOxlintConfig(path: string): OxlintConfig {
  const document = readJsoncSync(path)
  return {
    plugins: stringList(document, 'plugins'),
    categories: stringSection(document, 'categories'),
    rules: stringSection(document, 'rules'),
    keys: Object.keys(document),
  }
}

/** One group of the first linter's rules, and the levels it holds them at. */
export interface BiomeRuleGroup {
  /** The group's name, as the document spells it. */
  readonly group: string
  /** Rule name to the level it is held at. */
  readonly levels: ReadonlyMap<string, string>
}

/** The first linter's configuration, as the suites that read it need it. */
export interface BiomeConfig {
  /** Every top-level key the document states, so an added file list is visible. */
  readonly keys: readonly string[]
  /** Whether the document defers its file list to the repository's ignore file. */
  readonly usesIgnoreFile: boolean
  /** Whether the linter is switched on; absent reads as on, which is its default. */
  readonly linterEnabled: boolean
  /** The preset the rules extend, or the empty string when none is named. */
  readonly preset: string
  /** One entry per rule group the document states a level in. */
  readonly groups: readonly BiomeRuleGroup[]
}

/**
 * Read the first linter's configuration.
 * @param path - the file to read.
 * @returns the decoded configuration.
 */
export function readBiomeConfig(path: string): BiomeConfig {
  const document = readJsoncSync(path)
  const vcs = member(document, 'vcs')
  const linter = member(document, 'linter')
  const linterSection = isJsonObject(linter) ? linter : {}
  const rules = member(linterSection, 'rules')
  const rulesSection = isJsonObject(rules) ? rules : {}
  const groups = Object.entries(rulesSection).flatMap(([group, value]) =>
    isJsonObject(value) ? [{ group, levels: stringSection(rulesSection, group) }] : [],
  )
  const preset = member(rulesSection, 'preset')
  return {
    keys: Object.keys(document),
    usesIgnoreFile: isJsonObject(vcs) && member(vcs, 'useIgnoreFile') === true,
    linterEnabled: member(linterSection, 'enabled') !== false,
    preset: typeof preset === 'string' ? preset : '',
    groups,
  }
}

/**
 * Workspaces the dead-code reader is told to overlook dependencies in.
 * @param path - the file to read.
 * @returns one entry per workspace that names such a list.
 */
export function knipIgnoredDependencies(path: string): string[] {
  const document = readJsoncSync(path)
  const workspaces = member(document, 'workspaces')
  const entries = isJsonObject(workspaces) ? Object.entries(workspaces) : []
  return entries.flatMap(([name, value]) =>
    isJsonObject(value) && member(value, 'ignoreDependencies') !== undefined ? [name] : [],
  )
}
