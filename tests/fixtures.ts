/**
 * Shared fixtures for the gate suites: how a source is assembled, how its
 * offences are read back, and how a ban group is stated once for many fixtures.
 *
 * @module
 */

import { afterEach, expect } from 'bun:test'
import { aliases } from '../scripts/aliases.ts'
import { type Node, parseScript, walk } from '../scripts/ast.ts'
import * as banGate from '../scripts/ban-gate.ts'
import { constants } from '../scripts/fold.ts'
import { freeNames } from '../scripts/free-names.ts'
import type { Names } from '../scripts/rule-helpers.ts'
import * as styles from '../scripts/style-gate.ts'

/**
 * A fixture assembled from lines, so one logical source can be written as
 * readable statements.
 * @param lines - the lines of the source.
 * @returns the fixture.
 */
export function source(...lines: readonly string[]): string {
  return `${lines.join('\n')}\n`
}

/**
 * A fixture assembled from parts, so the gate's own bans cannot read it as data.
 * @param parts - the fragments of the fixture.
 * @returns the fixture.
 */
export function joined(...parts: readonly string[]): string {
  return parts.join('')
}

/**
 * The names one snippet reads without binding.
 * @param lines - the lines of the snippet.
 * @returns the free names, sorted.
 */
export function free(...lines: readonly string[]): string[] {
  return freeNames('fixture.ts', lines.join('\n'))
}

/**
 * The reasons a script is rejected for.
 * @param text - the fixture.
 * @param label - the path to attribute it to, which selects the dialect.
 * @returns one reason per offence.
 */
export function styleOffences(text: string, label = 'fixture.ts'): string[] {
  return styles.scanSource(label, text).map((offence) => offence.why)
}

/**
 * Whether every offence the gate reports on this fixture names the style
 * attribute or property.
 * @param text - the fixture.
 * @returns true when the offence names the style attribute or property.
 */
export function readsTheName(text: string): boolean {
  const why = styleOffences(text)
  return why.length > 0 && why.every((reason) => reason.includes('named style'))
}

/**
 * The reasons a source is rejected by the ban gate.
 * @param text - the fixture.
 * @param label - the path to attribute it to, which selects the reader.
 * @returns one reason per offence.
 */
export function banOffences(text: string, label = 'fixture.ts'): string[] {
  return banGate.scanSource(label, text).map((offence) => offence.why)
}

/**
 * The reasons one assembled fixture is rejected by the ban gate.
 * @param lines - the lines of the source.
 * @returns the reasons.
 */
export function bans(...lines: readonly string[]): string[] {
  return banOffences(source(...lines))
}

/**
 * Every fixture named is refused for the reason its group shares.
 * @param why - the reason every case in the group is rejected for.
 * @param groups - one entry per fixture; an entry's lines assemble one source.
 */
export function refused(why: string, groups: readonly (readonly string[])[]): void {
  for (const group of groups) expect(bans(...group)).toEqual([why])
}

/**
 * A scanner's report names the reason this fixture exists to produce.
 *
 * `.not.toEqual([])` is satisfied by any non-empty list — including a parse
 * error, a different rule, or a scanner that always returns a dummy string.
 * Naming the reason is what keeps the fixture honest about the rule it drives.
 * @param found - the reasons the scanner reported.
 * @param reason - a distinctive stretch of the reason this fixture must produce.
 * @param name - the fixture's name, so a miss says which case went silent.
 */
export function namesWhy(found: readonly string[], reason: string, name: string): void {
  expect([name, found.some((why) => why.includes(reason)) ? reason : found.join(' | ') || 'nothing reported']).toEqual([
    name,
    reason,
  ])
}

/**
 * Every fixture named is admitted: the gate reports nothing for it.
 * @param groups - one entry per fixture; an entry's lines assemble one source.
 */
export function admitted(groups: readonly (readonly string[])[]): void {
  for (const group of groups) expect(bans(...group)).toEqual([])
}

/**
 * The sink a fixture drives, assembled so this module's own source does not
 * carry the call the ban it drives refuses.
 */
const sink = joined('insert', 'AdjacentHTML')

/**
 * Markup that carries the attribute, assembled so this file's own source does
 * not contain it.
 * @param attribute - the attribute name to plant.
 * @returns the fixture.
 */
export function markupFixture(attribute: string): string {
  return `el.${sink}('beforeend', '<b ' + '${attribute}' + '="x">')`
}

/**
 * A shell document carrying the attribute, assembled the same way.
 * @param attribute - the attribute name to plant.
 * @returns the fixture.
 */
export function documentFixture(attribute: string): string {
  return `<main ${attribute}="color: red"><p>hi</p></main>`
}

