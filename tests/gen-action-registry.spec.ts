/**
 * The generator that writes the action registry's faces.
 *
 * `tests/actions.spec.ts` reads the faces this repository ships and holds them
 * to what the registry says they must be. What it never drove is the program
 * that puts them there: every case ran `--check` against the tree as it stands,
 * so the writing half — the half that decides what a face contains — scored
 * zero on the mutation run, and the refusal of an action naming a lane nobody
 * wrote had never once been reached.
 *
 * Every case here runs the generator against a tree this suite built, so a
 * mutant that writes the wrong bytes writes them where they can be read back
 * and nowhere near the repository.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { readRegistry } from '../scripts/action-registry.ts'
import { emitActionTable, emitCapabilities, emitTypeScript } from '../scripts/action-registry-emit.ts'
import { emitRust } from '../scripts/action-registry-rust.ts'
import { CHECK_FLAG, main, ROOT_FLAG, rootOf, SOURCES, unknownArguments } from '../scripts/gen-action-registry.ts'
import { ROOT } from '../scripts/source-tree.ts'
import { clearTreesAfterEach, type FixtureTree, fixtureTree } from './fixtures.ts'
import { cleanRun, importRunsNothing, runProgram } from './gate-program.ts'
import { PROGRAMS } from './programs.ts'

/** The program this module is when it is run rather than imported. */
const PROGRAM = PROGRAMS.actionRegistry

/** Trees this suite seated, taken down when each of its cases ends. */
const made: FixtureTree[] = []

clearTreesAfterEach(made)

/**
 * A tree carrying one registry and the lane files its actions name.
 *
 * The faces are named here even though the generator is what writes them: the
 * ledger is what takes a tree back down, and a case that leaked three generated
 * faces would leak them into the next run's scratch root.
 * @param registry - the registry source to write.
 * @param lanes - repository-relative lane paths to create.
 * @returns the tree.
 */
async function treeWith(registry: string, lanes: readonly string[]): Promise<FixtureTree> {
  const tree = fixtureTree('gen-registry')
  made.push(tree)
  for (const path of Object.values(SOURCES)) tree.pathOf(path)
  await Bun.write(tree.pathOf(SOURCES.registry), registry)
  await Promise.all(lanes.map(async (lane) => await Bun.write(tree.pathOf(lane), 'the suite that drives it\n')))
  return tree
}

/** The registry this repository ships, which is the one the faces are held to. */
const SHIPPED = await Bun.file(`${ROOT}${SOURCES.registry}`).text()

/** Every lane the shipped registry names, so a tree can carry them all. */
const SHIPPED_LANES = readRegistry(SHIPPED).actions.map((action) => action.lane)

describe('the generator writing the faces', () => {
  it('writes every face the registry declares, byte for byte', async () => {
    const built = await treeWith(SHIPPED, SHIPPED_LANES)
    expect(await main([ROOT_FLAG, built.root])).toBe(0)
    const registry = readRegistry(SHIPPED)
    const written = await Promise.all(
      (
        [
          [SOURCES.typescript, emitTypeScript(registry)],
          [SOURCES.capabilities, emitCapabilities(registry)],
          [SOURCES.actionTable, emitActionTable(registry)],
          [SOURCES.rust, emitRust(registry)],
        ] as const
      ).map(async ([path, expected]) => ((await Bun.file(built.pathOf(path)).text()) === expected ? '' : path)),
    )
    expect(written.filter((path) => path !== '')).toEqual([])
  })

  it('makes the directories a face is written into, rather than failing on them', async () => {
    // A fresh checkout has the registry and none of the faces; the generator is
    // what creates the tree they sit in.
    const fresh = await treeWith(SHIPPED, SHIPPED_LANES)
    expect(await main([ROOT_FLAG, fresh.root])).toBe(0)
    expect((await Bun.file(fresh.pathOf(SOURCES.rust)).text()).length).toBeGreaterThan(0)
  })
})

