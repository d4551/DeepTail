/**
 * The mutation runs' own configuration, held to what it claims.
 *
 * A mutation score is only worth what its denominator is. Three edits move it
 * without touching a line of product code — lowering the breaking threshold,
 * narrowing what is mutated, and leaving a source file out of every scope —
 * and all three read as configuration rather than as a weakened test. A fourth,
 * the disable comment, exempts one mutant in place and leaves nothing at all in
 * the diff to say what was exempted or why.
 *
 * All four are refused here. What this suite checks, exactly: the thresholds,
 * that every scope names a `bun test` command and a non-empty `mutate`, that
 * nothing is excluded from `mutate`, that every source file the repository
 * ships is inside some scope, that every scope has a script and every script a
 * scope, that every unit spec outside `tests/tree/` is driven by some scope and
 * that the directory holds nothing but suites which read the whole tree, and
 * that no source carries the disable comment.
 * It does not verify that a scope's command exercises the modules that scope
 * mutates — only a run can say that, and the run is what reports the score.
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
 * Every file of source the repository ships, which some scope must mutate.
 *
 * Read off the tree rather than listed: a package added with its own `src`
 * joins this on its own, and a scope that does not cover it fails here rather
 * than quietly shrinking the denominator.
 *
 * One file, not one directory. Reading this at directory granularity — "some
 * pattern begins `scripts/`" — is what let `scripts/pipeline-guard.ts` and
 * `scripts/pipeline-guard-rules.ts` sit outside every scope while the case
 * below reported the denominator whole: forty-odd siblings inside a scope
 * answered for them, and the two files nothing mutated were never named.
 * @returns every source file's path, sorted.
 */
function sourceFiles(): string[] {
  return repositoryFiles(['.ts'])
    .map((file) => file.label)
    .filter((label) => label.startsWith('scripts/') || /^(?:apps|packages)\/[^/]+\/src\//u.test(label))
    .toSorted()
}

/**
 * The files no `mutate` pattern selects.
 *
 * Matched by the same glob shapes the scopes are written in, so a pattern that
 * would not select a file cannot answer for it either — which is exactly what
 * a directory-prefix read let happen.
 * @param files - the source the repository ships.
 * @param patterns - every `mutate` pattern, from every scope.
 * @returns one entry per file no scope mutates.
 */
function unmatched(files: readonly string[], patterns: readonly string[]): string[] {
  const globs = patterns.map((pattern) => new Bun.Glob(pattern))
  return files.filter((file) => !globs.some((glob) => glob.match(file)))
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

  it('covers every file of source the repository ships', async () => {
    // The denominator. A file inside no scope is a file whose every mutant is
    // uncounted, and nothing else in this repository would say so.
    const patterns = (await configs()).flatMap(({ config }) => config.mutate ?? [])
    expect(unmatched(sourceFiles(), patterns)).toEqual([])
  })

  it('reads a source file at all, rather than an empty denominator', () => {
    // The case above passes over an empty list. What it reads is the tree, so
    // a reader that stopped answering would read as full coverage.
    expect(sourceFiles().length).toBeGreaterThan(0)
  })

  it('names an uncovered file when it is given one, rather than only ever being green', () => {
    // Driven against the exact hole this case was blind to for as long as it
    // read directories: a sibling inside a scope answering for a file that is
    // inside none. A pattern is only allowed to answer for what it selects.
    const files = ['scripts/ast.ts', 'scripts/pipeline-guard.ts', 'apps/x/src/deep/one.ts']
    expect(unmatched(files, ['scripts/ast.ts', 'apps/x/src/**/*.ts'])).toEqual(['scripts/pipeline-guard.ts'])
    expect(unmatched(files, ['scripts/*.ts', 'apps/x/src/**/*.ts'])).toEqual([])
    // A directory prefix is not a pattern that selects anything: the shape the
    // old reader accepted must now be refused.
    expect(unmatched(files, ['scripts/', 'apps/x/src/'])).toEqual(files)
  })
})

describe('every mutation scope and the scripts that run it', () => {
  it('has a script for every scope, and a scope for every script', async () => {
    const declared = new Set((await configs()).map(({ label }) => label))
    const named = new Set(
      Object.entries(scripts())
        .filter(([name]) => name.startsWith('mutate:'))
        .flatMap(([, command]) => command.split(/\s+/u).filter((word) => word.endsWith('.json'))),
    )
    expect([...named].toSorted()).toEqual([...declared].toSorted())
  })
})

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
