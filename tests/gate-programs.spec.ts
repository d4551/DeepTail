/**
 * Every gate the chain runs, as the chain runs it: programs, not modules.
 *
 * `gate-declarations.spec.ts` drives what each gate reads and refuses, and
 * `gate-runner.spec.ts` drives the reading and the report. The last line of
 * each script — the guard that decides whether any of it runs, which stream the
 * report goes to, and what the process exits under — was reachable from neither,
 * so a gate could have been made to run nothing at all and print nothing while
 * every suite stayed green and the chain went on reporting a pass.
 *
 * What each case asserts is the same either way the tree stands: the program
 * says exactly what the gate says, on the stream that matches, under the status
 * that matches. A mutation run instruments the tree on purpose and these gates
 * refuse an instrumented tree, so a case that demanded a clean run would report
 * on the run rather than on the program.
 *
 * The list of programs is written by hand, so it is read against the manifest:
 * every script the chain runs that declares a gate is a program this suite
 * spawns, and nothing else is.
 */

import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import { GATE as BANS } from '../scripts/check-bans.ts'
import { GATE as ENTRIES } from '../scripts/check-entries.ts'
import { GATE as INLINE_STYLES } from '../scripts/check-no-inline-styles.ts'
import { GATE as SCALE } from '../scripts/check-scale.ts'
import { GATE as STYLESHEETS } from '../scripts/check-stylesheets.ts'
import { GATE as TREE } from '../scripts/check-tree.ts'
import { type Gate, readGate } from '../scripts/gate-runner.ts'
import { manifestScripts } from '../scripts/manifest.ts'
import { ROOT } from '../scripts/source-tree.ts'
import { TREE_SCAN_BUDGET_MS } from './tree-budget.ts'

/** Every gate the chain runs, by the script that runs it. */
const PROGRAMS: readonly (readonly [string, Gate])[] = [
  ['check-bans.ts', BANS],
  ['check-entries.ts', ENTRIES],
  ['check-no-inline-styles.ts', INLINE_STYLES],
  ['check-scale.ts', SCALE],
  ['check-stylesheets.ts', STYLESHEETS],
  ['check-tree.ts', TREE],
]

/** A program under `scripts/`, as a manifest command spells one. */
const PROGRAM = /scripts\/[\w.-]+\.ts/gu

/** The declaration that makes a script a gate rather than a reader of one. */
const DECLARES_A_GATE = 'export const GATE'

/** What a finished program said. */
interface Said {
  readonly code: number
  readonly out: string
  readonly err: string
}

/**
 * Run one program and read back everything it said.
 * @param args - the arguments to run, after the interpreter.
 * @returns its status and both of its streams.
 */
async function run(args: readonly string[]): Promise<Said> {
  const started = Bun.spawn([process.execPath, ...args], { cwd: ROOT, stdout: 'pipe', stderr: 'pipe' })
  const [out, err, code] = await Promise.all([
    new Response(started.stdout).text(),
    new Response(started.stderr).text(),
    started.exited,
  ])
  return { code, out, err }
}

describe('each gate run from the command line', () => {
  it(
    'says what the gate says, on the stream and under the status that match it',
    async () => {
      const checked = await Promise.all(
        PROGRAMS.map(async ([name, gate]) => {
          // Read and run at once: the two answer the same question about the
          // same tree, and one after the other is twice the walk.
          const [outcome, said] = await Promise.all([readGate(gate), run([join(ROOT, 'scripts', name)])])
          const expected: Said = outcome.ok
            ? { code: 0, out: outcome.text, err: '' }
            : { code: 1, out: '', err: outcome.text }
          return [name, said, name, expected]
        }),
      )
      for (const [name, said, expectedName, expected] of checked) {
        expect([name, said]).toEqual([expectedName, expected])
      }
    },
    TREE_SCAN_BUDGET_MS,
  )

  it(
    'says nothing at all when the script is imported rather than run',
    async () => {
      // Every gate here reads the whole repository and exits on what it finds. A
      // module that did that on import would run the gate again inside whatever
      // imported it, and set that process's exit status from a scan nobody asked
      // for.
      const imported = await Promise.all(
        PROGRAMS.map(async ([name]) => {
          const path = join(ROOT, 'scripts', name)
          const said = await run(['-e', `await import(${JSON.stringify(path)})`])
          return [name, said]
        }),
      )
      for (const [name, said] of imported) {
        expect([name, said]).toEqual([name, { code: 0, out: '', err: '' }])
      }
    },
    TREE_SCAN_BUDGET_MS,
  )
})

describe('the programs this suite spawns', () => {
  it(
    'is every gate the chain runs, and no script the chain runs that declares none',
    async () => {
      // The list above is written by hand and the manifest is not: a gate whose
      // script the chain runs is a program whose main nothing else reaches —
      // `check-scale.ts` sat outside this list while `check:scale` ran in the
      // chain, which is the hole this reads for. A script the chain runs that
      // declares no gate is not one of these: its rules live in a module another
      // gate reads, and its own suite drives what it reads.
      const commands = [
        ...new Set([...manifestScripts().values()].flatMap((command) => command.match(PROGRAM) ?? [])),
      ].toSorted()
      const declaring = (
        await Promise.all(
          commands.map(async (path) =>
            (await Bun.file(join(ROOT, path)).text()).includes(DECLARES_A_GATE) ? [path] : [],
          ),
        )
      ).flat()
      expect(declaring.toSorted()).toEqual(PROGRAMS.map(([name]) => `scripts/${name}`).toSorted())
      expect(commands).toContain('scripts/cargo-freshness.ts')
      expect(declaring).not.toContain('scripts/cargo-freshness.ts')
    },
    TREE_SCAN_BUDGET_MS,
  )
})