describe('the generator checking the faces', () => {
  it('reports every face that has drifted, and touches none of them', async () => {
    const drifted = await treeWith(SHIPPED, SHIPPED_LANES)
    await main([ROOT_FLAG, drifted.root])
    await Bun.write(drifted.pathOf(SOURCES.typescript), 'drifted\n')
    expect(await main([CHECK_FLAG, ROOT_FLAG, drifted.root])).toBe(1)
    // Reporting is not repairing: a check that rewrote what it found would make
    // the gate that runs it unable to ever report anything.
    expect(await Bun.file(drifted.pathOf(SOURCES.typescript)).text()).toBe('drifted\n')
  })

  it('reports a face that is not there at all', async () => {
    // A fresh tree has none of them, and a check that read an absent file as
    // agreement would pass over a repository missing every generated face.
    const absent = await treeWith(SHIPPED, SHIPPED_LANES)
    expect(await main([CHECK_FLAG, ROOT_FLAG, absent.root])).toBe(1)
  })

  it('says which fault each face has, because they are different faults', async () => {
    // One tree, one face edited and one removed, so the two states are read
    // side by side rather than one at a time.
    const both = await treeWith(SHIPPED, SHIPPED_LANES)
    await main([ROOT_FLAG, both.root])
    await Bun.write(both.pathOf(SOURCES.typescript), 'drifted\n')
    await Bun.file(both.pathOf(SOURCES.rust)).delete()
    const checked = await runProgram(PROGRAM, [CHECK_FLAG, ROOT_FLAG, both.root], both.root)
    expect(checked.code).toBe(1)
    expect(checked.err).toContain(`${SOURCES.typescript} (drifted)`)
    expect(checked.err).toContain(`${SOURCES.rust} (missing)`)
    // Named apart, not run together: a reader has to be able to tell which
    // face is which fault.
    expect(checked.err).toContain(', ')
  })

  it('agrees with a tree the generator has just written', async () => {
    const agreed = await treeWith(SHIPPED, SHIPPED_LANES)
    expect(await main([ROOT_FLAG, agreed.root])).toBe(0)
    expect(await main([CHECK_FLAG, ROOT_FLAG, agreed.root])).toBe(0)
  })
})

describe('the generator as the program the gate runs', () => {
  it('reports the stale faces on the error stream, and exits non-zero', async () => {
    // The gate runs the program, not the function: what a reader is told, and
    // what the shell is told, are both decided under the guard at the bottom
    // of the module, which no importing suite reaches.
    const ungated = await treeWith(SHIPPED, SHIPPED_LANES)
    const stale = await runProgram(PROGRAM, [CHECK_FLAG, ROOT_FLAG, ungated.root], ungated.root)
    expect(stale.code).toBe(1)
    expect(stale.err).toContain('action registry is stale:')
    expect(stale.err).toContain(`${SOURCES.typescript} (missing)`)
  })

  it('writes the faces and exits zero when it is run with no arguments', async () => {
    // With no `--check` the program writes. Reading the arguments wrongly — one
    // element out — turns a write into a check and a check into a write.
    const noFlags = await treeWith(SHIPPED, SHIPPED_LANES)
    const wrote = await runProgram(PROGRAM, [ROOT_FLAG, noFlags.root], noFlags.root)
    cleanRun(wrote)
    expect((await Bun.file(noFlags.pathOf(SOURCES.typescript)).text()).length).toBeGreaterThan(0)
  })

  it('runs nothing when the generator is imported rather than run', async () => {
    // The guard is the difference between a module and a program. Dropped, an
    // importing suite generates faces as a side effect of the import — into
    // this repository, because an import carries no tree to work in — and says
    // so on the output stream, which is what makes it visible here.
    await importRunsNothing(PROGRAM, 'gen-registry')
  })
})

describe('what the program tells a reader', () => {
  it('names every face it wrote, so a run is readable rather than silent', async () => {
    const printed = await treeWith(SHIPPED, SHIPPED_LANES)
    const louder = await runProgram(PROGRAM, [ROOT_FLAG, printed.root], printed.root)
    expect(louder.code).toBe(0)
    expect(louder.out.split('\n').filter((line) => line !== '')).toEqual([
      SOURCES.typescript,
      SOURCES.capabilities,
      SOURCES.actionTable,
      SOURCES.rust,
    ])
  })

  it('refuses an argument it does not understand, rather than doing something else', async () => {
    // `--chekc` is the command that writes where a reader meant to compare, and
    // the gate that runs this would then rewrite the drift it exists to report.
    const mistyped = await treeWith(SHIPPED, SHIPPED_LANES)
    const refused = await runProgram(PROGRAM, ['--chekc', ROOT_FLAG, mistyped.root], mistyped.root)
    expect(refused.code).toBe(2)
    expect(refused.err).toContain('--chekc')
    // Nothing was written: a refused command does not half-run.
    expect(await Bun.file(mistyped.pathOf(SOURCES.typescript)).exists()).toBe(false)
  })

  it('refuses the argument in-process too, before it reads a tree at all', async () => {
    // The refusal is decided before the registry is read: the function answers
    // 2 with no tree named at all, which is the decision the program above
    // reports on the error stream.
    expect(await main(['--chekc'])).toBe(2)
  })

  it('names every argument it refused, apart from each other', async () => {
    // More than one at a time is the ordinary case for a mistyped command, and
    // a list run together is a message a reader cannot act on.
    const typo = await treeWith(SHIPPED, SHIPPED_LANES)
    const two = await runProgram(PROGRAM, ['--chekc', 'stray', ROOT_FLAG, typo.root], typo.root)
    expect(two.code).toBe(2)
    expect(two.err.trimEnd().endsWith('unknown argument(s): --chekc, stray')).toBe(true)
  })
})

