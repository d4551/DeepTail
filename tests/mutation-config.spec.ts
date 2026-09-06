/**
 * The mutation runs' own configuration, held to what it claims.
 *
 * A mutation score is only worth what its denominator is. Two edits move it
 * without touching a line of product code — lowering the breaking threshold,
 * and narrowing what is mutated — and both read as configuration rather than as
 * a weakened test. A third, the disable comment, exempts one mutant in place
 * and leaves nothing at all in the diff to say what was exempted or why.
 *
 * All three are refused here: the thresholds are pinned, each run is pinned to
 * the command that actually covers what it mutates, and no source anywhere may
 * carry the disable comment.
 */

import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
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
  readonly ignorePatterns?: readonly string[]
  readonly thresholds?: { readonly high?: number; readonly low?: number; readonly break?: number | null }
}

/** The score every scope is held to. */
const REQUIRED_SCORE = 99

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

  it('runs the command that covers what it mutates', async () => {
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

  it('excludes nothing from what it mutates', async () => {
    const excluded = (await configs()).flatMap(({ label, config }) =>
      (config.mutate ?? []).filter((pattern) => pattern.startsWith('!')).map((pattern) => `${label}: ${pattern}`),
    )
    expect(excluded).toEqual([])
  })
})

describe('the repository', () => {
  it('exempts no mutant in place', async () => {
    // Spelt in parts so this file's own source carries none whole.
    const directive = joined('// Stry', 'ker ')
    const files = repositoryFiles(['.ts', '.tsx', '.js', '.css', '.json', '.rs', '.md'])
    const carrying = (
      await Promise.all(files.map(async (file) => ({ label: file.label, text: await readFile(file.path, 'utf8') })))
    ).flatMap((file) => (file.text.includes(directive) ? [file.label] : []))
    expect(carrying).toEqual([])
  })
})
