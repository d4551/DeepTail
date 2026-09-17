/**
 * The stack policy: the exact line every dependency is held at, the packages
 * this workspace must not install, and the files a retired pipeline is
 * configured by.
 *
 * A floor table refuses a version below a line; it says nothing about a second
 * styling vocabulary arriving under a new name. That is held here, and what can
 * be derived is derived elsewhere: what an installed package's own manifest
 * says it ships is read by `stack-packages.ts`, the faces the installed
 * bundler and test runner declare are held in `vite-face.ts` and
 * `playwright-face.ts`, and the retired idioms a correct version can still
 * carry are held in `stack-patterns.ts`.
 *
 * @module
 */

import { fieldOf, isNode, type Node, unwrap } from '../scripts/ast.ts'

/**
 * The exact version every dependency this repository declares is held at.
 *
 * Every one of them, not only the tools at the root: a workspace manifest is
 * exactly as able to slip back a version, and `vite` sat two minors above a
 * floor that only the root was ever checked against — the rot this table exists
 * to prevent, present and unreported.
 *
 * Each entry is the current line of that tool and the exact version the
 * manifests declare, and the two are held equal deliberately. A floor written
 * below what is installed can never fail, so it rots into decoration: stated at
 * the major and minor alone it admitted every patch downgrade inside the same
 * minor, and an upgrade said nothing. Holding them equal means a downgrade of
 * any depth fails against this table and an upgrade has to be stated here, and
 * every tool the repository installs must appear, so nothing joins without a
 * floor. The readers live in `stack-floors.ts` and the cases in `stack.spec.ts`.
 */
export const FLOORS: Readonly<Record<string, string>> = {
  '@axe-core/playwright': '4.13.0',
  '@babel/parser': '8.0.5',
  '@babel/traverse': '8.0.5',
  '@babel/types': '8.0.5',
  '@biomejs/biome': '2.5.14',
  '@deepseek-ai/cordis': '4.0.2',
  '@deepseek-ai/cordis-plugin-loader': '1.0.3',
  '@deepseek-ai/dsh-api-session-controller': '0.1.2',
  '@deepseek-ai/dsh-brand': '0.1.2',
  '@deepseek-ai/dsh-client-modules': '0.1.2',
  '@deepseek-ai/dsh-client-store': '0.1.2',
  '@deepseek-ai/dsh-client-ui-primitives': '0.1.2',
  '@deepseek-ai/dsh-client-ui-slots': '0.1.2',
  '@deepseek-ai/dsh-client-web': '0.1.2',
  '@deepseek-ai/dsh-invariants': '0.1.2',
  '@deepseek-ai/dsh-jobs': '0.1.2',
  '@deepseek-ai/dsh-session': '0.1.2',
  '@deepseek-ai/dsh-tools': '0.1.2',
  '@deepseek-ai/dsh-util-values': '0.1.2',
  '@deepseek-ai/schemastery': '3.18.2',
  '@deeptail/host-fleet': '0.1.0',
  '@happy-dom/global-registrator': '20.14.5',
  '@stryker-mutator/core': '10.0.0',
  '@tauri-apps/api': '2.11.1',
  '@tauri-apps/cli': '2.11.4',
  '@types/bun': '1.4.2',
  '@types/node': '26.6.1',
  '@types/semver': '7.8.0',
  'jsonc-parser': '3.3.1',
  knip: '6.36.0',
  'oxc-parser': '0.150.0',
  oxlint: '1.83.0',
  parse5: '8.0.1',
  playwright: '1.63.0',
  'playwright-core': '1.63.0',
  react: '19.3.0',
  'react-dom': '19.3.0',
  semver: '7.8.5',
  typescript: '7.0.2',
  vite: '8.3.0',
}

/**
 * The version each tool was on before its floor, for the technologies whose
 * line is one this stack could actually slip back to.
 *
 * The floors above are what the manifests declare; this is the released line
 * immediately before, read from the tool's own feed: the major before the
 * current one where the tool has had more than one, and the previous released
 * line where the major has not moved in years — Playwright and axe-core are
 * both on `1.x` and `4.x`, so for them the line before is a minor. It is data
 * rather than a number written into a case so the reintroduction is refused at
 * the version it would really be declared at. The Bun line is here under the
 * types package whose floor the `packageManager` pin is held to.
 */
export const PREVIOUS_LINES: Readonly<Record<string, string>> = {
  '@axe-core/playwright': '4.12.1',
  '@biomejs/biome': '1.9.4',
  '@stryker-mutator/core': '9.6.1',
  '@tauri-apps/api': '1.6.0',
  '@types/bun': '1.3.9',
  knip: '5.63.0',
  oxlint: '0.16.0',
  playwright: '1.62.1',
  react: '18.3.1',
  typescript: '6.9.2',
  vite: '7.3.6',
}

/**
 * The styling vocabularies this design system retired, by name.
 *
 * The design system is tokens.css and the shipped sheets: a component library
 * or a utility stylesheet is a second vocabulary no gate reads. A package's
 * purpose is not a field npm defines — a component library ships ordinary
 * modules and ordinary sheets, so its manifest reads like any library's — which
 * is why these are refused by name rather than by metadata. Each framework is
 * listed under every name it publishes under, because the refusal is about the
 * vocabulary and not about the spelling npm happens to use for it. That
 * includes the name a framework carried before it republished: `rome` is the
 * tool that ships today as `@biomejs/biome`, and the installed Biome still
 * carries the licence file it was renamed from.
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
  'rome',
  'semantic-ui',
  'semantic-ui-css',
  'semantic-ui-react',
  'styled-components',
  'stryker',
  'tailwindcss',
  'uikit',
  'vue',
  'water.css',
])

/**
 * The preprocessors and CSS pipelines this design system retired, by name.
 *
 * Each is also derivable from its own manifest once installed, and
 * `stack-packages.ts` reads exactly that. The names stay listed because a
 * declared pin whose bytes are not installed has no manifest to read: the
 * manifests reach those, and the derivation reaches the package.
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
 * The prefixes a retired vocabulary publishes its packages under.
 *
 * A scoped package is the same framework under a name the set does not hold:
 * the scope is the vendor, and the packages beneath it are the vocabulary. A
 * flat prefix is the same idea for a publisher that renamed itself: Stryker
 * shipped as `stryker`, `stryker-api`, `stryker-typescript` and the runners of
 * the same shape, and republished the whole family under `@stryker-mutator/`,
 * which is the scope this repository installs today. Rome, which republished
 * under `@biomejs/`, is named by the flat name `rome` above and by the vendor
 * scope it used to publish its parts under, which is here.
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
  '@rometools/',
  '@tailwindcss/',
  '@unocss/',
  '@vanilla-extract/',
  '@vue/',
  'stryker-',
]

/**
 * The configuration file names a retired CSS pipeline is configured by.
 *
 * A retired pipeline arrives in two shapes: a package the manifests declare,
 * and a file the repository ships. The file is the shape a reintroduction takes
 * first, and the pipelines name their configuration by the same convention —
 * `<tool>.config.<extension>`, the short `uno` alias the utility engine ships,
 * and the dotfile `rc` forms a pipeline reads when no config file is present.
 * The bundler and transformer Vite 8 replaced name their own files the same
 * way, and those two are held in `stack-patterns.ts`.
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
