/**
 * The mutation scopes' own configuration, read rather than claimed.
 *
 * A mutation score is only worth what its denominator is, and the denominator
 * is stated in these files: what is mutated, what judges it, and the score a
 * run breaks below. Two suites and one reader all opened them with `JSON.parse`
 * and then told the compiler what they had found — a claim about a file on disk
 * that nothing checks, so a scope whose `mutate` was a string, or whose
 * `break` was written as text, would read as the declared shape and be reported
 * as configuration nobody had weakened.
 *
 * Every field is read here, on the closed JSON model, and a field the file
 * writes as something else reads as absent rather than as itself.
 *
 * @module
 */

import { isJsonObject, type Json, readJsonc } from './jsonc.ts'
import { readManifest } from './manifest.ts'
import { repositoryFiles } from './source-tree.ts'

/** The scores a run is held to. */
export interface Thresholds {
  readonly high: number | undefined
  readonly low: number | undefined
  readonly break: number | undefined
}

/** One mutation scope, as far as the rules that read it go. */
export interface ScopeConfig {
  /** The configuration file, by repository-relative path. */
  readonly label: string
  /** The command the scope judges its mutants with. */
  readonly command: string
  /** What the scope mutates, as written. */
  readonly mutate: readonly string[]
  /** The coverage analysis it asks its runner for. */
  readonly coverageAnalysis: string | undefined
  /** The runner it names, which the built-in one is not. */
  readonly testRunner: string | undefined
  /** Whether it mutates the tree in place. */
  readonly inPlace: boolean | undefined
  /** Whether it reuses a stored verdict rather than re-reading every mutant. */
  readonly incremental: boolean | undefined
  /** The scores it is held to. */
  readonly thresholds: Thresholds
}

/**
 * The number a document states under one key, when it states a number.
 * @param held - the section the key is written in.
 * @param key - the key.
 * @returns the number, or undefined.
 */
function numberAt(held: { [key: string]: Json }, key: string): number | undefined {
  const value = held[key]
  return typeof value === 'number' ? value : undefined
}

/**
 * The string a document states under one key, when it states a string.
 * @param held - the section the key is written in.
 * @param key - the key.
 * @returns the string, or undefined.
 */
function stringAt(held: { [key: string]: Json }, key: string): string | undefined {
  const value = held[key]
  return typeof value === 'string' ? value : undefined
}

/**
 * The boolean a document states under one key, when it states a boolean.
 * @param held - the section the key is written in.
 * @param key - the key.
 * @returns the boolean, or undefined.
 */
function booleanAt(held: { [key: string]: Json }, key: string): boolean | undefined {
  const value = held[key]
  return typeof value === 'boolean' ? value : undefined
}

/**
 * The list of strings a document states under one key.
 *
 * A list carrying anything but strings is not a list of patterns, and reading
 * it as one would answer for files no pattern selects.
 * @param held - the section the key is written in.
 * @param key - the key.
 * @returns the strings, or an empty list.
 */
function stringsAt(held: { [key: string]: Json }, key: string): readonly string[] {
  const value = held[key]
  if (!Array.isArray(value)) return []
  return value.filter((entry) => typeof entry === 'string')
}

/**
 * One scope's configuration, read off its document.
 * @param label - the configuration file, by repository-relative path.
 * @param document - the parsed document.
 * @returns the scope.
 */
export function readScopeConfig(label: string, document: { [key: string]: Json }): ScopeConfig {
  const runner = document['commandRunner']
  const thresholds = document['thresholds']
  const scores = isJsonObject(thresholds) ? thresholds : {}
  return {
    label,
    command: isJsonObject(runner) ? (stringAt(runner, 'command') ?? '') : '',
    mutate: stringsAt(document, 'mutate'),
    coverageAnalysis: stringAt(document, 'coverageAnalysis'),
    testRunner: stringAt(document, 'testRunner'),
    inPlace: booleanAt(document, 'inPlace'),
    incremental: booleanAt(document, 'incremental'),
    thresholds: {
      high: numberAt(scores, 'high'),
      low: numberAt(scores, 'low'),
      break: numberAt(scores, 'break'),
    },
  }
}

/**
 * Every mutation scope the repository ships.
 * @returns one entry per configuration file, in path order.
 */
export function scopeConfigs(): readonly ScopeConfig[] {
  return repositoryFiles(['.json'])
    .filter((file) => /^stryker\..*\.json$/u.test(file.label))
    .map((file) => readScopeConfig(file.label, readManifest(file.path)))
}

/**
 * One scope's configuration, read from text.
 * @param label - the name to report it under.
 * @param text - the file's contents.
 * @returns the scope.
 */
export function scopeConfigOf(label: string, text: string): ScopeConfig {
  return readScopeConfig(label, readJsonc(text))
}
