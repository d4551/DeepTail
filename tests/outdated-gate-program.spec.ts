/**
 * The dependency freshness gate as the program the merge chain runs.
 *
 * `outdated-gate.spec.ts` drives what the gate reads out of bun's table. This
 * drives what it does with it — which stream each half of the answer goes to,
 * what the shell is told, and what happens when bun itself fails — and the
 * shapes of line the reader must and must not take a row out of. All of the
 * first lived under `import.meta.main`, where no importing suite reaches it,
 * and the module scored 50.39 with those mutants surviving.
 *
 * `bun outdated` is substituted, and only it: a program on the path that prints
 * what bun prints. Above that boundary this is the shipped gate, run as a
 * process, reading a table it did not write. The process plumbing — the made
 * tree, the spawn, the two streams — is the one the gate-program suites share.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { chmod, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { outdatedReport, parseOutdated, rowOf, tablePrinted } from '../scripts/check-outdated.ts'
import { importRunsNothing, runGateProgram, suiteRoot } from './gate-program.ts'
import { TREE_SCAN_BUDGET_MS } from './tree-budget.ts'

/** The program the merge chain runs, by absolute path. */
const GATE = new URL('../scripts/check-outdated.ts', import.meta.url).pathname

/** A table bun prints when one package is behind. */
const BEHIND = [
  '|-------------------------------|',
  '| Package | Current | Update | Latest |',
  '|-------------------------------|',
  '| oxlint (dev) | 1.81.0 | 1.81.0 | 1.82.0 |',
  '|-------------------------------|',
].join('\n')

/** What one run of the gate told the two streams and the shell. */
interface Run {
  readonly out: string
  readonly err: string
  readonly code: number
}

/**
 * Run the gate with a bun that prints the table this case wants it to.
 * @param table - what the substituted bun prints to its output stream.
 * @param code - what the substituted bun exits with.
 * @param manifest - the manifest the tree carries, which is where the pins are.
 * @returns what the gate printed and exited with.
 */
async function runGate(
  table: string,
  code = 0,
  manifest = '{ "devDependencies": { "oxlint": "1.81.0" } }',
): Promise<Run> {
  const root = await suiteRoot('outdated-gate-')
  await writeFile(join(root, 'package.json'), manifest)
  // The pins are read through `git ls-files`, so the tree has to be one.
  Bun.spawnSync(['git', 'init', '--quiet'], { cwd: root })
  const bin = join(root, 'bin')
  await mkdir(bin, { recursive: true })
  const script = ['#!/bin/sh', `cat <<'TABLE'`, table, 'TABLE', `exit ${String(code)}`, ''].join('\n')
  await writeFile(join(bin, 'bun'), script)
  await chmod(join(bin, 'bun'), 0o755)
  return await runGateProgram(GATE, root, bin)
}

describe('the line a row is read out of', () => {
  it('reads a row out of a table line, and nothing out of a rule or a header underline', () => {
    expect(rowOf('| oxlint | 1.81.0 | 1.81.0 | 1.82.0 |')).toEqual({
      name: 'oxlint',
      current: '1.81.0',
      latest: '1.82.0',
    })
    expect(rowOf('|-------------------|')).toBeUndefined()
  })

  it('reads nothing out of a line that merely ends with the table’s own edge', () => {
    // A row opens with the edge. A reader that looked for it at the other end
    // of the line — or looked for nothing at all — would take a note bun wrote
    // with pipes in it as four columns and report a package that is not one.
    expect(rowOf('note: run with --verbose |')).toBeUndefined()
    expect(rowOf('oxlint | 1.81.0 | 1.81.0 | 1.82.0 | held |')).toBeUndefined()
    expect(rowOf('note: a | b | c | d | e |')).toBeUndefined()
  })

  it('reads nothing out of a row with no columns at all', () => {
    // The shapes a rule leaves behind once its dashes are gone. Each is short
    // by a different column, and a reader that stopped checking at any one of
    // them would build a row out of the holes in the others.
    expect(rowOf('|')).toBeUndefined()
    expect(rowOf('||')).toBeUndefined()
    expect(rowOf('| oxlint ||')).toBeUndefined()
  })

  it('reads nothing out of a row too short to carry the columns it reads', () => {
    // Two cells, and three, are shapes this gate does not know: taking the
    // last of them for the newest version would compare a pin against the
    // column bun puts beside it, which is the pin itself.
    expect(rowOf('| oxlint | 1.81.0 |')).toBeUndefined()
    expect(rowOf('| oxlint | 1.81.0 | 1.82.0 |')).toBeUndefined()
    expect(rowOf('| oxlint | 1.81.0 | 1.81.0 | 1.82.0 |')?.latest).toBe('1.82.0')
  })

  it('reads the columns of the all-workspace table, which carries one more', () => {
    expect(rowOf('| oxlint | 1.81.0 | 1.81.0 | 1.82.0 | @deeptail/root |')).toEqual({
      name: 'oxlint',
      current: '1.81.0',
      latest: '1.82.0',
    })
  })
})

