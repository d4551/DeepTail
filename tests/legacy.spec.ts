/**
 * The bans on legacy idioms, on inline styles, and on a checker quietly
 * switched off — read against the source and the configs that ship.
 *
 * A toolchain that silently slips back a major version, or source that
 * reintroduces a pattern the project has moved past, is a regression no other
 * gate reports: the build still succeeds and every other suite stays green.
 */

import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import * as bans from '../scripts/ban-gate.ts'
import { repositoryFiles } from '../scripts/source-tree.ts'
import * as styles from '../scripts/style-gate.ts'
import { EMPTY_SECTION, isJsonObject, readJsonc } from './jsonc.ts'

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

  it('states a modern compilation target', async () => {
    const base = readJsonc(await readFile('tsconfig.base.json', 'utf8'))
    const compilerOptions = base.compilerOptions
    if (!isJsonObject(compilerOptions ?? {})) throw new Error('tsconfig.base.json carries no compilerOptions object')
    const options = isJsonObject(compilerOptions) ? compilerOptions : EMPTY_SECTION
    // TypeScript 7 turns `strict` and `module: esnext` on by default, so the
    // failure to guard against is someone switching them back off.
    expect(options.strict).not.toBe(false)
    expect(String(options.module ?? 'esnext').toLowerCase()).not.toBe('commonjs')
    const target = String(options.target ?? '').toLowerCase()
    expect(target === 'esnext' || Number(target.replace('es', '')) >= 2022).toBe(true)
    // Everything tightened beyond the defaults has to stay tightened.
    for (const option of [
      'noUncheckedIndexedAccess',
      'exactOptionalPropertyTypes',
      'noImplicitOverride',
      'noFallthroughCasesInSwitch',
      'noImplicitReturns',
      'verbatimModuleSyntax',
      'isolatedModules',
    ]) {
      expect([option, options[option]]).toEqual([option, true])
    }
  })
})
