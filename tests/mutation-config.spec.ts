/**
 * The mutation runs' own configuration, held to what it claims.
 *
 * A mutation score is only worth what its denominator is. Three edits move it
 * without touching a line of product code — lowering the breaking threshold,
 * narrowing what is mutated, and leaving a source root out of every scope —
 * and all three read as configuration rather than as a weakened test. A fourth,
 * the disable comment, exempts one mutant in place and leaves nothing at all in
 * the diff to say what was exempted or why.
 *
 * All four are refused here. What this suite checks, exactly: the thresholds,
 * that every scope names a `bun test` command and a non-empty `mutate`, that
 * nothing is excluded from `mutate`, that every source root the repository
 * ships is inside some scope, that every scope has a script and every script a
 * scope, that every unit spec is either driven by some scope or declared here
 * as one no scope can drive, and that no source carries the disable comment.
 * It does not verify that a scope's command exercises the modules that scope
 * mutates — only a run can say that, and the run is what reports the score.
 */

import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { readManifest } from '../scripts/manifest.ts'
import { repositoryFiles } from '../scripts/source-tree.ts'
import { joined } from './fixtures.ts'

/** One mutation run's configuration, as far as this suite reads one. */
interface StrykerConfig {
  readonly testRunner?: string
  readonly commandRunner?: { readonly command?: string }
  readonly mutate?: readonly string[]
  readonly coverageAnalysis?: string
  readonly inPlace?: boolean
  readonly incremental?: boolean
  readonly thresholds?: { readonly high?: number; readonly low?: number; readonly break?: number | null }
}

/** The score every scope is held to. */
const REQUIRED_SCORE = 99

/**
 * Every directory of source the repository ships, which some scope must mutate.
 *
 * Read off the tree rather than listed: a package added with its own `src`
 * joins this on its own, and a scope that does not cover it fails here rather
 * than quietly shrinking the denominator.
 */
