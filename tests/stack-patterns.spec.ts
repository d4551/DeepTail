/**
 * The retired idioms a current version number can still carry.
 *
 * A floor refuses a package that slipped back a line and never reads the idiom
 * inside a version that is current, so each rule here is driven twice: once
 * against a fixture that plants the idiom, asserting the exact finding, and
 * once against what this repository actually ships, asserting silence. A rule
 * that has only ever been seen passing is not evidence of anything.
 *
 * The rules themselves live where their subject lives. The bundler and
 * transformer files and the stylesheet markers are in `stack-patterns.ts`; the
 * options TypeScript 6 deprecated and TypeScript 7 dropped are read by
 * `compiler-face.ts`, beside the module system, resolver and emit faces it
 * already refuses, so one function answers for the whole compiler face.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { compilerFaceOffences } from '../scripts/compiler-face.ts'
import { isJsonObject, readJsonc } from '../scripts/jsonc.ts'
import { repositoryFiles } from '../scripts/source-tree.ts'
import { joined, source } from './fixtures.ts'
import { isRetiredBuildPipeline, retiredSheetOffences } from './stack-patterns.ts'
import { isRetiredPipelineConfig } from './stack-policy.ts'
import { TREE_SCAN_BUDGET_MS } from './tree-budget.ts'

/** The reason a marked property is refused, with the property it names. */
function marked(property: string): string {
  return `${property} carries the star or underscore marker, which only a rendering engine no browser in the installed Vite's baseline is ever read`
}

/** The reason a preprocessor variable is refused, with the variable it names. */
function variable(property: string): string {
  return `${property} is a preprocessor variable; a CSS engine reads none, and this repository ships its stylesheets as CSS`
}

/** The reason a trailing escape is refused. */
function escaped(value: string, marker: string): string {
  return `${value} ends in ${marker}, a marker only a rendering engine no browser in the installed Vite's baseline is ever read`
}

/** The reason an interpolation is refused. */
const INTERPOLATION_WHY =
  '#{ opens a preprocessor interpolation; a CSS engine reads none, and this repository ships its stylesheets as CSS'

/** The five options TypeScript 6 deprecated and TypeScript 7 dropped. */
const DROPPED_OPTIONS = 'baseUrl outFile esModuleInterop allowSyntheticDefaultImports alwaysStrict'.split(/\s+/u)

/** The stem the replaced bundler names its configuration with, assembled. */
const ROLLUP = joined('roll', 'up')

/** The stem the replaced transformer names its configuration with, assembled. */
const ESBUILD = joined('esbuild')

/** One stylesheet at a time, with its path, for a whole-tree scan. */
function everyShippedSheet(): { readonly label: string; readonly text: string }[] {
  return repositoryFiles(['.css']).map((file) => ({ label: file.label, text: readFileSync(file.path, 'utf8') }))
}

describe('the pipeline files the installed bundler replaced', () => {
  it('names the bundler and the transformer, at every extension a config uses', () => {
    // Vite 8's own migration guide: "Vite 8 uses Rolldown and Oxc based tools
    // instead of esbuild and Rollup." A file configuring either of the replaced
    // tools configures a step this build never runs.
    const planted = [
      `${ROLLUP}.config.js`,
      `${ROLLUP}.config.mjs`,
      `${ROLLUP}.config.cjs`,
      `${ROLLUP}.config.ts`,
      `${ROLLUP}.config.mts`,
      `${ESBUILD}.config.js`,
      `${ESBUILD}.config.ts`,
      `apps/deeptail/${ROLLUP}.config.mjs`,
    ]
    expect(planted.filter((label) => isRetiredBuildPipeline(label))).toEqual(planted)
  })

  it('admits the toolchain’s own configuration, however close a name sits to one', () => {
    const admitted = [
      'apps/deeptail/vite.config.ts',
      'bunfig.toml',
      'biome.json',
      '.oxlintrc.json',
      'tsconfig.base.json',
      'knip.json',
      'apps/deeptail/index.html',
      'scripts/build-report.ts',
    ]
    expect(admitted.filter((label) => isRetiredBuildPipeline(label))).toEqual([])
  })
})

