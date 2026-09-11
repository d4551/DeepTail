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

import { afterEach, describe, expect, it } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { readRegistry } from '../scripts/action-registry.ts'
import { emitActionTable, emitCapabilities, emitTypeScript } from '../scripts/action-registry-emit.ts'
import { emitRust } from '../scripts/action-registry-rust.ts'
import { CHECK_FLAG, main, ROOT_FLAG, rootOf, SOURCES, unknownArguments } from '../scripts/gen-action-registry.ts'
import { ROOT } from '../scripts/source-tree.ts'

/** The program this module is when it is run rather than imported. */
const PROGRAM = new URL('../scripts/gen-action-registry.ts', import.meta.url).pathname

/**
 * Run the check as the program, and read what it told the reader.
 * @param root - the tree to run it in, which is never the repository.
 * @returns everything it wrote to the error stream.
 */
async function runCheck(root: string): Promise<string> {
  const run = Bun.spawn([process.execPath, PROGRAM, '--check', ROOT_FLAG, root], { stdout: 'pipe', stderr: 'pipe' })
  const complaint = await new Response(run.stderr).text()
  expect(await run.exited).toBe(1)
  return complaint
}

/** Trees this suite made, removed when it ends. */
const made: string[] = []

afterEach(async () => {
  await Promise.all(made.splice(0).map(async (root) => await rm(root, { recursive: true, force: true })))
})

/**
 * A tree carrying one registry and the lane files its actions name.
 * @param registry - the registry source to write.
 * @param lanes - repository-relative lane paths to create.
 * @returns the tree's root, ending in a separator as the generator expects.
 */
async function treeWith(registry: string, lanes: readonly string[]): Promise<string> {
  const root = `${await mkdtemp(join(tmpdir(), 'gen-registry-'))}/`
  made.push(root.slice(0, -1))
  await mkdir(dirname(`${root}${SOURCES.registry}`), { recursive: true })
  await writeFile(`${root}${SOURCES.registry}`, registry)
  await Promise.all(lanes.map(async (lane) => await mkdir(dirname(`${root}${lane}`), { recursive: true })))
  await Promise.all(lanes.map(async (lane) => await writeFile(`${root}${lane}`, 'the suite that drives it\n')))
  return root
}

/** The registry this repository ships, which is the one the faces are held to. */
const SHIPPED = await readFile(`${ROOT}${SOURCES.registry}`, 'utf8')

/** Every lane the shipped registry names, so a tree can carry them all. */
const SHIPPED_LANES = readRegistry(SHIPPED).actions.map((action) => action.lane)

describe('the generator writing the faces', () => {
  it('writes every face the registry declares, byte for byte', async () => {
    const root = await treeWith(SHIPPED, SHIPPED_LANES)
    expect(await main([ROOT_FLAG, root])).toBe(0)
    const registry = readRegistry(SHIPPED)
    const written = await Promise.all(
      (
        [
          [SOURCES.typescript, emitTypeScript(registry)],
          [SOURCES.capabilities, emitCapabilities(registry)],
          [SOURCES.actionTable, emitActionTable(registry)],
          [SOURCES.rust, emitRust(registry)],
        ] as const
      ).map(async ([path, expected]) => ((await readFile(`${root}${path}`, 'utf8')) === expected ? '' : path)),
    )
    expect(written.filter((path) => path !== '')).toEqual([])
  })

  it('makes the directories a face is written into, rather than failing on them', async () => {
    // A fresh checkout has the registry and none of the faces; the generator is
    // what creates the tree they sit in.
    const root = await treeWith(SHIPPED, SHIPPED_LANES)
    expect(await main([ROOT_FLAG, root])).toBe(0)
    expect((await readFile(`${root}${SOURCES.rust}`, 'utf8')).length).toBeGreaterThan(0)
  })
})

describe('the generator checking the faces', () => {
  it('reports every face that has drifted, and touches none of them', async () => {
    const root = await treeWith(SHIPPED, SHIPPED_LANES)
    await main([ROOT_FLAG, root])
    await writeFile(`${root}${SOURCES.typescript}`, 'drifted\n')
    expect(await main(['--check', ROOT_FLAG, root])).toBe(1)
    // Reporting is not repairing: a check that rewrote what it found would make
    // the gate that runs it unable to ever report anything.
    expect(await readFile(`${root}${SOURCES.typescript}`, 'utf8')).toBe('drifted\n')
  })

  it('reports a face that is not there at all', async () => {
    // A fresh tree has none of them, and a check that read an absent file as
    // agreement would pass over a repository missing every generated face.
    const root = await treeWith(SHIPPED, SHIPPED_LANES)
    expect(await main(['--check', ROOT_FLAG, root])).toBe(1)
  })

  it('says which fault each face has, because they are different faults', async () => {
    // One tree, one face edited and one removed, so the two states are read
    // side by side rather than one at a time.
    const root = await treeWith(SHIPPED, SHIPPED_LANES)
    await main([ROOT_FLAG, root])
    await writeFile(`${root}${SOURCES.typescript}`, 'drifted\n')
    await rm(`${root}${SOURCES.rust}`)
    const complaint = await runCheck(root)
    expect(complaint).toContain(`${SOURCES.typescript} (drifted)`)
    expect(complaint).toContain(`${SOURCES.rust} (missing)`)
    // Named apart, not run together: a reader has to be able to tell which
    // face is which fault.
    expect(complaint).toContain(', ')
  })

  it('agrees with a tree the generator has just written', async () => {
    const root = await treeWith(SHIPPED, SHIPPED_LANES)
    expect(await main([ROOT_FLAG, root])).toBe(0)
    expect(await main(['--check', ROOT_FLAG, root])).toBe(0)
  })
})

