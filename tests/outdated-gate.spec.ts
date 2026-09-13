/**
 * The outdated gate reports what it claims to, in both directions.
 *
 * Driven against fixed `bun outdated` output rather than the live registry: a
 * case that resolved real versions would pass or fail on what npm published
 * that morning, which is a test of the internet. The program half is driven as
 * a spawned process in `outdated-gate-program.spec.ts`, and in this process in
 * `outdated-guard-process.spec.ts`.
 */

import { describe, expect, it } from 'bun:test'
import { behindInstallable, OUTDATED_COMMAND, parseOutdated, tablePrinted } from '../scripts/check-outdated.ts'
import { declaredPins } from '../scripts/pins.ts'
import { TREE_SCAN_BUDGET_MS } from './tree-budget.ts'

/**
 * A table with one package at the newest and two behind.
 *
 * The `Update` column is what the declared range admits, so for an exactly
 * pinned dependency it equals `Current` even when a newer version exists —
 * which is why knip reads 6.33.0 there while 6.34.0 is published.
 */
const TABLE = `bun outdated v1.4.0 (34cbb9a40)
|----------------------------------------------------|
| Package           | Current | Update   | Latest    |
|-------------------|---------|----------|-----------|
| @types/node (dev) | 26.4.0  | 26.4.0   | 26.4.0    |
|-------------------|---------|----------|-----------|
| knip (dev)        | 6.33.0  | 6.33.0   | 6.34.0    |
|-------------------|---------|----------|-----------|
| oxlint (dev)      | 1.80.0  | 1.80.0   | 1.81.0    |
|----------------------------------------------------|
`

/**
 * A package on a prerelease channel above the version its `latest` tag names:
 * 0.1.2-rc.1 is newer than the tag's 0.0.1-rc.1. A string comparison would
 * order it behind and redden the gate for running the newest release.
 */
const AHEAD_OF_TAG = `bun outdated v1.4.0
|-------------------------------------------------------------------|
| Package                     | Current     | Update     | Latest     |
|-----------------------------|-------------|------------|------------|
| @deepseek-ai/dsh-client-web | 0.1.2-rc.1  | 0.1.2-rc.1 | 0.0.1-rc.1 |
|-------------------------------------------------------------------|`

/** A package whose channel has moved on: a prerelease behind a newer one. */
const BEHIND_CHANNEL = `bun outdated v1.4.0
|-------------------------------------------------------------------|
| Package                     | Current       | Update     | Latest     |
|-----------------------------|---------------|------------|------------|
| @deepseek-ai/dsh-client-web | 0.1.2-alpha.3 | 0.1.2-rc.1 | 0.1.2-rc.1 |
|-------------------------------------------------------------------|`

/** A row carrying a version this gate cannot read, which may not pass silently. */
const UNREADABLE = `bun outdated v1.4.0
|-------------------------------------------------------|
| Package  | Current      | Update | Latest              |
|----------|--------------|--------|---------------------|
| future   | not-a-semver | 1.0.0  | 1.0.0               |
|-------------------------------------------------------|`

/** Every dependency at the newest installable version, so the gate is silent. */
const ALL_CURRENT = `|----------|
| Package  | Current | Update  | Latest   |
|----------|---------|---------|----------|
| knip     | 6.34.0  | 6.34.0  | 6.34.0   |
|----------|`

/**
 * The all-workspace table `bun outdated --filter "*"` prints. A parser that
 * only accepted four cells would drop every row and the gate would go green
 * while playwright sat a release behind in the app workspace.
 */
const ALL_WORKSPACES = `bun outdated v1.4.2
|---------------------------------------------------------------|
| Package          | Current | Update | Latest | Workspace      |
|------------------|---------|--------|--------|----------------|
| @types/bun (dev) | 1.4.0   | 1.4.1  | 1.4.1  | @deeptail/root |
|------------------|---------|--------|--------|----------------|
| playwright (dev) | 1.62.1  | 1.62.1 | 1.63.0 | @deeptail/app  |
|------------------|---------|--------|--------|----------------|
| oxlint (dev)     | 1.80.0  | 1.80.0 | 1.81.0 | @deeptail/root |
|---------------------------------------------------------------|
`

/** A header the gate can read above a row too short to carry the columns it reads. */
const SHORT_ROW = `| Package | Current | Update | Latest |
| knip    | 6.33.0  |
`

/** A row whose newest column bun left empty, which the comparison must name. */
const BLANK_LATEST = `| Package | Current | Update | Latest |
| knip    | 6.34.0  | 6.34.0 |        |
`

