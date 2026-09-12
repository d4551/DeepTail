/**
 * Which files the gates read, as git itself defines it.
 *
 * Every gate in the chain reads this list. A list that misses a file is a gate
 * that silently stops checking it — a gate that reads nothing reports nothing —
 * and a list that carries a path with no bytes is a gate that fails on a
 * deletion nobody has recorded yet.
 */

import { describe, expect, it } from 'bun:test'
import { LISTING_COMMAND, onlyPresent, ROOT, repositoryFiles } from '../scripts/source-tree.ts'
import { TREE_SCAN_BUDGET_MS } from './tree-budget.ts'

/**
 * The repository root, resolved from this file rather than from the module
 * under test.
 *
 * The probe below has to be written somewhere and then taken away again. Taking
 * the place to write it from the module being measured means a mutation run can
 * move it, and the sweep then looks where the probe is not — so the one path
 * this suite writes to is its own.
 */
const REPOSITORY = new URL('../', import.meta.url).pathname

/** The extension the probe carries, which nothing the repository ships uses. */
const PROBE_EXTENSION = '.probe-ext'

/**
 * Remove every probe file anywhere in the repository.
 *
 * `git clean` over the extension, so a probe is removed wherever it was
 * written. Ignored paths are left alone — the flag that would reach into them
 * is not passed — so nothing outside what this suite writes is in reach.
 * @returns the paths it removed, repository-relative.
 */
function sweepProbes(): string[] {
  const run = Bun.spawnSync(['git', 'clean', '-f', '--', `*${PROBE_EXTENSION}`], { cwd: REPOSITORY })
  return (run.stdout?.toString() ?? '')
    .split('\n')
    .flatMap((line) => (line.startsWith('Removing ') ? [line.slice('Removing '.length).trim()] : []))
}

describe('the file list', () => {
  it(
    'reports each file by a repository-relative label and a path that opens it',
    async () => {
      const file = repositoryFiles(['/package.json']).find((one) => one.label === 'apps/deeptail/package.json')
      expect(file?.label).toBe('apps/deeptail/package.json')
      expect(file?.path).toBe(`${ROOT}apps/deeptail/package.json`)
      expect(await Bun.file(file?.path ?? '').exists()).toBe(true)
    },
    TREE_SCAN_BUDGET_MS,
  )

  it(
    'keeps only the extensions it was asked for, and every one of them',
    () => {
      const labels = repositoryFiles(['.css']).map((file) => file.label)
      expect(labels.length).toBeGreaterThan(0)
      expect(labels.filter((label) => !label.endsWith('.css'))).toEqual([])
      const both = repositoryFiles(['.css', '.rs']).map((file) => file.label)
      expect(both.length).toBeGreaterThan(labels.length)
      expect(both.filter((label) => !label.endsWith('.css') && !label.endsWith('.rs'))).toEqual([])
    },
    TREE_SCAN_BUDGET_MS,
  )

  it(
    'reports nothing where no extension matches, and nothing where none is asked for',
    () => {
      expect(repositoryFiles(['.no-such-extension'])).toEqual([])
      expect(repositoryFiles([])).toEqual([])
    },
    TREE_SCAN_BUDGET_MS,
  )

  it(
    'reports the files in path order, so an offence list reads the same twice',
    () => {
      const labels = repositoryFiles(['.ts']).map((file) => file.label)
      expect(labels).toEqual(labels.toSorted())
    },
    TREE_SCAN_BUDGET_MS,
  )

  it(
    'reads the ignore rules, so nothing a build wrote is in the list',
    () => {
      const labels = repositoryFiles(['.ts', '.js', '.json']).map((file) => file.label)
      expect(labels.filter((label) => label.startsWith('node_modules/'))).toEqual([])
      expect(labels.filter((label) => label.includes('/dist/'))).toEqual([])
    },
    TREE_SCAN_BUDGET_MS,
  )

  it('reads the index without taking a lock, so a concurrent writer never blocks the listing', () => {
    // The listing runs beside every other gate, suite and agent in the
    // workspace, several of them holding the index for writing. An optional
    // lock taken for a read would serialise the whole chain behind them — the
    // shape a full run hung on — so the command declines the lock before it
    // names the subcommand, which is where git reads it.
    const subcommand = LISTING_COMMAND.indexOf('ls-files')
    expect(subcommand).toBeGreaterThan(0)
    expect(LISTING_COMMAND[0]).toBe('git')
    expect(LISTING_COMMAND.slice(1, subcommand)).toContain('--no-optional-locks')
  })
})

describe('the file list against the index', () => {
  it(
    'reads a file git has never seen, so nothing can hide behind the index',
    async () => {
      // `--others --exclude-standard`: a source file added but not yet staged is
      // a file that ships, and a gate that read only the index would not see it.
      // The probe is read, then removed, and only then is the expectation held:
      // the removal runs before anything that could fail on it, so a red case
      // leaves no probe file behind in the tree it just measured.
      //
      // Awaited, and swept rather than unlinked. `Bun.write` returns a promise,
      // and leaving it unawaited raced the removal on the next line: the write
      // landed after the `rm` and the probe stayed in the repository — which is
      // how `scripts/source-tree.tszz-source-tree-probe.probe-ext` came to sit
      // in a working tree. The sweep is `git clean` over the extension, so a
      // probe written anywhere in the repository is removed, not only the path
      // this case computed: under a mutation run the root is a mutable thing,
      // and a probe left where the sweep is not looking is debris this suite
      // wrote and nothing removes.
      const scratch = `${REPOSITORY}zz-source-tree-probe.probe-ext`
      await Bun.write(scratch, 'probe\n')
      const listed = repositoryFiles(['.probe-ext']).map((file) => file.label)
      const swept = sweepProbes()
      expect(listed).toEqual(['zz-source-tree-probe.probe-ext'])
      // What the sweep removed is asserted too: a case that wrote nothing, or
      // one whose probe escaped the path it named, both read differently here.
      expect(swept).toEqual(['zz-source-tree-probe.probe-ext'])
    },
    TREE_SCAN_BUDGET_MS,
  )

  it('leaves out a path whose bytes are gone', () => {
    // A path git still carries whose file has been deleted is a deletion
    // waiting to be recorded, and there is nothing in it for a gate to read.
    const present = { label: 'package.json', path: `${ROOT}package.json` }
    const deleted = { label: 'never-shipped.ts', path: `${ROOT}never-shipped.ts` }
    expect(onlyPresent([present, deleted])).toEqual([present])
    expect(onlyPresent([deleted, present]).map((file) => file.label)).toEqual(['package.json'])
    expect(onlyPresent([])).toEqual([])
  })
})
