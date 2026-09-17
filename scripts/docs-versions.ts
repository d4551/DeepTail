/**
 * The versions the documentation states, read back against what is installed.
 *
 * A version written in prose is a version nothing re-reads. The README's
 * toolchain line said Playwright 1.62.1 while the workspace installed 1.63.0,
 * and no gate in the chain had any reason to look: the floors read manifests,
 * the outdated gate reads the registry, and neither reads a sentence. This
 * module is what turns that sentence into something that can fail, and it reads
 * the badges too — a shields.io badge carries its version in its URL, where a
 * change is invisible to anyone reading the rendered page.
 *
 * @module
 */

import { coerce, satisfies } from 'semver'

/**
 * The tools the toolchain line must name, and the dependency each is pinned by.
 *
 * `Bun` is absent here and read from the `packageManager` pin instead, because
 * that is where the runtime this repository runs on is pinned; `Node` and the
 * Rust edition are read from the manifest's engine range and the crate's
 * manifest for the same reason.
 */
const DOCUMENTED_TOOLS: Readonly<Record<string, string>> = {
  TypeScript: 'typescript',
  Tauri: '@tauri-apps/api',
  Vite: 'vite',
  Playwright: 'playwright',
}

/** The tool whose pin is the package manager the manifest declares. */
const BUN_TOOL = 'Bun'

/** The tool whose pin is the engine range the manifest declares. */
const NODE_TOOL = 'Node'

/** The tool whose pin is the edition the crate's manifest declares. */
const EDITION_TOOL = 'Rust edition'

/**
 * The tools whose documentation name is not the package's own last segment.
 *
 * A name like `Biome` or `Oxlint` is the package's basename and needs no entry.
 * `Stryker` is published as `@stryker-mutator/core`, so the two names are not
 * the same word and no reader can derive one from the other.
 */
const DOCUMENTED_ALIASES: Readonly<Record<string, string>> = {
  Stryker: '@stryker-mutator/core',
}

/** One `Name 1.2.3` pair, as a line of prose writes it. */
const STATED_VERSION = /\b[A-Z][A-Za-z]+(?: [a-z][a-z]+)? \d+(?:\.\d+)*\b/gu

