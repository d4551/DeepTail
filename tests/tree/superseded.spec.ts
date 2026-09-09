/**
 * The bans on superseded idioms and on inline styles, read against the source
 * that ships.
 *
 * Source that reintroduces a pattern the project has moved past, or a style
 * written where a class belongs, is a regression no other gate reports: the
 * build still succeeds and every other suite stays green. The compiler face that the
 * same kind of drift lands on is held by `compiler-face.spec.ts`.
 *
 * Each rule is read here through the gate the chain runs, over the files that
 * gate declares, so there is one walk and one answer rather than two that can
 * disagree. What this file adds is the audience: a contributor runs `bun test`,
 * and a reader of that run sees the repository judged as well as the readers.
 *
 * This is a property of the tree at rest, which is why it lives beside the
 * other tree suites and outside every mutation command: a run rewrites the tree
 * on purpose, so this case fails for every mutant alike, and a run whose every
 * mutant is killed by one always-failing case scores a hundred while proving
 * nothing.
 */

import { describe, expect, it } from 'bun:test'
import { GATE as BANS } from '../../scripts/check-bans.ts'
import { GATE as ENTRIES } from '../../scripts/check-entries.ts'
import { GATE as INLINE_STYLES } from '../../scripts/check-no-inline-styles.ts'
import { GATE as STYLESHEETS } from '../../scripts/check-stylesheets.ts'
import { type Gate, readGate } from '../../scripts/gate-runner.ts'

/**
 * What one gate refused, one line per offence.
 * @param gate - the gate to run over the repository.
 * @returns the offences, empty when it refused nothing.
 */
async function refused(gate: Gate): Promise<string[]> {
  const outcome = await readGate(gate)
  return outcome.ok ? [] : outcome.text.split('\n').filter((line) => line !== '')
}

describe('the repository under the gates that read all of it', () => {
  it('carries no legacy idiom and no suppression', async () => {
    expect(await refused(BANS)).toEqual([])
  })

  it('carries no inline style', async () => {
    expect(await refused(INLINE_STYLES)).toEqual([])
  })

  it('carries no stylesheet value outside the scale', async () => {
    expect(await refused(STYLESHEETS)).toEqual([])
  })

  it('carries no script that does work when it is imported', async () => {
    expect(await refused(ENTRIES)).toEqual([])
  })
})
