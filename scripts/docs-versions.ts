/**
 * The versions the documentation states, read back against the manifests.
 *
 * A version written in prose is a version nothing re-reads. The README's
 * toolchain line said Playwright 1.62.1 while the workspace installed 1.63.0,
 * and no gate in the chain had any reason to look: the floors read manifests,
 * the outdated gate reads the registry, and neither reads a sentence. This
 * module is what turns that sentence into something that can fail.
 *
 * @module
 */

import { coerce } from 'semver'

/**
 * The tools the README's toolchain line names, and the pin each one states.
 *
 * `Bun` is absent here and read from the `packageManager` pin instead, because
 * that is where the runtime this repository runs on is pinned.
 */
const DOCUMENTED_TOOLS: Readonly<Record<string, string>> = {
  TypeScript: 'typescript',
  Tauri: '@tauri-apps/api',
  Vite: 'vite',
  Playwright: 'playwright',
}

/** One `Name 1.2.3` pair, as the toolchain line writes it. */
const STATED_VERSION = /\b[A-Z][A-Za-z]+ \d+(?:\.\d+)*\b/gu

/**
 * The versions a stretch of prose states, by tool name.
 *
 * The pair is read off the whole match rather than out of groups: a group is
 * optional to the compiler however certain the pattern is of it, and standing a
 * value in for one that cannot be missing is a line no reading reaches.
 * @param text - the prose to read.
 * @returns tool name to the version written beside it.
 */
export function statedVersions(text: string): Map<string, string> {
  const found = new Map<string, string>()
  for (const match of text.matchAll(STATED_VERSION)) {
    const gap = match[0].indexOf(' ')
    found.set(match[0].slice(0, gap), match[0].slice(gap + 1))
  }
  return found
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
const PINNED_NAMES = new Set(['Bun', ...Object.keys(DOCUMENTED_TOOLS)])

/**
 * Every tool the prose names twice at versions that cannot both be true.
 *
 * A badge stating Playwright 1.62 and a toolchain line stating 1.63.0 used to
 * pass because the reader kept only the last match. Two claims that are not
 * coarsenings of each other are a lie, wherever they sit.
 * @param text - the prose to read.
 * @returns one line per tool the prose contradicts itself about.
 */
export function documentationConflicts(text: string): string[] {
  const seen = new Map<string, string>()
  const conflicts: string[] = []
  for (const match of text.matchAll(STATED_VERSION)) {
    const gap = match[0].indexOf(' ')
    const name = match[0].slice(0, gap)
    const version = match[0].slice(gap + 1)
    if (!PINNED_NAMES.has(name)) continue
    const previous = seen.get(name)
    if (previous === undefined) {
      seen.set(name, version)
      continue
    }
    if (previous === version) continue
    if (statesPin(previous, version)) {
      seen.set(name, version)
      continue
    }
    if (statesPin(version, previous)) continue
    conflicts.push(`${name} is documented as both ${previous} and ${version}`)
  }
  return conflicts
}

/**
 * Every tool whose documented version disagrees with what is installed.
 * @param stated - the versions the prose states.
 * @param declared - every dependency the repository declares.
 * @param manager - the `packageManager` pin, which is where bun's version lives.
 * @returns one line per tool the documentation misstates.
 */
export function documentationDrift(
  stated: ReadonlyMap<string, string>,
  declared: ReadonlyMap<string, string>,
  manager: string,
): string[] {
  const drift: string[] = []
  const pins = new Map<string, string>([['Bun', manager.replace(/^bun@/u, '')]])
  for (const [name, dependency] of Object.entries(DOCUMENTED_TOOLS)) {
    const pinned = coerce(declared.get(dependency))
    if (pinned === null) {
      drift.push(`${name}: nothing declares ${dependency}`)
      continue
    }
    pins.set(name, pinned.version)
  }
  for (const [name, pinned] of pins) {
    const written = stated.get(name)
    if (written === undefined) {
      drift.push(`${name} is pinned at ${pinned} and the toolchain line no longer names it`)
      continue
    }
    if (!statesPin(written, pinned)) drift.push(`${name} is documented as ${written} and pinned at ${pinned}`)
  }
  return drift
}
