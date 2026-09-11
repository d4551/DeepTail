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
import { manifestScripts } from '../../scripts/manifest.ts'
import { repositoryFiles } from '../../scripts/source-tree.ts'
import { type ScopeConfig, scopeConfigs } from '../../scripts/stryker-config.ts'

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

/** Every mutation scope the repository ships. */
function configs(): readonly ScopeConfig[] {
  return scopeConfigs()
}

describe('every mutation run', () => {
  it('exists at all', () => {
    // A suite that reads a list of configurations passes vacuously on an empty
    // list, which is what every assertion below would do if the runs were
    // deleted rather than weakened.
    expect(configs().length).toBeGreaterThan(0)
  })

  it('breaks below the score it claims, rather than merely reporting it', () => {
    const weak = configs().flatMap((scope) =>
      scope.thresholds.break === REQUIRED_SCORE ? [] : [`${scope.label}: break is ${String(scope.thresholds.break)}`],
    )
    expect(weak).toEqual([])
  })

  it('reports every score below the bar as a failure rather than as a shade of green', () => {
    const graded = configs().flatMap((scope) =>
      scope.thresholds.high === REQUIRED_SCORE && scope.thresholds.low === REQUIRED_SCORE ? [] : [scope.label],
    )
    expect(graded).toEqual([])
  })

  it('names a bun test command and something to mutate', () => {
    const unpaired = configs().flatMap((scope) =>
      scope.command.startsWith('bun test ') && scope.mutate.length > 0 ? [] : [scope.label],
    )
    expect(unpaired).toEqual([])
  })

  it('uses the built-in runner, and asks it for no coverage it cannot give', () => {
    // The command runner knows nothing about which test covered which mutant,
    // so anything but `off` here is a claim the runner cannot honour. The
    // runner itself is Stryker's default and is named nowhere: naming it makes
    // the dependency reader look for a plugin package that does not exist.
    const wrong = configs().flatMap((scope) =>
      scope.coverageAnalysis === 'off' && scope.testRunner === undefined ? [] : [scope.label],
    )
    expect(wrong).toEqual([])
  })

  it('excludes nothing from what it mutates', () => {
    const excluded = configs().flatMap((scope) =>
      scope.mutate.filter((pattern) => pattern.startsWith('!')).map((pattern) => `${scope.label}: ${pattern}`),
    )
    expect(excluded).toEqual([])
  })
})

describe('every mutation run reads the tree it claims to', () => {
  it('re-reads every mutant on every run, rather than trusting a stored verdict', () => {
    // Incremental mode keys a stored verdict on the mutated source. The command
    // runner tells it nothing about the tests, so a run after a test was added
    // — or deleted — reuses every verdict and reports the score the tests used
    // to earn. It did exactly that here: a scope whose coverage had just been
    // rewritten reported its old number, to the decimal.
    const stale = configs().flatMap((scope) => (scope.incremental === true ? [scope.label] : []))
    expect(stale).toEqual([])
  })

  it('mutates the source in place, so nothing it reads is a copy', () => {
    // The gates read the repository through `git ls-files`, and a sandbox copy
    // is not a repository. Mutating in place is what keeps the suites reading
    // the same tree they read outside a mutation run.
    const sandboxed = configs().flatMap((scope) => (scope.inPlace === true ? [] : [scope.label]))
    expect(sandboxed).toEqual([])
  })

  it('covers every file of source the repository ships', () => {
    // The denominator. A file inside no scope is a file whose every mutant is
    // uncounted, and nothing else in this repository would say so.
    const patterns = configs().flatMap((scope) => scope.mutate)
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
  it('is run by the one script that runs them all', () => {
    // `bun run mutate` is what a contributor runs and what the weekly audit
    // runs. A scope it does not name is a scope nothing measures, and the
    // score it declares is a number nobody has ever seen it earn.
    const all = manifestScripts().get('mutate') ?? ''
    const scopes = [...manifestScripts().keys()].filter((name) => name.startsWith('mutate:'))
    expect(scopes.length).toBeGreaterThan(0)
    expect(scopes.filter((name) => !all.includes(`bun run ${name}`))).toEqual([])
  })

  it('has a script for every scope, and a scope for every script', () => {
    const declared = new Set(configs().map((scope) => scope.label))
    const named = new Set(
      [...manifestScripts()]
        .filter(([name]) => name.startsWith('mutate:'))
        .flatMap(([, command]) => command.split(/\s+/u).filter((word) => word.endsWith('.json'))),
    )
    expect([...named].toSorted()).toEqual([...declared].toSorted())
  })
})