describe('the outdated gate', () => {
  it('reads every row of the table and no rule or header', () => {
    const rows = parseOutdated(TABLE)
    expect(rows.map((row) => row.name)).toEqual(['@types/node', 'knip', 'oxlint'])
  })

  it('reports a package behind a version it could install today', () => {
    expect(behindInstallable(parseOutdated(TABLE))).toEqual([
      'knip is at 6.33.0 and 6.34.0 is installable now',
      'oxlint is at 1.80.0 and 1.81.0 is installable now',
    ])
  })

  it('does not report a package ahead of a stale dist-tag', () => {
    expect(behindInstallable(parseOutdated(AHEAD_OF_TAG))).toEqual([])
  })

  it('reports a package behind a newer prerelease than the one installed', () => {
    expect(behindInstallable(parseOutdated(BEHIND_CHANNEL))).toEqual([
      '@deepseek-ai/dsh-client-web is at 0.1.2-alpha.3 and 0.1.2-rc.1 is installable now',
    ])
  })

  it('names a row it cannot read rather than silently passing it', () => {
    expect(behindInstallable(parseOutdated(UNREADABLE))).toEqual([
      'future reports versions this gate cannot read: not-a-semver vs 1.0.0',
    ])
  })

  it('says nothing when everything is at the newest installable version', () => {
    expect(behindInstallable(parseOutdated(ALL_CURRENT))).toEqual([])
  })

  it('reads an empty report as nothing outdated', () => {
    expect(parseOutdated('bun outdated v1.4.0\n')).toEqual([])
    expect(behindInstallable([])).toEqual([])
  })
})

describe('the outdated gate against extra columns bun may add', () => {
  it('reads a table that gained a sixth column rather than dropping the row', () => {
    const extra = `bun outdated v1.4.2
| Package | Current | Update | Latest | Workspace | Extra |
|---------|---------|--------|--------|-----------|-------|
| knip    | 6.33.0  | 6.33.0 | 6.34.0 | root      | x     |
`
    expect(tablePrinted(extra)).toBe(true)
    expect(behindInstallable(parseOutdated(extra))).toEqual(['knip is at 6.33.0 and 6.34.0 is installable now'])
  })

  it('still reports a six-column outdated row sitting beside a five-column one', () => {
    const mixed = `bun outdated v1.4.2
| Package    | Current | Update | Latest | Workspace |
|------------|---------|--------|--------|-----------|
| oxlint     | 1.81.0  | 1.81.0 | 1.81.0 | root      |
| playwright | 1.62.1  | 1.62.1 | 1.63.0 | app       | leftover |
`
    expect(behindInstallable(parseOutdated(mixed))).toEqual(['playwright is at 1.62.1 and 1.63.0 is installable now'])
  })
})

describe('the outdated gate against a table it cannot read, and against none', () => {
  it('reads the all-workspace table, including a pin behind in a nested workspace', () => {
    const rows = parseOutdated(ALL_WORKSPACES)
    expect(rows.map((row) => row.name)).toEqual(['@types/bun', 'playwright', 'oxlint'])
    expect(behindInstallable(rows)).toEqual([
      '@types/bun is at 1.4.0 and 1.4.1 is installable now',
      'playwright is at 1.62.1 and 1.63.0 is installable now',
      'oxlint is at 1.80.0 and 1.81.0 is installable now',
    ])
  })

  it('asks bun for every workspace, not only the root', () => {
    expect([...OUTDATED_COMMAND]).toEqual(['bun', 'outdated', '--filter', '*'])
  })

  it('names a table whose rows have too few cells rather than reporting zero packages checked', () => {
    expect(tablePrinted(SHORT_ROW)).toBe(true)
    expect(parseOutdated(SHORT_ROW)).toEqual([])
    expect(tablePrinted('bun outdated v1.4.2\n')).toBe(false)
    expect(tablePrinted(ALL_WORKSPACES)).toBe(true)
  })

  it(
    'counts declared pins, so an empty bun table is currency not a miss',
    () => {
      // Live bun outdated --filter "*" prints only a version line when nothing
      // is behind. That is empty-by-currency. Reporting "0 checked" would be a
      // parse miss dressed as success: the manifests still declare pins.
      const pins = declaredPins()
      expect(pins.size).toBeGreaterThan(20)
      expect(pins.has('typescript')).toBe(true)
      expect(pins.has('playwright')).toBe(true)
      expect(tablePrinted('bun outdated v1.4.2 (744846f84)\n')).toBe(false)
      expect(parseOutdated('bun outdated v1.4.2 (744846f84)\n')).toEqual([])
    },
    TREE_SCAN_BUDGET_MS,
  )
})

describe('the rows the comparison passes over', () => {
  it('names a row whose newest column is blank rather than passing over it', () => {
    // An empty Latest cell is not "current": it is a column the table did not
    // answer, the same miss as a sixth-column drop. Silence here is how a pin
    // behind an installable version stays green.
    expect(behindInstallable(parseOutdated(BLANK_LATEST))).toEqual([
      'knip reports versions this gate cannot read: 6.34.0 vs ',
    ])
  })

  it('does not pass over a row whose newest column says something', () => {
    // The other half of the same rule: blank is silence, and anything else is
    // an answer this gate has to judge.
    expect(behindInstallable([{ name: 'oxlint', current: '1.81.0', latest: 'newest' }])).toEqual([
      'oxlint reports versions this gate cannot read: 1.81.0 vs newest',
    ])
  })
})
