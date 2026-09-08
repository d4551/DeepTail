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
const STATED_VERSION = /\b([A-Z][A-Za-z]+) (\d+(?:\.\d+)*)\b/gu

/**
 * The versions a stretch of prose states, by tool name.
 * @param text - the prose to read.
 * @returns tool name to the version written beside it.
 */
export function statedVersions(text: string): Map<string, string> {
  return new Map([...text.matchAll(STATED_VERSION)].map((match) => [match[1] ?? '', match[2] ?? '']))
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
  const parts = stated.split('.')
  const actual = pinned.split('.')
  if (parts.length > actual.length) return false
  return parts.every((part, index) => part === actual[index])
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
    const pinned = coerce(declared.get(dependency) ?? '')
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