describe('the name a row reports', () => {
  it('strips the suffix bun appends to a development dependency', () => {
    expect(parseOutdated('| oxlint (dev) | 1.81.0 | 1.81.0 | 1.82.0 |')[0]?.name).toBe('oxlint')
  })

  it('strips it however bun spaced it, and only where bun puts it', () => {
    // The gap is a run of spaces, and the suffix is a suffix: a package whose
    // own name carries those letters keeps them.
    expect(parseOutdated('| oxlint  (dev) | 1.81.0 | 1.81.0 | 1.82.0 |')[0]?.name).toBe('oxlint')
    expect(parseOutdated('| dev-server | 1.81.0 | 1.81.0 | 1.82.0 |')[0]?.name).toBe('dev-server')
    expect(parseOutdated('| a(dev)b | 1.81.0 | 1.81.0 | 1.82.0 |')[0]?.name).toBe('a(dev)b')
  })

  it('reads the header as a header rather than as a package', () => {
    expect(parseOutdated('| Package | Current | Update | Latest |')).toEqual([])
    expect(tablePrinted('| Package | Current | Update | Latest |')).toBe(true)
    expect(tablePrinted('| oxlint | 1.81.0 | 1.81.0 | 1.82.0 |')).toBe(false)
  })
})

describe('what the gate reports for one table', () => {
  it('says every pin is current, naming how many it read', () => {
    const pins = new Map([['oxlint', '1.82.0']])
    expect(outdatedReport('', pins)).toEqual({
      out: 'every dependency is at the newest version this workspace can install (1 declared pins current; bun listed 0 outdated)\n',
      err: '',
      code: 0,
    })
  })

  it('names every pin behind an installable version, one to a line, and fails', () => {
    // Two of them, on their own lines: a report that ran them together carries
    // every word a search would look for and none of the shape a reader needs.
    const two = [BEHIND, '| parse5 (dev) | 8.0.1 | 8.0.1 | 8.1.0 |'].join('\n')
    expect(outdatedReport(two, new Map([['oxlint', '1.81.0']]))).toEqual({
      out: '',
      err: [
        'check-outdated: dependencies behind an installable version:',
        '  oxlint is at 1.81.0 and 1.82.0 is installable now',
        '  parse5 is at 8.0.1 and 8.1.0 is installable now',
        '',
      ].join('\n'),
      code: 1,
    })
  })

  it('refuses a table it could read the header of and no row out of', () => {
    // A header this gate can see with no row under it is a table bun printed in
    // a shape this reader lost, and reporting "0 outdated" over it is the whole
    // failure this case exists for.
    const header = ['| Package | Current | Update | Latest |', '| oxlint | 1.81.0 |'].join('\n')
    expect(outdatedReport(header, new Map([['oxlint', '1.81.0']]))).toEqual({
      out: '',
      err: 'check-outdated: bun printed a table this gate could not read\n',
      code: 1,
    })
  })

  it('refuses a workspace that declares nothing, rather than passing over it', () => {
    // No pins is not every pin current; it is a reader that found no manifest.
    expect(outdatedReport('', new Map())).toEqual({
      out: '',
      err: 'check-outdated: no dependencies are declared in any workspace manifest\n',
      code: 1,
    })
  })
})

describe('the gate as the program the merge chain runs', () => {
  it(
    'reads what bun printed and says every pin is current',
    async () => {
      const run = await runGate('')
      expect([run.code, run.err]).toEqual([0, ''])
      expect(run.out).toContain('every dependency is at the newest version this workspace can install')
    },
    TREE_SCAN_BUDGET_MS,
  )

  it(
    'names the pins behind an installable version, and fails the gate',
    async () => {
      const run = await runGate(BEHIND)
      expect(run.code).toBe(1)
      expect(run.err).toContain('oxlint is at 1.81.0 and 1.82.0 is installable now')
      expect(run.out).toBe('')
    },
    TREE_SCAN_BUDGET_MS,
  )

  it(
    'fails, and says what bun said, when bun itself fails',
    async () => {
      // A gate that read a failed run's empty table would call every pin current
      // on the strength of bun not having answered.
      const run = await runGate('error: no lockfile', 1)
      expect(run.code).toBe(1)
      expect(run.err).toContain('check-outdated: bun outdated exited 1')
      expect(run.out).toBe('')
    },
    TREE_SCAN_BUDGET_MS,
  )

  it('runs nothing when it is imported rather than run', async () => {
    await importRunsNothing(GATE, 'outdated-gate-')
  })
})
