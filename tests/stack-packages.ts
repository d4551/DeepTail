/**
 * What an installed package's own manifest says it ships.
 *
 * The names a policy refuses are the residue a manifest does not state: a
 * component library ships ordinary modules and ordinary sheets, so its
 * manifest reads like any library's. What a manifest *does* state is derivable
 * — a preprocessor is its bin table, a CSS pipeline is its `postcss` key, a
 * dialect is a sidecar field — and that derivation is here, beside the reader
 * it needs: the manifest of a package that is installed.
 *
 * Split from `stack-policy.ts` along the seam its own line limit drew: that
 * module holds the lines and the names the workspace is held to, and this one
 * holds the reading of what is installed.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs'
import { isJsonObject, type Json, readJsonc } from '../scripts/jsonc.ts'
import { ROOT } from '../scripts/source-tree.ts'

/** The directories this workspace installs dependencies into. */
const INSTALL_DIRECTORIES: readonly string[] = [
  'apps/deeptail/node_modules/',
  'packages/host-fleet/node_modules/',
  'node_modules/',
]

/**
 * The manifest of an installed dependency, when its bytes are there.
 *
 * Read from the install directories rather than resolved through the package
 * manager, so a dependency that is declared but not installed reads as no
 * manifest at all — the state a name list exists for.
 * @param name - the package name.
 * @returns its parsed manifest, or undefined when it is not installed.
 */
export function installedManifest(name: string): { [key: string]: Json } | undefined {
  for (const directory of INSTALL_DIRECTORIES) {
    const path = `${ROOT}${directory}${name}/package.json`
    if (existsSync(path)) return readJsonc(readFileSync(path, 'utf8'))
  }
  return undefined
}

/** The fields a package states one of its stylesheets in. */
const SIDECAR_FIELDS = ['style', 'sass', 'less', 'stylus'] as const

/** The fields a package states one of its entry points in. */
const ENTRY_FIELDS = ['main', 'module', 'browser', 'exports'] as const

/** The manifest keys that mean a package runs its own CSS pipeline. */
const PIPELINE_KEYS = ['postcss', 'unocss'] as const

/** The names a CSS pipeline installs into a package's bin table. */
const PIPELINE_BINS = new Set([
  'lessc',
  'lightningcss',
  'panda',
  'postcss',
  'sass',
  'sassc',
  'stylus',
  'tailwindcss',
  'unocss',
  'windicss',
])

/**
 * The entries a field states, however deeply the field nests them.
 * @param value - the field's JSON value.
 * @returns the strings it carries, in the order it writes them.
 */
function statedStrings(value: Json | undefined): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap((entry) => statedStrings(entry))
  if (isJsonObject(value)) return Object.values(value).flatMap((entry) => statedStrings(entry))
  return []
}

/**
 * Every dialect a package declares it ships, in its own manifest.
 *
 * Derived, because a manifest states each of these: a `sass` or `less` sidecar
 * field is the preprocessor's own entry point, a `style` field naming a `.scss`
 * file is a dialect stylesheet, a bin named `sass` or `postcss` is the command
 * a pipeline installs, and a `postcss` key is a package configuring that
 * pipeline for itself. A dependency is deliberately not read: the installed
 * bundler itself depends on a pipeline, so a dependency states nothing about
 * the package that carries it. What no manifest states is a package's purpose,
 * which is what the name lists in `stack-policy.ts` are for.
 * @param name - the package name, for the report.
 * @param manifest - the package's own manifest.
 * @param dialects - the dialect suffixes the installed bundler compiles.
 * @returns one line per dialect it declares, empty when it declares none.
 */
export function dialectPackageOffences(
  name: string,
  manifest: { [key: string]: Json },
  dialects: ReadonlySet<string>,
): string[] {
  const offences: string[] = []
  const names = [...dialects]
  for (const field of SIDECAR_FIELDS) {
    const stated = manifest[field]
    if (stated === undefined) continue
    const values = statedStrings(stated)
    const dialect = values.some((value) => names.some((suffix) => value.endsWith(suffix)))
    if (field === 'style' && !dialect) continue
    offences.push(`${name} states a ${field} sidecar: ${values.join(', ')}`)
  }
  for (const field of ENTRY_FIELDS) {
    for (const value of statedStrings(manifest[field])) {
      const suffix = names.find((dialect) => value.endsWith(dialect))
      if (suffix !== undefined) offences.push(`${name} points ${field} at ${value}, a ${suffix} stylesheet`)
    }
  }
  const bins = manifest['bin']
  const binNames = typeof bins === 'string' ? [name] : Object.keys(isJsonObject(bins) ? bins : {})
  for (const bin of binNames) {
    if (PIPELINE_BINS.has(bin)) offences.push(`${name} installs a ${bin} command, which is a CSS pipeline`)
  }
  for (const key of PIPELINE_KEYS) {
    if (manifest[key] !== undefined) offences.push(`${name} configures its own ${key} pipeline in its manifest`)
  }
  return offences
}