/** One shields.io static badge, whose label and message are its path. */
const BADGE = /https:\/\/img\.shields\.io\/badge\/([^\s)"'<>]+)/gu

/** Whether a word is a version at the depth the documentation may state one. */
const VERSION = /^\d+(?:\.\d+)*$/u

/** One version a stretch of documentation states. */
export interface StatedVersion {
  /** The tool name, as the documentation writes it. */
  readonly name: string
  /** The version, at the depth the documentation writes it. */
  readonly version: string
}

/**
 * The pairs the shields.io badges in a stretch of documentation state.
 *
 * A static badge is `badge/<label>-<message>-<color>`, so the label and the
 * message are the name and the version, and the color is dropped. A message
 * that is not a version — `MIT`, or a list of platforms — states none.
 * @param text - the prose to read.
 * @returns one entry per badge that states a version, in the order written.
 */
export function badgeVersions(text: string): StatedVersion[] {
  const found: StatedVersion[] = []
  for (const match of text.matchAll(BADGE)) {
    const parts = (match[1] ?? '').split('-')
    const message = parts.slice(1, -1).join('-').replaceAll('%20', ' ').replaceAll('_', ' ')
    const words = message.split(' ')
    const version = words.at(-1) ?? ''
    if (!VERSION.test(version)) continue
    const name = [parts[0] ?? '', ...words.slice(0, -1)].join(' ').trim()
    if (name !== '') found.push({ name, version })
  }
  return found
}

/**
 * The versions a stretch of prose states, by tool name.
 *
 * The pair is read off the whole match rather than out of groups: a group is
 * optional to the compiler however certain the pattern is of it, and standing a
 * value in for one that is missing is a line no reading reaches.
 * @param text - the prose to read.
 * @returns tool name to the version written beside it.
 */
export function statedVersions(text: string): Map<string, string> {
  const found = new Map<string, string>()
  for (const claim of statedClaims(text)) found.set(claim.name, claim.version)
  return found
}

/**
 * Every version a stretch of documentation states, prose and badges together.
 * @param text - the prose to read.
 * @returns the claims, in the order they are written.
 */
export function statedClaims(text: string): StatedVersion[] {
  const claims: StatedVersion[] = []
  for (const match of text.matchAll(STATED_VERSION)) {
    // The split is at the last space, because a name may be two words: `Rust
    // edition 2024` names the edition, not a tool called Rust. The pair is read
    // off the whole match rather than out of groups, because a group is
    // optional to the compiler however certain the pattern is of it.
    const gap = match[0].lastIndexOf(' ')
    claims.push({ name: match[0].slice(0, gap), version: match[0].slice(gap + 1) })
  }
  return [...claims, ...badgeVersions(text)]
}

/**
 * Whether a stated version is the pinned one, read to the depth it states.
 *
 * The line writes `Tauri 2.11` against a pin of `2.11.1`: stating fewer parts
 * is a coarser claim, not a wrong one. Stating a part that differs is wrong at
 * any depth, and stating more parts than the pin has is a claim the pin does
 * not support.
 * @param stated - the version the prose writes.
 * @param pinned - the version the manifest declares.
 * @returns true when the prose agrees with the pin.
 */
export function statesPin(stated: string, pinned: string): boolean {
  const actual = pinned.split('.')
  return stated.split('.').every((part, index) => part === actual[index])
}

/**
 * Tools this reader holds to a pin, so a badge and a toolchain line that
 * disagree about one of them cannot hide behind last-wins.
 */
const PINNED_NAMES = new Set([
  BUN_TOOL,
  NODE_TOOL,
  EDITION_TOOL,
  ...Object.keys(DOCUMENTED_TOOLS),
  ...Object.keys(DOCUMENTED_ALIASES),
])

/**
 * Every tool the prose names twice at versions that cannot both be true.
 *
 * A badge stating Playwright 1.62 and a toolchain line stating 1.63.0 used to
 * pass because the reader kept one claim per name, and the badges are read
 * last: a line stating a version the badge contradicts is exactly the claim
 * last-wins hides. Two claims that are not coarsenings of each other are a lie,
 * wherever they sit.
 * @param text - the prose to read.
 * @param held - the names a contradiction is reported for, the named tools by default.
 * @returns one line per tool the prose contradicts itself about.
 */
export function documentationConflicts(text: string, held: ReadonlySet<string> = PINNED_NAMES): string[] {
  const seen = new Map<string, string>()
  const conflicts: string[] = []
  for (const claim of statedClaims(text)) {
    if (!held.has(claim.name)) continue
    const previous = seen.get(claim.name)
    if (previous === undefined) {
      seen.set(claim.name, claim.version)
      continue
    }
    if (previous === claim.version) continue
    if (statesPin(previous, claim.version)) {
      seen.set(claim.name, claim.version)
      continue
    }
    if (statesPin(claim.version, previous)) continue
    conflicts.push(`${claim.name} is documented as both ${previous} and ${claim.version}`)
  }
  return conflicts
}

/** Every pin the documentation is held against. */
export interface Toolchain {
  /** Every dependency the repository declares, name to range. */
  readonly declared: ReadonlyMap<string, string>
  /** The `packageManager` pin, which is where the runtime's version lives. */
  readonly manager: string
  /** The engine range the manifest declares, which is where the compiler's floor lives. */
  readonly engines: string
  /** The edition the crate's manifest declares, or the empty string when none ships. */
  readonly edition: string
}

/**
 * A stated version padded to the three parts a range is read against.
 * @param version - the version the prose writes.
 * @returns the same version at patch depth.
 */
function padded(version: string): string {
  const parts = version.split('.')
  return [parts[0] ?? '0', parts[1] ?? '0', parts[2] ?? '0'].join('.')
}

/**
 * Every package the documentation may name, by the name it writes.
 * @param declared - every dependency the repository declares.
 * @returns lowercase documentation name to the package it names.
 */
function namedPackages(declared: ReadonlyMap<string, string>): Map<string, string> {
  const byBasename = new Map<string, string>()
  for (const name of declared.keys()) {
    const basename = name.slice(name.lastIndexOf('/') + 1).toLowerCase()
    // A basename two packages share names neither of them, so it pins nothing.
    byBasename.set(basename, byBasename.has(basename) ? '' : name)
  }
  for (const [name, packageName] of Object.entries(DOCUMENTED_ALIASES)) {
    byBasename.set(name.toLowerCase(), packageName)
  }
  return byBasename
}

/**
 * Every name a version in the documentation may be written under.
 *
 * The names the toolchain line is required to use, and every package this
 * repository declares under the name its own basename gives it: `@biomejs/biome`
 * is documented as `Biome`, so a sentence about Biome is a sentence about a pin,
 * and two sentences that disagree about it are a contradiction like any other.
 * @param declared - every dependency the repository declares.
 * @returns the names a stated version is held to.
 */
export function documentedNames(declared: ReadonlyMap<string, string>): ReadonlySet<string> {
  const names = new Set(PINNED_NAMES)
  for (const name of declared.keys()) {
    const basename = name.slice(name.lastIndexOf('/') + 1)
    names.add(`${basename.charAt(0).toUpperCase()}${basename.slice(1)}`)
  }
  return names
}

/**
 * Every tool whose documented version disagrees with what is installed.
 *
 * The tools the toolchain line names are held to being named. Every other
 * package the repository declares is held as soon as the documentation states a
 * version for it, so a sentence about Biome, oxlint or Stryker fails the same
 * way a sentence about Playwright does.
 * @param stated - the versions the documentation states.
 * @param toolchain - what the repository installs, and where each pin is read.
 * @returns one line per tool the documentation misstates.
 */
export function documentationDrift(stated: ReadonlyMap<string, string>, toolchain: Toolchain): string[] {
  const drift: string[] = []
  const required = new Map<string, string>()
  for (const [name, dependency] of Object.entries(DOCUMENTED_TOOLS)) {
    const pinned = coerce(toolchain.declared.get(dependency))
    if (pinned === null) {
      drift.push(`${name}: nothing declares ${dependency}`)
      continue
    }
    required.set(name, pinned.version)
  }
  required.set(BUN_TOOL, toolchain.manager.replace(/^bun@/u, ''))
  for (const [name, pinned] of required) {
    const written = stated.get(name)
    if (written === undefined) {
      drift.push(`${name} is pinned at ${pinned} and the toolchain line no longer names it`)
      continue
    }
    if (!statesPin(written, pinned)) drift.push(`${name} is documented as ${written} and pinned at ${pinned}`)
  }
  const engines = toolchain.engines
  const node = stated.get(NODE_TOOL)
  if (node === undefined) {
    drift.push(`${NODE_TOOL} is pinned at ${engines} and the toolchain line no longer names it`)
  } else if (!satisfies(padded(node), engines)) {
    drift.push(`${NODE_TOOL} is documented as ${node} and the manifest admits ${engines}`)
  }
  const edition = stated.get(EDITION_TOOL)
  if (toolchain.edition === '') {
    drift.push(`${EDITION_TOOL} is documented and no crate manifest states an edition`)
  } else if (edition === undefined) {
    drift.push(`${EDITION_TOOL} is ${toolchain.edition} and the toolchain line no longer names it`)
  } else if (edition !== toolchain.edition) {
    drift.push(`${EDITION_TOOL} is documented as ${edition} and the crate ships ${toolchain.edition}`)
  }
  const packages = namedPackages(toolchain.declared)
  for (const [name, version] of stated) {
    if (required.has(name) || name === NODE_TOOL || name === EDITION_TOOL) continue
    const packageName = packages.get(name.toLowerCase())
    if (packageName === undefined || packageName === '') continue
    const pinned = coerce(toolchain.declared.get(packageName))
    if (pinned === null) continue
    if (!statesPin(version, pinned.version)) {
      drift.push(`${name} is documented as ${version} and pinned at ${pinned.version}`)
    }
  }
  return drift
}
