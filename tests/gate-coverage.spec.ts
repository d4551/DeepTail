/**
 * What the gates are pointed at.
 *
 * A rule that works is worth nothing if the file it would have caught is never
 * read. A previous gate walked a hand-written list of directories and reported
 * success over the trees the list left out, so what is asserted here is the
 * reach of the file list itself.
 *
 * Whether the repository is clean under those gates is asserted once, in
 * `tests/tree/superseded.spec.ts`, through the gates the chain runs.
 */

import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import * as parse5 from 'parse5'
import { structureCheckSource } from '../apps/deeptail/tests/structure.ts'
import * as bans from '../scripts/ban-gate.ts'
import { onlyPresent, ROOT, repositoryFiles, type SourceFile } from '../scripts/source-tree.ts'
import * as styles from '../scripts/style-gate.ts'
import { tagTree } from './markup-tree.ts'

/**
 * Every function the structure checks ship to the page, by definition.
 *
 * Held as a whole set rather than a chosen few: a helper dropped from what is
 * shipped is a `ReferenceError` the moment the page evaluates this, and every
 * structural check on that page then reports nothing at all.
 */
const SHIPPED_CHECKS: readonly string[] = [
  'checkAlignment',
  'checkAriaReferences',
  'checkClassVocabulary',
  'checkClipping',
  'checkDuplicateIds',
  'checkGrid',
  'checkGroupNames',
  'checkHeadingOrder',
  'checkHorizontalOverflow',
  'checkInlineScripts',
  'checkListOwnership',
  'checkNestedInteractive',
  'checkNestedScroll',
  'checkOneOffScripts',
  'checkOverlappingTargets',
  'checkShell',
  'checkTouchTargets',
  'describe',
  'drawnBox',
  'findStructureDefects',
  'gridAncestor',
  'isLayoutPane',
  'scrolls',
]

