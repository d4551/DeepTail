/**
 * The dialects this stack refuses: a stylesheet dialect the bundler compiles,
 * and a sheet that spells one.
 *
 * The suffix list is Vite's own — its stylesheet pattern is where a dialect
 * would have to be added for Vite to compile it — and it is read here against
 * the files this repository ships and against the constructs a CSS engine
 * cannot read. A dialect that arrives under a name nothing lists still fails on
 * the file it is written in.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import type { Offence } from '../scripts/offence.ts'
import { repositoryFiles } from '../scripts/source-tree.ts'
import { TREE_SCAN_BUDGET_MS } from './tree-budget.ts'
import { installedVite, viteDialectSuffixes } from './vite-face.ts'

/**
 * The at-rules a CSS engine does not read, which only a preprocessor defines.
 * `@function` and `@if` are absent on purpose: both are drafts of their own for
 * CSS, and refusing a rule an engine may adopt would refuse a sheet that is
 * already CSS.
 */
const PREPROCESSOR_AT_RULES: ReadonlySet<string> = new Set([
  'at-root',
  'debug',
  'each',
  'error',
  'extend',
  'for',
  'forward',
  'include',
  'mixin',
  'return',
  'use',
  'warn',
  'while',
])

/** One `@import` and what it names. */
const IMPORT = /@import\s+(?:url\(\s*)?['"]?([^'")\s;]+)/u

/** The shipped file paths whose name carries a dialect the bundler compiles. */
function dialectFiles(labels: readonly string[], dialects: ReadonlySet<string>): string[] {
  return labels.filter((label) => [...dialects].some((suffix) => label.endsWith(suffix)))
}

/**
 * Every preprocessor construct a shipped stylesheet spells: an import of a
 * dialect file, an import of a path with no extension, and an at-rule from the
 * set above. A CSS engine resolves or reads none of them.
 * @param label - the sheet's path, for the report.
 * @param text - the sheet's contents.
 * @param dialects - the dialect suffixes the installed bundler compiles.
 * @returns one offence per construct it spells, empty when it spells none.
 */
function sheetDialectOffences(label: string, text: string, dialects: ReadonlySet<string>): Offence[] {
  const offences: Offence[] = []
  for (const [index, line] of text.split('\n').entries()) {
    const at = /@([a-z-]+)/u.exec(line)?.[1]
    if (at !== undefined && PREPROCESSOR_AT_RULES.has(at)) {
      offences.push({ label, line: index + 1, why: `@${at} is a preprocessor at-rule, which no CSS engine reads` })
      continue
    }
    const imported = IMPORT.exec(line)?.[1]
    if (imported === undefined) continue
    const suffix = [...dialects].find((dialect) => imported.endsWith(dialect))
    if (suffix !== undefined) {
      offences.push({ label, line: index + 1, why: `@import names ${imported}, a ${suffix} stylesheet` })
    } else if (!imported.endsWith('.css') && !imported.startsWith('http')) {
      offences.push({ label, line: index + 1, why: `@import names ${imported}, which no CSS engine resolves` })
    }
  }
  return offences
}

/** The installed Vite's runtime, which the suffix list is read from. */
const VITE_RUNTIME = installedVite('.js')

/** The dialect suffixes the installed Vite compiles. */
const DIALECTS = new Set(viteDialectSuffixes(VITE_RUNTIME))

describe('the dialect suffixes the installed bundler compiles', () => {
  it('are read from Vite itself, `.css` aside', () => {
    expect([...DIALECTS]).toEqual(['.less', '.sass', '.scss', '.styl', '.stylus', '.pcss', '.postcss', '.sss'])
  })

  it('refuse a runtime that states no list, rather than answering with none', () => {
    expect(() => viteDialectSuffixes('no stylesheet pattern here')).toThrow(
      'the installed Vite states no stylesheet extension list',
    )
  })
})

describe('the files the dialect suffixes refuse', () => {
  it(
    'names every suffix the bundler compiles, and ships none of them',
    () => {
      const planted = ['a.scss', 'b.sass', 'c.less', 'd.styl', 'e.stylus', 'f.pcss', 'g.postcss', 'h.sss']
      expect(dialectFiles([...planted, 'i.css', 'j.ts'], DIALECTS)).toEqual(planted)
      const shipped = repositoryFiles([...DIALECTS]).map((file) => file.label)
      expect(dialectFiles(shipped, DIALECTS)).toEqual([])
    },
    TREE_SCAN_BUDGET_MS,
  )
})

describe('the preprocessor constructs a shipped sheet refuses', () => {
  it('names a dialect import, an extensionless import and a preprocessor at-rule', () => {
    const sheet = ['@import "theme.scss";', '@import "styles/mixins";', '@use "sass:math";', '.a { padding: 0; }']
    expect(sheetDialectOffences('a.css', sheet.join('\n'), DIALECTS)).toEqual([
      { label: 'a.css', line: 1, why: '@import names theme.scss, a .scss stylesheet' },
      { label: 'a.css', line: 2, why: '@import names styles/mixins, which no CSS engine resolves' },
      { label: 'a.css', line: 3, why: '@use is a preprocessor at-rule, which no CSS engine reads' },
    ])
  })

  it(
    'reads a plain CSS import and every shipped sheet as CSS',
    () => {
      expect(sheetDialectOffences('a.css', '@import "b.css";\n@import url("https://x.test/a.css");', DIALECTS)).toEqual(
        [],
      )
      const offences = repositoryFiles(['.css']).flatMap((sheet) =>
        sheetDialectOffences(sheet.label, readFileSync(sheet.path, 'utf8'), DIALECTS),
      )
      expect(offences).toEqual([])
    },
    TREE_SCAN_BUDGET_MS,
  )
})
