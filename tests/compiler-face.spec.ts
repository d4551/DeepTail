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
import { compilerFaceOffences } from '../scripts/compiler-face.ts'
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
  const options = document['compilerOptions']
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
    expect(options['types'] ?? []).toEqual([])
    const projects = ['apps/deeptail/tsconfig.json', 'tsconfig.tools.json']
    const faces = await Promise.all(projects.map(async (path) => (await compilerOptionsOf(path))['types']))
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

/**
 * What the face reports for each value one option may state.
 * @param option - the option the values are written under.
 * @param values - the values to state, one configuration each.
 * @returns one finding list per value.
 */
function refusals(option: string, values: readonly string[]): string[][] {
  return values.map((value) => compilerFaceOffences({ [option]: value }))
}

describe('the TypeScript 6 compiler face', () => {
  it('is refused, option by option, and each finding says which option and why', () => {
    // The line is what a reader acts on: it has to name the option, the value
    // the file states, and the face to move to.
    expect(compilerFaceOffences({ module: 'commonjs', target: 'ES5', moduleResolution: 'node' })).toEqual([
      'module commonjs is a TypeScript 6 module system; use esnext with bundler resolution',
      'moduleResolution node is a TypeScript 6 resolver; use bundler',
      'target es5 is a TypeScript ≤6 emit face; use esnext',
    ])
    expect(compilerFaceOffences({ module: 'AMD', target: 'ES6' })).toEqual([
      'module amd is a TypeScript 6 module system; use esnext with bundler resolution',
      'target es6 is a TypeScript ≤6 emit face; use esnext',
    ])
    for (const flag of ['importsNotUsedAsValues', 'preserveValueImports', 'downlevelIteration']) {
      expect(compilerFaceOffences({ [flag]: 'remove' })).toEqual([
        `${flag} is a TypeScript 6 module-interop flag; TypeScript 7 verbatimModuleSyntax replaced it`,
      ])
    }
    expect(compilerFaceOffences({ skipLibCheck: true })).toEqual([
      "skipLibCheck silences a dependency's diagnostics instead of fixing them",
    ])
    expect(compilerFaceOffences({ strict: false })).toEqual(['strict is off; the TypeScript 7 face keeps it on'])
  })
})

describe('every value the TypeScript 6 face may state', () => {
  it('is refused, module system by module system and resolver by resolver', () => {
    // A member nothing states is a member the reader could stop refusing with
    // no configuration noticing, and the first tsconfig to restore it would be
    // reported as canonical.
    const modules = ['commonjs', 'amd', 'umd', 'system', 'none', 'es6', 'es2015']
    expect(refusals('module', modules)).toEqual(
      modules.map((value) => [`module ${value} is a TypeScript 6 module system; use esnext with bundler resolution`]),
    )
    const resolutions = ['node', 'node10', 'classic']
    expect(refusals('moduleResolution', resolutions)).toEqual(
      resolutions.map((value) => [`moduleResolution ${value} is a TypeScript 6 resolver; use bundler`]),
    )
  })
})

describe('every emit face below esnext', () => {
  it('is refused, one by one', () => {
    const targets = [
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
    ]
    expect(refusals('target', targets)).toEqual(
      targets.map((value) => [`target ${value} is a TypeScript ≤6 emit face; use esnext`]),
    )
  })

  it('reports nothing against the face this repository ships', () => {
    // Every named option, at the value the base states. A reader that reported
    // one of these would report the shipped configuration as a finding.
    expect(
      compilerFaceOffences({
        module: 'esnext',
        moduleResolution: 'bundler',
        target: 'esnext',
        strict: true,
        skipLibCheck: false,
      }),
    ).toEqual([])
  })

  it('reads an option written as anything but a string as stating nothing', () => {
    // A tsconfig that writes a number where a face belongs states no face, and
    // a reader that lowercased it would fail on the value rather than report.
    expect(compilerFaceOffences({ module: 6, moduleResolution: null, target: ['es5'] })).toEqual([])
  })

  it('is absent from every tsconfig this repository ships', async () => {
    const labels = shippedConfigs()
    const faces = await Promise.all(labels.map(async (label) => compilerFaceOffences(await compilerOptionsOf(label))))
    expect(labels.flatMap((label, index) => (faces[index] ?? []).map((line) => `${label}: ${line}`))).toEqual([])
  })
})
