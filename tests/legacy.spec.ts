/**
 * The bans on legacy idioms and on inline styles, read against the source that
 * ships.
 *
 * Source that reintroduces a pattern the project has moved past, or a style
 * written where a class belongs, is a regression no other gate reports: the
 * build still succeeds and every other suite stays green. The compiler face the
 * same kind of drift lands on is held by `compiler-face.spec.ts`.
 *
 * `check:bans` and `check:styles` run the same readers over the same tree from
 * the gate chain, which is where a mutation run can drive them: this suite
 * cannot judge a mutation of the modules it reads, because the instrumenter
 * writes `var` and the bans refuse it, so the case would fail for every mutant
 * alike. That is a reason for the mutation commands to leave this file out —
 * `mutation-config.spec.ts` names it and holds it to still running under
 * `bun run test` — and not a reason for the suite to stop existing. A
 * contributor runs `bun test`; a reader of that run should see this.
 */

import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import * as bans from '../scripts/ban-gate.ts'
import { repositoryFiles } from '../scripts/source-tree.ts'
import * as styles from '../scripts/style-gate.ts'

describe('legacy patterns and suppressions', () => {
  it('has none anywhere the repository ships', async () => {
    const files = repositoryFiles([...bans.SCRIPT_EXTENSIONS, ...bans.PLAIN_EXTENSIONS])
    const offences = await Promise.all(
      files.map(async (file) => bans.scanSource(file.label, await readFile(file.path, 'utf8'))),
    )
    expect(offences.flat().map((offence) => `${offence.label}:${String(offence.line)}: ${offence.why}`)).toEqual([])
  })

  it('has no inline style anywhere the repository ships', async () => {
    const files = repositoryFiles([...styles.SCRIPT_EXTENSIONS, ...styles.MARKUP_EXTENSIONS])
    const offences = await Promise.all(
      files.map(async (file) => styles.scanSource(file.label, await readFile(file.path, 'utf8'))),
    )
    expect(offences.flat().map((offence) => `${offence.label}:${String(offence.line)}: ${offence.why}`)).toEqual([])
  })
})
