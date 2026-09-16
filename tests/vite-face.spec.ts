/**
 * The config keys the installed Vite replaced, and the preprocessors it loads
 * options for.
 *
 * Every key refused here is read out of the installed Vite's own declarations,
 * so the check moves with the bundler and a key that could only have come from
 * memory is caught by the case that drives it. The replacement text in each
 * finding is Vite's own.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { ROOT } from '../scripts/source-tree.ts'
import { TREE_SCAN_BUDGET_MS } from './tree-budget.ts'
import { installedVite, viteFaceOffences, vitePreprocessorNames, viteSupersededKeys } from './vite-face.ts'

/** The installed Vite's declarations, which the config keys are read from. */
const VITE_DECLARATIONS = installedVite('.d.ts')

/** The shipped config, and the path the planted cases report against. */
const SHIPPED_CONFIG = 'apps/deeptail/vite.config.ts'
const CONFIG = SHIPPED_CONFIG

/**
 * A config that states one key, on its fourth line.
 * @param stated - the key to write into the object.
 * @returns the config's contents.
 */
function configStating(stated: string): string {
  return `import { defineConfig } from 'vite'\n\nexport default defineConfig({\n  ${stated}\n})\n`
}

describe('the config keys the installed Vite replaced', () => {
  it('derives the paths it refuses from the installed declarations', () => {
    const keys = [...viteSupersededKeys(VITE_DECLARATIONS).keys()]
    expect(keys).toContain('build.rollupOptions')
    expect(keys).toContain('build.commonjsOptions')
    expect(keys).toContain('build.polyfillModulePreload')
    expect(keys).toContain('optimizeDeps.esbuildOptions')
    expect(keys).toContain('optimizeDeps.rollupOptions')
    expect(keys).toContain('server.hmr.port')
    expect(keys).toContain('worker.rollupOptions')
    expect(keys).toContain('esbuild')
    expect([...vitePreprocessorNames(VITE_DECLARATIONS)].toSorted()).toEqual(['less', 'sass', 'scss', 'styl', 'stylus'])
  })

  it('names each superseded path, with the replacement Vite itself states', () => {
    const cases: readonly (readonly [string, string])[] = [
      ['build: { rollupOptions: { input: "x" } },', 'Use `rolldownOptions` instead.'],
      ['esbuild: false,', 'Use `oxc` option instead.'],
      ['server: { hmr: { port: 1 } },', 'Use `server.ws.port` instead.'],
      ['optimizeDeps: { esbuildOptions: {} },', 'Use `rolldownOptions` instead.'],
      ['build: { commonjsOptions: {} },', 'This option is no-op and will be removed in future versions.'],
    ]
    expect(cases.map(([stated]) => viteFaceOffences(VITE_DECLARATIONS, CONFIG, configStating(stated)))).toEqual(
      cases.map(([, said]) => [
        {
          label: CONFIG,
          line: 4,
          why: `it is a Vite ≤7 config key the installed Vite marks @deprecated: ${said}`,
        },
      ]),
    )
  })
})

describe('the face the installed Vite reads a config with', () => {
  it('refuses a config that turns a preprocessor on', () => {
    expect(
      viteFaceOffences(VITE_DECLARATIONS, CONFIG, configStating('css: { preprocessorOptions: { sass: {} } },')),
    ).toEqual([
      {
        label: CONFIG,
        line: 4,
        why: 'it turns on the sass preprocessor, a stylesheet dialect this design system retired',
      },
    ])
  })

  it(
    'reads the shipped config as stating neither',
    () => {
      // The other half of every refusal above: the config this repository ships
      // states no superseded key and turns no preprocessor on.
      expect(
        viteFaceOffences(VITE_DECLARATIONS, SHIPPED_CONFIG, readFileSync(`${ROOT}${SHIPPED_CONFIG}`, 'utf8')),
      ).toEqual([])
    },
    TREE_SCAN_BUDGET_MS,
  )

  it('refuses a config whose keys are not written out, or not readable at all', () => {
    expect(viteFaceOffences(VITE_DECLARATIONS, CONFIG, configStating('...shared,'))).toEqual([
      { label: CONFIG, line: 4, why: 'the configuration root carries a property that is not a key written out' },
    ])
    const truncated = 'import { defineConfig } from "vite"\nexport default defineConfig({\n'
    expect(viteFaceOffences(VITE_DECLARATIONS, CONFIG, truncated)).toEqual([
      { label: CONFIG, line: 1, why: 'it does not parse, so no key it states can be read' },
    ])
    expect(viteFaceOffences(VITE_DECLARATIONS, CONFIG, 'export const nothing = 1\n')).toEqual([
      { label: CONFIG, line: 1, why: 'it states no configuration object' },
    ])
  })
})