describe('the tree the generator is pointed at', () => {
  it('is this repository when no tree is named', () => {
    // The gate runs it with no tree, and that has to mean this one.
    expect(rootOf([])).toBe(ROOT)
    expect(rootOf([CHECK_FLAG])).toBe(ROOT)
  })

  it('is the tree named after the flag, with or without its separator', () => {
    // The paths are joined onto the root by concatenation, so a root missing
    // its separator would write `…/tmp/treeapps/deeptail/…`.
    expect(rootOf([ROOT_FLAG, '/tmp/tree/'])).toBe('/tmp/tree/')
    expect(rootOf([ROOT_FLAG, '/tmp/tree'])).toBe('/tmp/tree/')
    expect(rootOf([CHECK_FLAG, ROOT_FLAG, '/tmp/tree'])).toBe('/tmp/tree/')
  })

  it('is this repository when the flag names nothing', () => {
    // A flag with no value is a mistyped command, and writing the faces into
    // whatever the empty string resolves to is not what it asked for.
    expect(rootOf([ROOT_FLAG])).toBe(ROOT)
    expect(rootOf([ROOT_FLAG, ''])).toBe(ROOT)
  })
})

describe('the arguments the generator accepts', () => {
  it('is named exactly as the gate and the flag readers spell it', () => {
    // Both are the program's grammar, and the suite reads them through the same
    // names the program does — so a constant renamed to nothing would leave
    // every case here agreeing with a program that accepts nothing.
    expect([CHECK_FLAG, ROOT_FLAG]).toEqual(['--check', '--root'])
  })

  it('accepts its own grammar and nothing else', () => {
    expect(unknownArguments([])).toEqual([])
    expect(unknownArguments([CHECK_FLAG])).toEqual([])
    expect(unknownArguments([ROOT_FLAG, '/tmp/tree'])).toEqual([])
    expect(unknownArguments([CHECK_FLAG, ROOT_FLAG, '/tmp/tree'])).toEqual([])
  })

  it('names every argument that is not part of it', () => {
    expect(unknownArguments(['--chekc'])).toEqual(['--chekc'])
    expect(unknownArguments([CHECK_FLAG, 'extra'])).toEqual(['extra'])
    // The interpreter and the script path, which is what an unsliced argument
    // list hands the program.
    expect(unknownArguments(['/bin/bun', 'scripts/gen-action-registry.ts', CHECK_FLAG])).toEqual([
      '/bin/bun',
      'scripts/gen-action-registry.ts',
    ])
  })
})

describe('the generator refusing a registry it cannot trust', () => {
  it('refuses an action whose lane names no file, before writing anything', async () => {
    // An entry naming no file is an action nobody drives, and a face built from
    // it claims a control is covered on the strength of a row nobody ran.
    const lane = await treeWith(SHIPPED, [])
    await expect(main([ROOT_FLAG, lane.root])).rejects.toThrow('which is not a file')
    // Nothing was written: the refusal comes before the faces are emitted, so a
    // tree is never left half generated from a registry that was refused.
    expect(await Bun.file(lane.pathOf(SOURCES.typescript)).exists()).toBe(false)
  })

  it('names the action and the lane it named, so the row can be found', async () => {
    const unnamed = await treeWith(SHIPPED, [])
    const first = readRegistry(SHIPPED).actions[0]
    await expect(main([CHECK_FLAG, ROOT_FLAG, unnamed.root])).rejects.toThrow(`action "${first?.id ?? ''}"`)
  })

  it('refuses a registry that does not read at all, rather than writing from it', async () => {
    const malformed = await treeWith('{ "version": 1 }', [])
    await expect(main([ROOT_FLAG, malformed.root])).rejects.toThrow()
  })
})