describe('the file list both gates read', () => {
  it('is every source file the repository ships, and nothing it builds', () => {
    const labels = repositoryFiles([...styles.SCRIPT_EXTENSIONS, ...styles.MARKUP_EXTENSIONS]).map((file) => file.label)
    // A gate that walks a hand-written list of directories is only as complete
    // as the list; these are the trees a previous list left out.
    for (const required of [
      'apps/deeptail/src/main.ts',
      'apps/deeptail/index.html',
      'apps/deeptail/vite.config.ts',
      'packages/host-fleet/src/index.ts',
      'scripts/check-no-inline-styles.ts',
      'scripts/style-gate.ts',
      'tests/gates.spec.ts',
    ]) {
      expect([required, labels.includes(required)]).toEqual([required, true])
    }
    expect(labels.filter((label) => /(?:^|\/)(?:node_modules|lib|dist|gen|target)\//u.test(label))).toEqual([])
  })

  it('reaches the Rust the suppression ban is written for', () => {
    const labels = repositoryFiles([...bans.PLAIN_EXTENSIONS]).map((file) => file.label)
    expect(labels).toContain('apps/deeptail/src-tauri/src/lib.rs')
    expect(labels).toContain('bunfig.toml')
  })

  it('reads a path whose bytes are on disk and refuses one whose are not', () => {
    // `git ls-files --cached` keeps listing a file until its deletion is
    // recorded, and a gate that opened it then failed with ENOENT reported
    // nothing about the repository. The list carries what has bytes to read.
    const present: SourceFile = { label: 'scripts/source-tree.ts', path: `${ROOT}scripts/source-tree.ts` }
    const deleted: SourceFile = { label: 'scripts/never-shipped.ts', path: `${ROOT}scripts/never-shipped.ts` }
    expect(onlyPresent([present, deleted]).map((file) => file.label)).toEqual(['scripts/source-tree.ts'])
  })
})

describe('the structure checks the browser suite evaluates', () => {
  it('carries every floor it measures against into the page', () => {
    // The checks are shipped to the page as their own source text and close
    // over nothing, so everything they measure against travels in the call. A
    // value left behind would be a type error where they are written; that it
    // arrives at all is what is checked here, because the two floors differ and
    // shipping the wrong one would pass every case on one pointer.
    expect(structureCheckSource(true, ['shell'])).toContain('"target":44')
    expect(structureCheckSource(false, ['shell'])).toContain('"target":24')
    for (const source of [structureCheckSource(true, ['shell']), structureCheckSource(false, ['shell'])]) {
      expect(source).toContain('a[href], button, input, select, textarea, summary')
      // The vocabulary travels with the floors: a vocabulary the page never
      // receives would refuse every class — or, refused by nothing, check none.
      expect(source).toContain('"vocabulary":["shell"]')
      // The whole selector list, not a prefix of it: asserting the opening two
      // surfaces left the boot-error and return surfaces free to be dropped
      // with this still green, and nothing else reads them.
      expect(source).toContain(
        '"scope":"[data-deeptail-shell], [data-deeptail-picker], [data-deeptail-state=\\"boot-error\\"], [data-deeptail-return]"',
      )
      for (const rule of ['"alignment"', '"nested-grid"', '"split-shell"', '"inline-script"', '"target-size"']) {
        expect(source).toContain(rule)
      }
    }
  })
})

describe('the checks the browser suite actually ships', () => {
  it('defines every check it ships, not merely mentions one', () => {
    // `findStructureDefects` calls each helper by name, so every name occurs in
    // the emitted text twice: once where it is defined and once where it is
    // called. A check for the name alone therefore stayed green when a helper
    // was dropped from what is shipped — and a helper left behind is a
    // `ReferenceError` the moment the page evaluates this, which makes every
    // structural check on that page report nothing at all. Definitions are what
    // is counted, and the whole set is pinned rather than a chosen few.
    const defined = [...structureCheckSource(true, ['shell']).matchAll(/function\s+([A-Za-z0-9_$]+)\s*\(/gu)]
      .map((found) => found[1] ?? '')
      .toSorted()
    expect(defined).toEqual([...SHIPPED_CHECKS])
  })

  it('calls every check it defines, so none is shipped and then never run', () => {
    // The other direction. A helper that is defined but never reached is dead
    // weight the page parses for nothing, and a rule that stopped being called
    // would report nothing while still being present to any check that only
    // looks for its definition.
    const source = structureCheckSource(true, ['shell'])
    const body = source.slice(source.indexOf('function findStructureDefects'))
    // What the entry point actually calls, read out of its body rather than
    // searched for one name at a time.
    const called = new Set([...body.matchAll(/\b(check[A-Za-z0-9_$]+)\(add/gu)].map((found) => found[1] ?? ''))
    const defined = [...source.matchAll(/function\s+(check[A-Za-z0-9_$]+)\s*\(/gu)].map((found) => found[1] ?? '')
    expect(defined.filter((rule) => !called.has(rule))).toEqual([])
  })
})

describe('what the checks the browser suite evaluates are made of', () => {
  it('cannot be handed an activation target nested in its own kind, and the parser is why', () => {
    // The `nested-interactive` rule walks a parsed tree, and the HTML parsing
    // algorithm closes an open activation target the moment a second start tag
    // of its own kind arrives. That shape therefore never reaches the rule as
    // a nesting: it arrives as siblings. Pinned here so the rule's silence on
    // it is read as the parser's doing, and a future swap of the parser that
    // changes this tree fails a named test instead of quietly shifting what
    // the rule can see.
    // The fragment node itself sits at depth 0, so its children indent once:
    // two `button` lines at one depth, not a `button` under a `button`.
    expect(tagTree(parse5.parseFragment('<button>a<button>b</button></button>'))).toEqual(['  button', '  button'])
  })
})

describe('the design tokens', () => {
  it('declares none that nothing reads', async () => {
    const sheets = repositoryFiles(['.css']).filter((file) => file.label.startsWith('apps/deeptail/src/styles/'))
    const sheetText = (await Promise.all(sheets.map((sheet) => readFile(sheet.path, 'utf8')))).join('\n')
    const scripts = (
      await Promise.all(
        repositoryFiles(['.ts'])
          .filter((file) => file.label.startsWith('apps/deeptail/src/'))
          .map((file) => readFile(file.path, 'utf8')),
      )
    ).join('\n')
    // The harness client renders into this same document and reads these tokens
    // from its own stylesheets, so it counts as a reader; a token neither it
    // nor this product reads is a value carried for nobody.
    const client = await readFile(
      'apps/deeptail/node_modules/@deepseek-ai/dsh-client-web/lib/boot-page.module.css',
      'utf8',
    )
    const declared = new Set([...sheetText.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gmu)].map((match) => match[1] ?? ''))
    const read = new Set([
      ...[...sheetText.matchAll(/var\(\s*(--[a-z0-9-]+)/gu)].map((match) => match[1] ?? ''),
      ...[...scripts.matchAll(/(--[a-z0-9-]+)/gu)].map((match) => match[1] ?? ''),
      ...[...client.matchAll(/(--[a-z0-9-]+)/gu)].map((match) => match[1] ?? ''),
    ])
    expect([...declared].filter((token) => !read.has(token)).toSorted()).toEqual([])
    expect(declared.size).toBeGreaterThan(20)
  })
})
