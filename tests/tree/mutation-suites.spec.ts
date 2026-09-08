/**
 * Which suites judge a mutation run, and what the tree carries while one runs.
 *
 * The score's denominator has two halves. One is what is mutated, held in
 * `mutation-config.spec.ts`; the other is what judges it, which is here: a spec
 * quietly left out of every command is coverage the score never sees, and a
 * suite parked where no run can reach it is the same thing with a place to
 * stand. The tree the runs leave behind is here too, because a run that did not
 * finish leaves every file it touched rewritten and nothing else says so.
 *
 * This is a property of the tree at rest, which is why it sits beside the other
 * tree suites and outside every mutation command.
 */

import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { GATE as TREE } from '../../scripts/check-tree.ts'
import { readGate } from '../../scripts/gate-runner.ts'
import { repositoryFiles } from '../../scripts/source-tree.ts'
import { joined } from '../fixtures.ts'

/** One mutation run's configuration, as far as this suite reads one. */
interface StrykerConfig {
  readonly commandRunner?: { readonly command?: string }
}

/**
 * Where the suites that judge the tree at rest live.
 *
 * A suite that reads the whole tree cannot judge a mutation of the modules it
 * reads: a run rewrites the tree on purpose, so the case fails for every mutant
 * alike, and a run whose every mutant is killed by one always-failing case
 * scores a hundred while proving nothing. Those suites sit in a directory of
 * their own, which is what a run is pointed away from — a place rather than a
 * list, so nothing is excused by name and nothing is excused in prose.
 */
const TREE_SUITES = 'tests/tree/'

/** What a suite in that directory does: read the repository's own file list. */
const READS_THE_TREE = /\b(?:repositoryFiles|readGate)\(/u

/** Every mutation configuration the repository ships, with its contents. */
async function configs(): Promise<{ readonly label: string; readonly config: StrykerConfig }[]> {
  const files = repositoryFiles(['.json']).filter((file) => /^stryker\..*\.json$/u.test(file.label))
  return await Promise.all(
    files.map(async (file) => ({
      label: file.label,
      config: JSON.parse(await readFile(file.path, 'utf8')) as StrykerConfig,
    })),
  )
}

/** The manifest's scripts. */
function scripts(): Readonly<Record<string, string>> {
  return (JSON.parse(readFileSync('package.json', 'utf8')) as { scripts?: Record<string, string> }).scripts ?? {}
}

/** Every spec the repository ships, apart from the ones a browser drives. */
function unitSpecs(): string[] {
  return repositoryFiles(['.spec.ts'])
    .map((file) => file.label)
    .filter((label) => !label.endsWith('.browser.spec.ts'))
}

describe('the unit suites a mutation run drives', () => {
  it('drives every unit spec outside the tree suites, with nothing excused', async () => {
    // Which suites judge a run is the other half of the denominator: a spec
    // quietly left out of every command is coverage the score never sees.
    const commands = (await configs()).map(({ config }) => (config.commandRunner?.command ?? '').split(/\s+/u))
    const driven = new Set(commands.flatMap((words) => words.filter((word) => word.endsWith('.spec.ts'))))
    const directories = commands.flatMap((words) => words.filter((word) => word.endsWith('/tests')))
    const left = unitSpecs().filter(
      (label) =>
        !label.startsWith(TREE_SUITES) &&
        !driven.has(label) &&
        !directories.some((directory) => label.startsWith(`${directory}/`)),
    )
    expect(left.toSorted()).toEqual([])
  })

  it('holds nothing in the tree suites but suites that read the whole tree', async () => {
    // The directory is the whole of the exception, so what may sit in it is a
    // property rather than a permission: a suite that reads one module would
    // be a suite parked out of reach of every run.
    const suites = repositoryFiles(['.spec.ts']).filter((file) => file.label.startsWith(TREE_SUITES))
    expect(suites.length).toBeGreaterThan(0)
    const read = await Promise.all(
      suites.map(async (file) => ({ label: file.label, text: await readFile(file.path, 'utf8') })),
    )
    expect(read.filter((file) => !READS_THE_TREE.test(file.text)).map((file) => file.label)).toEqual([])
  })

  it('still runs the tree suites under the unit command', () => {
    // Out of a mutation command, not out of the suite: a contributor runs
    // `bun test`, and a reader of that run has to see these.
    const patterns = (scripts()['test'] ?? '').split(/\s+/u).filter((word) => word.endsWith('.spec.ts'))
    const unrun = unitSpecs().filter(
      (label) => label.startsWith(TREE_SUITES) && !patterns.some((pattern) => matches(pattern, label)),
    )
    expect(unrun).toEqual([])
  })
})

/**
 * Whether one shell glob names a path.
 * @param pattern - the glob, which uses only `*`.
 * @param label - the path.
 * @returns true when the shell would expand the pattern onto the path.
 */
function matches(pattern: string, label: string): boolean {
  const source = `^${pattern
    .split('*')
    .map((part) => part.replaceAll(/[.+^$()|[\]{}\\]/gu, String.raw`\$&`))
    .join('[^/]*')}$`
  return new RegExp(source, 'u').test(label)
}

describe('the repository', () => {
  it('carries no instrumentation from a run that did not finish', async () => {
    // The runs mutate in place, so an interrupted one leaves every file it
    // touched rewritten: the instrumenter's switch wrapped around every
    // expression, and the original restorable only from git. It happened here.
    // A tree in that state still type-checks and still passes its suites, so
    // nothing else would have said so. The gate `check:tree` runs is what is
    // read here, so there is one walk; this is what a contributor running
    // `bun test` sees of it.
    const outcome = await readGate(TREE)
    expect(outcome.ok ? [] : outcome.text.split('\n').filter((line) => line !== '')).toEqual([])
  })

  it('exempts no mutant in place', async () => {
    // Spelt in parts so this file's own source carries none whole.
    const directive = joined('// Stry', 'ker ')
    const files = repositoryFiles(['.ts', '.tsx', '.js', '.css', '.json', '.rs', '.md'])
    const read = await Promise.all(
      files.map(async (file) => ({ label: file.label, text: await readFile(file.path, 'utf8') })),
    )
    expect(read.flatMap((file) => (file.text.includes(directive) ? [file.label] : []))).toEqual([])
  })
})
