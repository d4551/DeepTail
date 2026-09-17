/**
 * The tools the documentation is held to, and by which pin each is measured.
 *
 * The toolchain line in the README names a set of tools, and every one of them
 * is pinned somewhere else: a dependency in a manifest, the `packageManager`
 * field, the engine range, or the crate's edition. This module is the table
 * that says which pin each documented name answers to, and which names are not
 * derivable from the package they belong to.
 *
 * @module
 */

/**
 * The tools the toolchain line must name, and the dependency each is pinned by.
 *
 * `Bun` is absent here and read from the `packageManager` pin instead, because
 * that is where the runtime this repository runs on is pinned; `Node` and the
 * Rust edition are read from the manifest's engine range and the crate's
 * manifest for the same reason.
 */
export const DOCUMENTED_TOOLS: Readonly<Record<string, string>> = {
  TypeScript: 'typescript',
  Tauri: '@tauri-apps/api',
  Vite: 'vite',
  Playwright: 'playwright',
}

/** The tool whose pin is the package manager the manifest declares. */
export const BUN_TOOL = 'Bun'

/** The tool whose pin is the engine range the manifest declares. */
export const NODE_TOOL = 'Node'

/** The tool whose pin is the edition the crate's manifest declares. */
export const EDITION_TOOL = 'Rust edition'

/**
 * The tools whose documentation name is not the package's own last segment.
 *
 * A name like `Biome` or `Oxlint` is the package's basename and needs no entry.
 * `Stryker` is published as `@stryker-mutator/core`, so the two names are not
 * the same word and no reader can derive one from the other.
 */
export const DOCUMENTED_ALIASES: Readonly<Record<string, string>> = {
  Stryker: '@stryker-mutator/core',
}

/**
 * Tools this reader holds to a pin, so a badge and a toolchain line that
 * disagree about one of them cannot hide behind last-wins.
 */
export const PINNED_NAMES: ReadonlySet<string> = new Set([
  BUN_TOOL,
  NODE_TOOL,
  EDITION_TOOL,
  ...Object.keys(DOCUMENTED_TOOLS),
  ...Object.keys(DOCUMENTED_ALIASES),
])
