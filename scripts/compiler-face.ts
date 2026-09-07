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
const TS6_MODULES = new Set(['commonjs', 'amd', 'umd', 'system', 'none', 'es6', 'es2015'])

/** Resolution values the TypeScript 6 compiler used before bundler/nodenext. */
const TS6_RESOLUTIONS = new Set(['node', 'node10', 'classic'])

/**
 * Targets below `esnext`. A face that emits ES5/ES6/ES2020 is a TypeScript 6
 * (or earlier) default this repository does not ship.
 */
const LEGACY_TARGETS = new Set([
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
 * A compilerOptions value as a lowercased string, or empty when it is not one.
 * @param value - the option's JSON value.
 * @returns the string form, lowercased.
 */
function optionString(value: Json | undefined): string {
  return typeof value === 'string' ? value.toLowerCase() : ''
}

/**
 * The compilerOptions keys the TypeScript 6 and 7 faces are read through.
 *
 * The reader takes a parsed compilerOptions section, which is arbitrary JSON;
 * declaring the keys the face reads lets each be addressed plainly while the
 * checker keeps refusing an undeclared one.
 */
export interface CompilerOptions {
  readonly module?: Json
  readonly moduleResolution?: Json
  readonly target?: Json
  readonly skipLibCheck?: Json
  readonly strict?: Json
  readonly importsNotUsedAsValues?: Json
  readonly preserveValueImports?: Json
  readonly downlevelIteration?: Json
}

/**
 * Every TypeScript 6 (or earlier) option a compilerOptions section states.
 * @param options - one tsconfig's compilerOptions.
 * @returns one line per refused option, empty when the face is TypeScript 7.
 */
export function compilerFaceOffences(options: CompilerOptions): string[] {
  const offences: string[] = []
  const moduleValue = optionString(options.module)
  if (TS6_MODULES.has(moduleValue)) {
    offences.push(`module ${moduleValue} is a TypeScript 6 module system; use esnext with bundler resolution`)
  }
  const resolution = optionString(options.moduleResolution)
  if (TS6_RESOLUTIONS.has(resolution)) {
    offences.push(`moduleResolution ${resolution} is a TypeScript 6 resolver; use bundler`)
  }
  const target = optionString(options.target)
  if (LEGACY_TARGETS.has(target)) {
    offences.push(`target ${target} is a TypeScript ≤6 emit face; use esnext`)
  }
  for (const flag of TS6_FLAGS) {
    if (options[flag] !== undefined) {
      offences.push(`${flag} is a TypeScript 6 module-interop flag; TypeScript 7 verbatimModuleSyntax replaced it`)
    }
  }
  if (options.skipLibCheck === true) {
    offences.push("skipLibCheck silences a dependency's diagnostics instead of fixing them")
  }
  if (options.strict === false) {
    offences.push('strict is off; the TypeScript 7 face keeps it on')
  }
  return offences
}