describe('the two pipeline file rules each answer for their own subject', () => {
  it('refuses a name the stylesheet-pipeline rule never reads, and the other way round', () => {
    // The two file rules cover disjoint pipelines, so neither answers for the
    // other: a reintroduction of either arrives under a name only one of them
    // knows.
    expect(
      [`${ROLLUP}.config.js`, 'postcss.config.js', 'uno.config.mjs'].map((label) => [
        isRetiredBuildPipeline(label),
        isRetiredPipelineConfig(label),
      ]),
    ).toEqual([
      [true, false],
      [false, true],
      [false, true],
    ])
  })

  it(
    'ships none of them',
    () => {
      const shipped = repositoryFiles(['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts', '.json', '.toml']).map(
        (file) => file.label,
      )
      expect(shipped.filter((label) => isRetiredBuildPipeline(label))).toEqual([])
      // The controls: the bundler and the installer are configured by files of
      // the same shape, and neither of them belongs to a replaced tool.
      expect(shipped).toContain('apps/deeptail/vite.config.ts')
      expect(shipped).toContain('bunfig.toml')
    },
    TREE_SCAN_BUDGET_MS,
  )
})

describe('the retired idioms a stylesheet can carry', () => {
  it('names the star marker, the underscore marker and the variable', () => {
    // The star and the underscore are the cascade markers an IE-era engine read
    // and every other engine dropped; the dollar is a preprocessor variable, and
    // no CSS engine has ever had one.
    expect(retiredSheetOffences('a.css', source('.a { *color: red; }'))).toEqual([
      { label: 'a.css', line: 1, why: marked('*color') },
    ])
    expect(retiredSheetOffences('a.css', source('.a { _gap: 1rem; }'))).toEqual([
      { label: 'a.css', line: 1, why: marked('_gap') },
    ])
    expect(retiredSheetOffences('a.css', source('.a { $gap: 1rem; }'))).toEqual([
      { label: 'a.css', line: 1, why: variable('$gap') },
    ])
  })

  it('names the escape a value ends in, and the interpolation a sheet opens', () => {
    expect(retiredSheetOffences('a.css', source('.a { color: red\\9; }'))).toEqual([
      { label: 'a.css', line: 1, why: escaped('red\\9', '\\9') },
    ])
    expect(retiredSheetOffences('a.css', source('.a { color: red\\0; }'))).toEqual([
      { label: 'a.css', line: 1, why: escaped('red\\0', '\\0') },
    ])
    expect(retiredSheetOffences('a.css', source('.a { width: #{$gap}; }'))).toEqual([
      { label: 'a.css', line: 1, why: INTERPOLATION_WHY },
    ])
  })

  it('names the line each one sits on, and reads a sheet minified onto one line', () => {
    const sheet = source('.a { color: var(--dsh-text); }', '.b {', '  _gutter: 0;', '}')
    expect(retiredSheetOffences('a.css', sheet)).toEqual([{ label: 'a.css', line: 3, why: marked('_gutter') }])
    expect(retiredSheetOffences('a.css', '.a{_gutter:0}')).toEqual([
      { label: 'a.css', line: 1, why: marked('_gutter') },
    ])
  })
})

describe('the sheets a stylesheet rule admits', () => {
  it('admits an escape inside a string, which is a character rather than a marker', () => {
    // The escape marker is a cascade trick at the end of a value. The same two
    // characters inside a quoted string are that string's own content, and a
    // reader that did not tell them apart would refuse a sheet that is CSS.
    expect(retiredSheetOffences('a.css', source('.a { content: "\\9"; }'))).toEqual([])
    expect(retiredSheetOffences('a.css', source(".a { content: '\\0'; }"))).toEqual([])
  })

  it('admits a sheet that reads the scale, the palette and the container', () => {
    const clean = source(
      '.a {',
      '  color: var(--dsh-text);',
      '  margin-inline-start: var(--dsh-space-2);',
      '  --local: var(--dsh-space-1);',
      '}',
      '@container card (width >= 40rem) {',
      '  .a { padding-inline: var(--dsh-space-3); }',
      '}',
    )
    expect(retiredSheetOffences('a.css', clean)).toEqual([])
  })

  it(
    'reads every sheet this repository ships as carrying none of them',
    () => {
      const sheets = everyShippedSheet()
      expect(sheets.length).toBeGreaterThan(0)
      expect(sheets.flatMap((sheet) => retiredSheetOffences(sheet.label, sheet.text))).toEqual([])
    },
    TREE_SCAN_BUDGET_MS,
  )
})