describe('the generator as the program the gate runs', () => {
  it('reports the stale faces on the error stream, and exits non-zero', async () => {
    // The gate runs the program, not the function: what a reader is told, and
    // what the shell is told, are both decided under the guard at the bottom
    // of the module, which no importing suite reaches.
    const root = await treeWith(SHIPPED, SHIPPED_LANES)
    const run = Bun.spawn([process.execPath, PROGRAM, '--check', ROOT_FLAG, root], {
      cwd: root,
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const complaint = await new Response(run.stderr).text()
    expect(await run.exited).toBe(1)
    expect(complaint).toContain('action registry is stale:')
    expect(complaint).toContain(`${SOURCES.typescript} (missing)`)
  })

  it('writes the faces and exits zero when it is run with no arguments', async () => {
    // With no `--check` the program writes. Reading the arguments wrongly — one
    // element out — turns a write into a check and a check into a write.
    const root = await treeWith(SHIPPED, SHIPPED_LANES)
    const run = Bun.spawn([process.execPath, PROGRAM, ROOT_FLAG, root], { cwd: root, stdout: 'pipe', stderr: 'pipe' })
    expect([await run.exited, await new Response(run.stderr).text()]).toEqual([0, ''])
    expect((await readFile(`${root}${SOURCES.typescript}`, 'utf8')).length).toBeGreaterThan(0)
  })

  it('runs nothing when it is imported rather than run', async () => {
    // The guard is the difference between a module and a program. Dropped, an
    // importing suite generates faces as a side effect of the import — into
    // this repository, because an import carries no tree to work in — and says
    // so on the output stream, which is what makes it visible here.
    const root = `${await mkdtemp(join(tmpdir(), 'gen-registry-'))}/`
    made.push(root.slice(0, -1))
    const source = `await import(${JSON.stringify(PROGRAM)})\nprocess.stdout.write('imported')\n`
    const run = Bun.spawn([process.execPath, '-e', source], { cwd: root, stdout: 'pipe', stderr: 'pipe' })
    expect([await run.exited, await new Response(run.stdout).text()]).toEqual([0, 'imported'])
  })
})

describe('what the program tells a reader', () => {
  it('names every face it wrote, so a run is readable rather than silent', async () => {
    const root = await treeWith(SHIPPED, SHIPPED_LANES)
    const run = Bun.spawn([process.execPath, PROGRAM, ROOT_FLAG, root], { stdout: 'pipe', stderr: 'pipe' })
    const printed = await new Response(run.stdout).text()
    expect(await run.exited).toBe(0)
    expect(printed.split('\n').filter((line) => line !== '')).toEqual([
      SOURCES.typescript,
      SOURCES.capabilities,
      SOURCES.actionTable,
      SOURCES.rust,
    ])
  })

  it('refuses an argument it does not understand, rather than doing something else', async () => {
    // `--chekc` is the command that writes where a reader meant to compare, and
    // the gate that runs this would then rewrite the drift it exists to report.
    const root = await treeWith(SHIPPED, SHIPPED_LANES)
    const run = Bun.spawn([process.execPath, PROGRAM, '--chekc', ROOT_FLAG, root], { stdout: 'pipe', stderr: 'pipe' })
    const complaint = await new Response(run.stderr).text()
    expect(await run.exited).toBe(2)
    expect(complaint).toContain('--chekc')
    // Nothing was written: a refused command does not half-run.
    await expect(readFile(`${root}${SOURCES.typescript}`, 'utf8')).rejects.toThrow()
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
    const root = await treeWith(SHIPPED, SHIPPED_LANES)
    const run = Bun.spawn([process.execPath, PROGRAM, '--chekc', 'stray', ROOT_FLAG, root], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const complaint = await new Response(run.stderr).text()
    expect(await run.exited).toBe(2)
    expect(complaint.trimEnd().endsWith('unknown argument(s): --chekc, stray')).toBe(true)
  })
})

describe('the tree the generator is pointed at', () => {
  it('is this repository when no tree is named', () => {
    // The gate runs it with no tree, and that has to mean this one.
    expect(rootOf([])).toBe(ROOT)
    expect(rootOf(['--check'])).toBe(ROOT)
  })

  it('is the tree named after the flag, with or without its separator', () => {
    // The paths are joined onto the root by concatenation, so a root missing
    // its separator would write `…/tmp/treeapps/deeptail/…`.
    expect(rootOf([ROOT_FLAG, '/tmp/tree/'])).toBe('/tmp/tree/')
    expect(rootOf([ROOT_FLAG, '/tmp/tree'])).toBe('/tmp/tree/')
    expect(rootOf(['--check', ROOT_FLAG, '/tmp/tree'])).toBe('/tmp/tree/')
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
    const root = await treeWith(SHIPPED, [])
    await expect(main([ROOT_FLAG, root])).rejects.toThrow('which is not a file')
    // Nothing was written: the refusal comes before the faces are emitted, so a
    // tree is never left half generated from a registry that was refused.
    await expect(readFile(`${root}${SOURCES.typescript}`, 'utf8')).rejects.toThrow()
  })

  it('names the action and the lane it named, so the row can be found', async () => {
    const root = await treeWith(SHIPPED, [])
    const first = readRegistry(SHIPPED).actions[0]
    await expect(main(['--check', ROOT_FLAG, root])).rejects.toThrow(`action "${first?.id ?? ''}"`)
  })

  it('refuses a registry that does not read at all, rather than writing from it', async () => {
    const root = await treeWith('{ "version": 1 }', [])
    await expect(main([ROOT_FLAG, root])).rejects.toThrow()
  })
})
