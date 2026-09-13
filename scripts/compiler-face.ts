/**
 * TypeScript 6 compiler-face options this repository refuses.
 *
 * The shipped face is TypeScript 7's bundler face (`module` esnext,
 * `moduleResolution` bundler, `target` esnext). `tsc --init` on TypeScript 7
 * writes a Node face (`module` nodenext); this product is a Vite/Tauri
 * bundler, so it does not inherit that. What it must not restore is the
 * TypeScript 6 module system and the flags that existed to paper over it.
 *
 * @module
 */

import type { Json } from './jsonc.ts'

/** Module values the TypeScript 6 compiler shipped as its common face. */
const TS6_MODULES = new Set(['commonjs', 'amd', 'umd', 'system', 'none', 'es6', 'es2015', 'node16'])

/** Resolution values the TypeScript 6 compiler used before bundler/nodenext. */
const TS6_RESOLUTIONS = new Set(['node', 'node10', 'classic', 'node16'])

/**
 * Targets below `esnext`. A face that emits ES5/ES6/ES2020 is a TypeScript 6
 * (or earlier) default this repository does not ship.
 */
const SUPERSEDED_TARGETS = new Set([
  'es3',
  'es5',
  'es6',
  'es2015',
  'es2016',
  'es2017',
  'es2018',
  'es2019',
  'es2020',
  'es2021',
  'es2022',
  'es2023',
  'es2024',
])

/**
 * Options TypeScript 6 used to keep the old module system working. Stating
 * one is restoring that system, even when `module` itself says esnext.
 */
const TS6_FLAGS = ['importsNotUsedAsValues', 'preserveValueImports', 'downlevelIteration'] as const

/**
 * The value an option states, when the set names it.
 *
 * An option written as anything but a string states no value at all, rather
 * than standing in as one: a value read in for an option nobody wrote is a
 * finding reported against a file that does not say it.
 * @param value - the option's JSON value.
 * @param named - the values the set holds, lowercased.
 * @returns the stated value, lowercased, or undefined when the set lacks it.
 */
function statedOneOf(value: Json | undefined, named: ReadonlySet<string>): string | undefined {
  if (typeof value !== 'string') return undefined
  const stated = value.toLowerCase()
  return named.has(stated) ? stated : undefined
}

/**
 * Every TypeScript 6 (or earlier) option a compilerOptions section states.
 * @param options - one tsconfig's compilerOptions.
 * @returns one line per refused option, empty when the face is TypeScript 7.
 */
export function compilerFaceOffences(options: { readonly [key: string]: Json }): string[] {
  const offences: string[] = []
  const moduleValue = statedOneOf(options['module'], TS6_MODULES)
  if (moduleValue !== undefined) {
    offences.push(`module ${moduleValue} is a TypeScript 6 module system; use esnext with bundler resolution`)
  }
  const resolution = statedOneOf(options['moduleResolution'], TS6_RESOLUTIONS)
  if (resolution !== undefined) {
    offences.push(`moduleResolution ${resolution} is a TypeScript 6 resolver; use bundler`)
  }
  const target = statedOneOf(options['target'], SUPERSEDED_TARGETS)
  if (target !== undefined) {
    offences.push(`target ${target} is a TypeScript ≤6 emit face; use esnext`)
  }
  for (const flag of TS6_FLAGS) {
    if (options[flag] !== undefined) {
      offences.push(`${flag} is a TypeScript 6 module-interop flag; TypeScript 7 verbatimModuleSyntax replaced it`)
    }
  }
  if (options['skipLibCheck'] === true) {
    offences.push("skipLibCheck silences a dependency's diagnostics instead of fixing them")
  }
  if (options['ignoreDeprecations'] !== undefined) {
    offences.push('ignoreDeprecations keeps a TypeScript 6 option working; remove the option')
  }
  if (options['strict'] === false) {
    offences.push('strict is off; the TypeScript 7 face keeps it on')
  }
  if (options['isolatedModules'] === false) {
    offences.push('isolatedModules is off; the TypeScript 7 face keeps it on')
  }
  if (options['verbatimModuleSyntax'] === false) {
    offences.push('verbatimModuleSyntax is off; the TypeScript 7 face keeps it on')
  }
  if (options['erasableSyntaxOnly'] === false) {
    offences.push('erasableSyntaxOnly is off; TypeScript 7 uses it to refuse enum, namespace, and import-equals')
  }
  return offences
}
