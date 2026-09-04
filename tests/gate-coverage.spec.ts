/**
 * What the gates are pointed at.
 *
 * A rule that works is worth nothing if the file it would have caught is never
 * read. A previous gate walked a hand-written list of directories and reported
 * success over the trees the list left out, so what is asserted here is the
 * reach of the file list itself, and that the repository is clean under both
 * gates when every file it ships is actually read.
 */

import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import * as parse5 from 'parse5'
import { structureCheckSource } from '../apps/deeptail/tests/structure.ts'
import * as bans from '../scripts/ban-gate.ts'
import { repositoryFiles } from '../scripts/source-tree.ts'
import * as styles from '../scripts/style-gate.ts'

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

  it('leaves the repository clean under both gates', async () => {
    const files = repositoryFiles([...styles.SCRIPT_EXTENSIONS, ...styles.MARKUP_EXTENSIONS, ...bans.PLAIN_EXTENSIONS])
    const offences = await Promise.all(
      files.map(async (file) => {
        const text = await readFile(file.path, 'utf8')
        const found = [...styles.SCRIPT_EXTENSIONS, ...styles.MARKUP_EXTENSIONS].some((extension) =>
          file.label.endsWith(extension),
        )
          ? styles.scanSource(file.label, text)
          : []
        return [...found, ...bans.scanSource(file.label, text)].map(
          (offence) => `${offence.label}:${String(offence.line)}: ${offence.why}`,
        )
      }),
    )
    expect(offences.flat()).toEqual([])
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
      expect(source).toContain('"scope":"[data-deeptail-shell], [data-deeptail-picker]')
    }
  })

  it('cannot be handed an activation target nested in its own kind, and the parser is why', () => {
    // The `nested-interactive` rule walks a parsed tree, and the HTML parsing
    // algorithm closes an open activation target the moment a second start tag
    // of its own kind arrives. That shape therefore never reaches the rule as
    // a nesting: it arrives as siblings. Pinned here so the rule's silence on
    // it is read as the parser's doing, and a future swap of the parser that
    // changes this tree fails a named test instead of quietly shifting what
    // the rule can see.
    const tree: string[] = []
    const walk = (node: parse5.DefaultTreeAdapterTypes.Node, depth: number): void => {
      if ('tagName' in node) tree.push(`${'  '.repeat(depth)}${String(node.tagName)}`)
      for (const child of 'childNodes' in node ? (node.childNodes as parse5.DefaultTreeAdapterTypes.Node[]) : []) {
        walk(child, depth + 1)
      }
    }
    // The fragment node itself sits at depth 0, so its children indent once:
    // two `button` lines at one depth, not a `button` under a `button`.
    walk(parse5.parseFragment('<button>a<button>b</button></button>'), 0)
    expect(tree).toEqual(['  button', '  button'])
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
