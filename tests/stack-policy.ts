/**
 * The stack policy: the packages this workspace must not install, the files a
 * retired pipeline is configured by, and the dialect an installed package's own
 * manifest says it ships.
 *
 * A floor table refuses a version below a line; it says nothing about a second
 * styling vocabulary arriving under a new name. That is held here, and what can
 * be derived is derived: a package's own manifest decides what dialect it ships.
 * The names listed by hand are the residue a manifest does not state. The faces
 * the installed bundler and test runner declare are held in `vite-face.ts` and
 * `playwright-face.ts`.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs'
import { fieldOf, isNode, type Node, unwrap } from '../scripts/ast.ts'
import { isJsonObject, type Json, readJsonc } from '../scripts/jsonc.ts'
import { ROOT } from '../scripts/source-tree.ts'

/**
 * The styling vocabularies this design system retired, by name.
 *
 * The design system is tokens.css and the shipped sheets: a component library
 * or a utility stylesheet is a second vocabulary no gate reads. A package's
 * purpose is not a field npm defines — a component library ships ordinary
 * modules and ordinary sheets, so its manifest reads like any library's — which
 * is why these are refused by name rather than by metadata. Each framework is
 * listed under every name it publishes under, because the refusal is about the
 * vocabulary and not about the spelling npm happens to use for it.
 */
const RETIRED_VOCABULARIES = new Set([
  '@base-ui-components/core',
  '@emotion/css',
  '@pandacss/dev',
  '@picocss/pico',
  '@vanilla-extract/css',
  'alpinejs',
  'animate.css',
  'babel-plugin-styled-components',
  'bootstrap',
  'bootstrap-icons',
  'bootstrap-vue',
  'bulma',
  'daisyui',
  'foundation-sites',
  'fomantic-ui',
  'fomantic-ui-css',
  'htmx',
  'htmx.org',
  'jquery',
  'jquery-mobile',
  'jquery-ui',
  'jquery-ui-dist',
  'materialize-css',
  'nuxt',
  'open-props',
  'panda-css',
  'picocss',
  'react-bootstrap',
  'semantic-ui',
  'semantic-ui-css',
  'semantic-ui-react',
  'styled-components',
  'tailwindcss',
  'uikit',
  'vue',
  'water.css',
])

/**
 * The preprocessors and CSS pipelines this design system retired, by name.
 *
 * Each is also derivable from its own manifest once installed — a preprocessor
 * is its bin table, a pipeline is its `postcss` key, a dialect is its sidecar
 * field — and `dialectPackageOffences` below reads exactly that. The names stay
 * listed because a declared pin whose bytes are not installed has no manifest
 * to read: the manifests reach those, and the derivation reaches the package.
 */
const RETIRED_PIPELINES = new Set([
  '@unocss/preset-wind3',
  'less',
  'less-loader',
  'lightningcss',
  'node-sass',
  'postcss',
  'postcss-cli',
  'sass',
  'sass-embedded',
  'sass-loader',
  'stylus',
  'stylus-loader',
  'unocss',
  'windi',
  'windicss',
])

/**
 * The scopes a retired vocabulary publishes its packages under.
 *
 * A scoped package is the same framework under a name the set does not hold:
 * the scope is the vendor, and the packages beneath it are the vocabulary.
 */
const RETIRED_SCOPES: readonly string[] = [
  '@alpinejs/',
  '@base-ui-components/',
  '@daisyui/',
  '@emotion/',
  '@htmx.org/',
  '@materializecss/',
  '@nuxt/',
  '@pandacss/',
  '@picocss/',
  '@tailwindcss/',
  '@unocss/',
  '@vanilla-extract/',
  '@vue/',
]

/**
 * The configuration file names a retired CSS pipeline is configured by.
 *
 * A retired pipeline arrives in two shapes: a package the manifests declare,
 * and a file the repository ships. The file is the shape a reintroduction takes
 * first, and the pipelines name their configuration by the same convention —
 * `<tool>.config.<extension>`, the short `uno` alias the utility engine ships,
 * and the dotfile `rc` forms a pipeline reads when no config file is present.
 */
const RETIRED_PIPELINE_CONFIG =
  /(?:^|\/)(?:(?:autoprefixer|daisyui|postcss|purgecss|tailwind|uno|unocss|windicss)\.config\.[a-z]+|\.(?:postcssrc|unocssrc)(?:\.[a-z]+)?)$/u

/**
 * Whether a package is a styling vocabulary the design system retired.
 *
 * The narrower reading, for the lockfile: a preprocessor or a CSS pipeline
 * arrives through the bundler that uses it — the installed Vite depends on
 * postcss and lightningcss — so what the lockfile is held to is the
 * vocabularies, which nothing in this stack pulls in.
 * @param name - the package name, as a manifest or a lockfile writes it.
 * @returns true when the name is a retired vocabulary or its scope.
 */
export function isRetiredVocabulary(name: string): boolean {
  return RETIRED_VOCABULARIES.has(name) || RETIRED_SCOPES.some((scope) => name.startsWith(scope))
}

/**
 * Whether a package is one this workspace must not install.
 * @param name - the package name, as a manifest or a lockfile writes it.
 * @returns true when the name is a retired vocabulary, pipeline or scope.
 */
export function isRetiredPackage(name: string): boolean {
  return isRetiredVocabulary(name) || RETIRED_PIPELINES.has(name)
}

/**
 * Whether a shipped file is the configuration a retired CSS pipeline reads.
 * @param label - the path, as the tree lists it.
 * @returns true when the file is a retired pipeline's own configuration.
 */
export function isRetiredPipelineConfig(label: string): boolean {
  return RETIRED_PIPELINE_CONFIG.test(label)
}

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
 * manifest at all — the state the name lists above exist for.
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
 * which is what the name lists above are for.
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

/**
 * The name a property of an object literal is written under, when it has one.
 *
 * An object property's name is under `key`, where a member expression's is
 * under `property`, so this is its own reader. A computed key carries no name a
 * gate can read, and a parser writes a plain key under `name` or under `value`
 * depending on whether the spelling it read could be an identifier.
 * @param property - the property node.
 * @returns the name, or undefined when it is computed or not a plain name.
 */
export function objectKey(property: Node): string | undefined {
  if (fieldOf(property, 'computed') === true) return undefined
  const key = unwrap(fieldOf(property, 'key'))
  if (!isNode(key)) return undefined
  const written = key.type === 'Identifier' ? key['name'] : key['value']
  return typeof written === 'string' ? written : undefined
}