function sourceRoots(): string[] {
  const roots = repositoryFiles(['.ts'])
    .map((file) => file.label)
    .filter((label) => label.startsWith('scripts/') || /^(?:apps|packages)\/[^/]+\/src\//u.test(label))
    .map((label) => (label.startsWith('scripts/') ? 'scripts' : label.split('/').slice(0, 3).join('/')))
  return [...new Set(roots)].toSorted()
}

/**
 * Unit specs no mutation scope can drive, and why.
 *
 * A suite that reads the whole tree cannot judge a mutation of the modules it
 * reads: the instrumenter writes `var` and the bans refuse it, so the case
 * fails for every mutant alike, and a run whose every mutant is killed by the
 * same always-failing case scores a hundred while proving nothing. Leaving such
 * a suite out of a scope's command is the only honest answer — deleting it is
 * not, so each still runs under `bun run test`, which is checked below.
 */
const UNDRIVEABLE: Readonly<Record<string, string>> = {
  'tests/legacy.spec.ts': 'reads every file the repository ships, instrumented ones included',
  'tests/gate-coverage.spec.ts': 'reads every file the repository ships, instrumented ones included',
  'tests/mutation-config.spec.ts': 'refuses a tree a run has instrumented, which is every tree during a run',
  'tests/pipeline-guard.spec.ts': 'guards the workflow definitions and manifest, which no mutation scope mutates',
}

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

/**
 * The manifest's scripts.
 * @returns script name to command line.
 */
function scripts(): ReadonlyMap<string, string> {
  return readManifest('package.json').scripts
}

describe('every mutation run', () => {
  it('exists at all', async () => {
    // A suite that reads a list of configurations passes vacuously on an empty
    // list, which is what every assertion below would do if the runs were
    // deleted rather than weakened.
    expect((await configs()).length).toBeGreaterThan(0)
  })

  it('breaks below the score it claims, rather than merely reporting it', async () => {
    const weak = (await configs()).flatMap(({ label, config }) =>
      config.thresholds?.break === REQUIRED_SCORE ? [] : [`${label}: break is ${String(config.thresholds?.break)}`],
    )
    expect(weak).toEqual([])
  })

  it('reports every score below the bar as a failure rather than as a shade of green', async () => {
    const graded = (await configs()).flatMap(({ label, config }) =>
      config.thresholds?.high === REQUIRED_SCORE && config.thresholds.low === REQUIRED_SCORE ? [] : [label],
    )
    expect(graded).toEqual([])
  })

  it('names a bun test command and something to mutate', async () => {
    const unpaired = (await configs()).flatMap(({ label, config }) =>
      (config.commandRunner?.command ?? '').startsWith('bun test ') && (config.mutate ?? []).length > 0 ? [] : [label],
    )
    expect(unpaired).toEqual([])
  })

  it('uses the built-in runner, and asks it for no coverage it cannot give', async () => {
    // The command runner knows nothing about which test covered which mutant,
    // so anything but `off` here is a claim the runner cannot honour. The
    // runner itself is Stryker's default and is named nowhere: naming it makes
    // the dependency reader look for a plugin package that does not exist.
    const wrong = (await configs()).flatMap(({ label, config }) =>
      config.coverageAnalysis === 'off' && config.testRunner === undefined ? [] : [label],
    )
    expect(wrong).toEqual([])
  })

  it('excludes nothing from what it mutates', async () => {
    const excluded = (await configs()).flatMap(({ label, config }) =>
      (config.mutate ?? []).filter((pattern) => pattern.startsWith('!')).map((pattern) => `${label}: ${pattern}`),
    )
    expect(excluded).toEqual([])
  })
})

describe('every mutation run reads the tree it claims to', () => {
  it('re-reads every mutant on every run, rather than trusting a stored verdict', async () => {
    // Incremental mode keys a stored verdict on the mutated source. The command
    // runner tells it nothing about the tests, so a run after a test was added
    // — or deleted — reuses every verdict and reports the score the tests used
    // to earn. It did exactly that here: a scope whose coverage had just been
    // rewritten reported its old number, to the decimal.
    const stale = (await configs()).flatMap(({ label, config }) => (config.incremental === true ? [label] : []))
    expect(stale).toEqual([])
  })

  it('mutates the source in place, so nothing it reads is a copy', async () => {
    // The gates read the repository through `git ls-files`, and a sandbox copy
    // is not a repository. Mutating in place is what keeps the suites reading
    // the same tree they read outside a mutation run.
    const sandboxed = (await configs()).flatMap(({ label, config }) => (config.inPlace === true ? [] : [label]))
    expect(sandboxed).toEqual([])
  })

  it('covers every root of source the repository ships', async () => {
    // The denominator. A root inside no scope is a directory whose every
    // mutant is uncounted, and nothing else in this repository would say so.
    const patterns = (await configs()).flatMap(({ config }) => config.mutate ?? [])
    const uncovered = sourceRoots().filter((root) => !patterns.some((pattern) => pattern.startsWith(`${root}/`)))
    expect(uncovered).toEqual([])
  })

  it('has a script for every scope, and a scope for every script', async () => {
    const declared = new Set((await configs()).map(({ label }) => label))
    const named = new Set(
      [...scripts()]
        .filter(([name]) => name.startsWith('mutate:'))
        .flatMap(([, command]) => command.split(/\s+/u).filter((word) => word.endsWith('.json'))),
    )
    expect([...named].toSorted()).toEqual([...declared].toSorted())
  })
})

describe('the unit suites a mutation run drives', () => {
  it('drives every unit spec except the ones declared undriveable here', async () => {
    // Which suites judge a run is the other half of the denominator: a spec
    // quietly left out of every command is coverage the score never sees.
    const driven = new Set(
      (await configs()).flatMap(({ config }) =>
        (config.commandRunner?.command ?? '').split(/\s+/u).filter((word) => word.endsWith('.spec.ts')),
      ),
    )
    const directories = (await configs()).flatMap(({ config }) =>
      (config.commandRunner?.command ?? '').split(/\s+/u).filter((word) => word.endsWith('/tests')),
    )
    const specs = repositoryFiles(['.spec.ts'])
      .map((file) => file.label)
      .filter((label) => !label.endsWith('.browser.spec.ts'))
    const left = specs.filter(
      (label) => !driven.has(label) && !directories.some((directory) => label.startsWith(`${directory}/`)),
    )
    expect(left.toSorted()).toEqual(Object.keys(UNDRIVEABLE).toSorted())
  })

  it('still runs every undriveable spec under the unit command', () => {
    // Left out of a mutation command, not out of the suite: a contributor runs
    // `bun test`, and a reader of that run has to see these.
    const command = scripts().get('test') ?? ''
    const patterns = command.split(/\s+/u).filter((word) => word.endsWith('.spec.ts'))
    const unrun = Object.keys(UNDRIVEABLE).filter((label) => !patterns.some((pattern) => matches(pattern, label)))
    expect(unrun).toEqual([])
  })

  it('declares a reason for each one, rather than a bare list', () => {
    expect(Object.entries(UNDRIVEABLE).filter(([, why]) => why.length < 20)).toEqual([])
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
    // nothing else would have said so. `check:tree` runs the same read from the
    // gate chain, where a mutation run can reach it; this is what a contributor
    // running `bun test` sees.
    const marker = joined('stry', 'MutAct_')
    const files = repositoryFiles(['.ts', '.tsx', '.js'])
    const read = await Promise.all(
      files.map(async (file) => ({ label: file.label, text: await readFile(file.path, 'utf8') })),
    )
    expect(read.flatMap((file) => (file.text.includes(marker) ? [file.label] : []))).toEqual([])
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
