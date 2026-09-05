/**
 * The canonical TypeScript 7 compiler face.
 *
 * TypeScript 7 writes a recommended configuration with `tsc --init`. This suite
 * holds `tsconfig.base.json` to that face option by option: every option the
 * generated file enables is stated here at the value it carries there, plus the
 * two style options this repository turns on beyond it. Stating each option in
 * the file, rather than inheriting it, is what keeps an upgrade from moving a
 * default underneath a build.
 *
 * `skipLibCheck` is the one generated recommendation this repository declines,
 * so it is asserted absent: a configuration that silences a dependency's
 * diagnostics is the shape this suite reports.
 */

import { describe, expect, it } from 'bun:test'
import { EMPTY_SECTION, isJsonObject, type Json, readJsonc } from '../scripts/jsonc.ts'
import { repositoryFiles } from '../scripts/source-tree.ts'

/** The path whose compilerOptions every project inherits. */
const BASE = 'tsconfig.base.json'

/**
 * The canonical face, as `tsc --init` writes it on TypeScript 7, with the two
 * style options this repository turns on beyond it. Each entry is the option
 * name and the value it must carry; an option missing from the file is a
 * finding, not a default to fall back on.
 */
const CANONICAL: readonly (readonly [string, string | boolean])[] = [
  ['target', 'esnext'],
  ['module', 'esnext'],
  ['moduleResolution', 'bundler'],
  ['moduleDetection', 'force'],
  ['strict', true],
  ['declaration', true],
  ['declarationMap', true],
  ['sourceMap', true],
  ['isolatedModules', true],
  ['verbatimModuleSyntax', true],
  ['noUncheckedSideEffectImports', true],
  ['noUncheckedIndexedAccess', true],
  ['exactOptionalPropertyTypes', true],
  ['noImplicitOverride', true],
  ['noFallthroughCasesInSwitch', true],
  ['noImplicitReturns', true],
  ['noUnusedLocals', true],
  ['noUnusedParameters', true],
]

/**
 * Read one shipped configuration's compiler options, on the closed Json model
 * the shared reader returns: an option's value is whatever JSON admits, and the
 * comparisons below read it as the Json it is.
 * @param path - repository-relative path to the file.
 * @returns its options, or the empty section when it declares none.
 */
async function compilerOptionsOf(path: string): Promise<{ [key: string]: Json }> {
  const document = readJsonc(await Bun.file(path).text())
  const options = document.compilerOptions
  if (options === undefined) return EMPTY_SECTION
  if (!isJsonObject(options)) throw new Error(`${path}: compilerOptions is not an object`)
  return options
}

/**
 * Read one option out of a parsed compilerOptions section.
 * @param options - the section to read, on the closed Json model.
 * @param name - the option to read.
 * @returns the option's value, or null when the file does not name it.
 */
function optionValue(options: { [key: string]: Json }, name: string): Json | null {
  return options[name] ?? null
}

/**
 * The shipped configurations, as git lists them.
 * @returns every tsconfig the repository ships.
 */
function shippedConfigs(): readonly string[] {
  return repositoryFiles(['.json'])
    .map((file) => file.label)
    .filter((label) => /tsconfig[^/]*\.json$/u.test(label))
}

describe('the canonical TypeScript 7 compiler face', () => {
  it('states every canonical option, at its canonical value', async () => {
    const options = await compilerOptionsOf(BASE)
    const drift = CANONICAL.filter(([name, want]) => optionValue(options, name) !== want).map(
      ([name, want]) => `${name}: expected ${String(want)}, found ${String(optionValue(options, name))}`,
    )
    expect(drift).toEqual([])
  })

  it('names its ambient types per project rather than inheriting the universe', async () => {
    const options = await compilerOptionsOf(BASE)
    // The base declares an empty set and each project adds exactly what it
    // imports, so no project compiles against a global it never asked for.
    expect(options.types ?? []).toEqual([])
    const projects = ['apps/deeptail/tsconfig.json', 'tsconfig.tools.json']
    const faces = await Promise.all(projects.map(async (path) => (await compilerOptionsOf(path)).types))
    expect(faces.map((types) => Array.isArray(types) && types.length > 0)).toEqual([true, true])
  })

  it('declines skipLibCheck in every configuration the repository ships', async () => {
    const labels = shippedConfigs()
    const faces = await Promise.all(labels.map(async (label) => await compilerOptionsOf(label)))
    const softened = labels.filter((_, index) => optionValue(faces[index] ?? EMPTY_SECTION, 'skipLibCheck') === true)
    expect(softened).toEqual([])
  })

  it('keeps strict on in every configuration the repository ships', async () => {
    const labels = shippedConfigs()
    const faces = await Promise.all(labels.map(async (label) => await compilerOptionsOf(label)))
    const switchedOff = labels.filter((_, index) => optionValue(faces[index] ?? EMPTY_SECTION, 'strict') === false)
    expect(switchedOff).toEqual([])
  })
})
