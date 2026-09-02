/**
 * The outdated gate reports what it claims to, in both directions.
 *
 * Driven against fixed `bun outdated` output rather than the live registry: a
 * case that resolved real versions would pass or fail on what npm published
 * that morning, which is a test of the internet.
 */

import { describe, expect, it } from 'bun:test'
import { behindInstallable, heldByPolicy, parseOutdated } from '../scripts/check-outdated.ts'

/**
 * A table with one package behind, one held, and one at the newest.
 *
 * The `Update` column is what the declared range admits, so for an exactly
 * pinned dependency it equals `Current` even when a newer version exists —
 * which is why knip reads 6.33.0 there while 6.34.0 is published.
 */
const TABLE = `bun outdated v1.4.0 (34cbb9a40)
|----------------------------------------------------|
| Package           | Current | Update   | Latest    |
|-------------------|---------|----------|-----------|
| @types/node (dev) | 26.4.0  | 26.4.0 * | 26.4.0 *  |
|-------------------|---------|----------|-----------|
| knip (dev)        | 6.33.0  | 6.33.0   | 6.34.0    |
|-------------------|---------|----------|-----------|
| oxlint (dev)      | 1.80.0  | 1.80.0   | 1.81.0 *  |
|----------------------------------------------------|
Note: The * indicates that version isn't true latest due to minimum release age
`

describe('the outdated gate', () => {
  it('reads every row of the table and no rule or header', () => {
    const rows = parseOutdated(TABLE)
    expect(rows.map((row) => row.name)).toEqual(['@types/node', 'knip', 'oxlint'])
  })

  it('reports a package behind a version it could install today', () => {
    expect(behindInstallable(parseOutdated(TABLE))).toEqual(['knip is at 6.33.0 and 6.34.0 is installable now'])
  })

  it('does not report a package the supply-chain hold is withholding', () => {
    // oxlint's newest is 1.81.0 and the hold keeps it at 1.80.0. That is the
    // hold working; reporting it would make the gate demand a bypass of the
    // repository's own security policy to go green.
    const behind = behindInstallable(parseOutdated(TABLE))
    expect(behind.some((line) => line.startsWith('oxlint'))).toBe(false)
    expect(heldByPolicy(parseOutdated(TABLE))).toEqual(['@types/node 26.4.0', 'oxlint 1.80.0'])
  })

  it('says nothing when everything is at the newest installable version', () => {
    const current = `|----------|
| Package  | Current | Update  | Latest   |
|----------|---------|---------|----------|
| knip     | 6.34.0  | 6.34.0  | 6.34.0   |
|----------|`
    expect(behindInstallable(parseOutdated(current))).toEqual([])
  })

  it('reads an empty report as nothing outdated', () => {
    expect(parseOutdated('bun outdated v1.4.0\n')).toEqual([])
    expect(behindInstallable([])).toEqual([])
  })
})
