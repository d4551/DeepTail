/**
 * The scale, read against the source that ships.
 *
 * A ladder that grows a second set of rungs beside its own, or a sheet that
 * states a size rather than reading one, is a regression no other gate reports:
 * the build still succeeds and every other suite stays green. The rules are read
 * here through the gate the chain runs, over the files that gate declares, so
 * there is one walk and one answer rather than two that can disagree.
 *
 * This is a property of the tree at rest, which is why it lives beside the
 * other tree suites and outside every mutation command: a run rewrites the tree
 * on purpose, so this case fails for every mutant alike, and a run whose every
 * mutant is killed by one always-failing case scores a hundred while proving
 * nothing.
 */

import { describe, expect, it } from 'bun:test'
import { GATE } from '../../scripts/check-scale.ts'
import { readGate } from '../../scripts/gate-runner.ts'
import { TREE_SCAN_BUDGET_MS } from '../tree-budget.ts'

describe('the scale the shipped sheets read', () => {
  it(
    'is declared by the token sheet alone, and read by every other sheet',
    async () => {
      const outcome = await readGate(GATE)
      const refused = outcome.ok ? [] : outcome.text.split('\n').filter((line) => line !== '')
      expect(refused).toEqual([])
    },
    TREE_SCAN_BUDGET_MS,
  )
})