/**
 * Markup whose value is supplied at runtime, written with an interpolation.
 * @param attribute - the attribute name to plant.
 * @returns the fixture.
 */
export function interpolatedMarkup(attribute: string): string {
  return `el.${sink}('beforeend', \`<b ${attribute}="color: \${colour}">!</b>\`)`
}

/**
 * Markup whose value is supplied at runtime, written with concatenation.
 * @param attribute - the attribute name to plant.
 * @returns the fixture.
 */
export function concatenatedMarkup(attribute: string): string {
  return `el.${sink}('beforeend', '<i ${attribute}="' + colour + '"></i>')`
}

/**
 * A JSX element carrying the attribute.
 * @param attribute - the attribute name to plant.
 * @returns the fixture.
 */
export function badge(attribute: string): string {
  return `export const Badge = () => <div ${attribute}={{ color: 'red' }} />`
}

/**
 * The parsed body of one fixture.
 * @param text - the source.
 * @param label - the path to attribute it to, which selects the dialect.
 * @returns the program body.
 */
export function parsedBody(text: string, label = 'fixture.ts'): readonly Node[] {
  const parsed = parseScript(label, text)
  if (parsed.errors.length > 0) throw new Error(`fixture does not parse: ${parsed.errors[0]?.message ?? ''}`)
  return parsed.body
}

/**
 * The first node of a given type in one fixture.
 * @param text - the source.
 * @param type - the node type to look for.
 * @returns the node.
 */
export function nodeOfType(text: string, type: string): Node {
  let found: Node | undefined
  walk(parsedBody(text), (node) => {
    if (found === undefined && node.type === type) found = node
  })
  if (found === undefined) throw new Error(`fixture carries no ${type}`)
  return found
}

/**
 * What one fixture renamed and what it holds in constants.
 * @param text - the source.
 * @returns the names a rule reads through.
 */
export function namesOf(text: string): Names {
  const body = parsedBody(text)
  return { aliases: aliases(body), constants: constants(body) }
}

/** One scratch directory a case writes a gate's fixture into. */
export interface FixtureTree {
  /** The directory the tree is filed under. */
  readonly root: string
  /**
   * The path one file in the tree is written to.
   * @param name - the file's name.
   * @returns the absolute path.
   */
  pathOf(name: string): string
  /**
   * Seat a directory inside the tree, so a caller can hand it to a process as
   * its working directory before anything has been written into it.
   * @param inside - the directory, relative to the tree's root; the root itself
   *   when omitted.
   */
  seat(inside?: string): Promise<void>
  /** Take back down every file the case wrote in the tree. */
  clear(): Promise<void>
}

/** How many trees this process has seated, so two cases never share a path. */
let trees = 0

/**
 * Seat a scratch directory for one case to write its fixtures into.
 *
 * It is seated inside the repository's own ignored scratch root rather than the
 * system's, so a case that dies mid-run leaves a directory no gate walks
 * instead of one somewhere the repository does not own. Nothing here reaches
 * for a filesystem module: `Bun.write` seats the parent directories and
 * `Bun.file(path).delete()` takes a file back down, so a suite driving a gate
 * needs no `node:` import to seat one.
 * @param prefix - the name the tree is filed under.
 * @returns the tree.
 */
export function fixtureTree(prefix: string): FixtureTree {
  trees += 1
  const root = `${import.meta.dir}/../.tmp-bun/${prefix}-${String(process.pid)}-${String(trees)}`
  // A set, not a list: a case names the same file when it writes it, when it
  // reads it back, and when it deletes it, and a ledger holding that file three
  // times would try to unlink it three times at once — twice against nothing.
  const written = new Set<string>()
  const pathOf = (name: string): string => {
    const path = `${root}/${name}`
    written.add(path)
    return path
  }
  return {
    root,
    pathOf,
    seat: async (inside) => {
      // A file rather than a bare directory: this is what seats the directory,
      // and it is one of the tree's own files, so `clear` takes it down too.
      await Bun.write(pathOf(inside === undefined ? '.seat' : `${inside}/.seat`), '')
    },
    clear: async () => {
      await Promise.all(
        [...written].map(async (path) => {
          const file = Bun.file(path)
          if (await file.exists()) await file.delete()
        }),
      )
    },
  }
}

/**
 * Take every tree a suite seated back down when each of its cases ends.
 *
 * The teardown is written once here rather than in each of the suites that seat
 * a tree: six copies of the same three lines is the shape this module exists to
 * remove, and a suite whose own copy drifted would leak its tree instead of
 * failing.
 * @param made - the ledger a suite pushes the trees it seated onto.
 */
export function clearTreesAfterEach(made: FixtureTree[]): void {
  afterEach(async () => {
    await Promise.all(made.splice(0).map(async (tree) => await tree.clear()))
  })
}