describe('the options TypeScript 6 deprecated and TypeScript 7 dropped', () => {
  it('names each one, with the face to move to', () => {
    // The TypeScript 6.0 release notes deprecated every one of these by name,
    // and state the term that decides this suite: "TypeScript 7.0 will not
    // support any of these deprecated options."
    expect(compilerFaceOffences({ baseUrl: '.' })).toEqual([
      'baseUrl is the TypeScript 6 paths base TypeScript 7 dropped; prefix each paths entry instead',
    ])
    expect(compilerFaceOffences({ outFile: './dist/bundle.js' })).toEqual([
      'outFile is the TypeScript 6 single-file emit TypeScript 7 dropped; let the bundler bundle',
    ])
    expect(compilerFaceOffences({ esModuleInterop: false })).toEqual([
      'esModuleInterop is off; the TypeScript 7 face keeps the ESM interop on',
    ])
    expect(compilerFaceOffences({ allowSyntheticDefaultImports: false })).toEqual([
      'allowSyntheticDefaultImports is off; the TypeScript 7 face keeps the synthetic defaults on',
    ])
    expect(compilerFaceOffences({ alwaysStrict: false })).toEqual([
      'alwaysStrict is off; the TypeScript 7 face keeps every file strict',
    ])
  })

  it('reports every one of them at once, rather than the first it meets', () => {
    const everyOption = {
      baseUrl: '.',
      outFile: './dist/bundle.js',
      esModuleInterop: false,
      allowSyntheticDefaultImports: false,
      alwaysStrict: false,
    }
    expect(compilerFaceOffences(everyOption)).toEqual([
      'baseUrl is the TypeScript 6 paths base TypeScript 7 dropped; prefix each paths entry instead',
      'outFile is the TypeScript 6 single-file emit TypeScript 7 dropped; let the bundler bundle',
      'esModuleInterop is off; the TypeScript 7 face keeps the ESM interop on',
      'allowSyntheticDefaultImports is off; the TypeScript 7 face keeps the synthetic defaults on',
      'alwaysStrict is off; the TypeScript 7 face keeps every file strict',
    ])
  })
})

describe('the values those five options may state', () => {
  it('reads a value the compiler keeps, or one that is not a boolean, as stating nothing', () => {
    expect(compilerFaceOffences({ esModuleInterop: true, allowSyntheticDefaultImports: true })).toEqual([])
    expect(compilerFaceOffences({ alwaysStrict: true })).toEqual([])
    expect(compilerFaceOffences({ esModuleInterop: 'true', alwaysStrict: 0 })).toEqual([])
  })

  it(
    'reads every tsconfig this repository ships as stating none of them',
    async () => {
      const labels = repositoryFiles(['.json'])
        .map((file) => file.label)
        .filter((label) => /tsconfig[^/]*\.json$/u.test(label))
      expect(labels.length).toBeGreaterThan(0)
      const stated = await Promise.all(
        labels.map(async (label) => {
          const parsed = readJsonc(await readFile(label, 'utf8'))
          const options = parsed.compilerOptions
          const section = isJsonObject(options) ? options : {}
          return DROPPED_OPTIONS.filter((option) => section[option] !== undefined).map(
            (option) => `${label}: ${option}`,
          )
        }),
      )
      expect(stated.flat()).toEqual([])
    },
    TREE_SCAN_BUDGET_MS,
  )
})
