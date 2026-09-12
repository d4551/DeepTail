/**
 * The three gate programs' mains, driven as the merge chain drives them.
 *
 * Each gate's unit suite drives what it reads — the guard's rules in
 * `pipeline-guard.spec.ts`, its walk over copies of this pipeline in
 * `pipeline-guard-tree.spec.ts`, the survivor reader in
 * `mutation-survivors.spec.ts`, the coverage decision in
 * `coverage-gate.spec.ts` — and each runs its program as a process besides.
 * This suite is the mains' own drive, against the trees those suites do not
 * spawn in: the pipeline guard against the repository it stands in and against
 * a minimal tree carrying one cheat, the survivor reader against a report
 * whose status is named explicitly, and the coverage gate against a captured
 * table — the branch a suite can drive without re-running the chain, and the
 * only one driven here, since the other spawns the whole unit chain. The
 * guard's sound answer is also read in this process, where the streams it
 * writes are the suite's own: reached the way
 * `outdated-guard-process.spec.ts` reaches its gate, by pointing `Bun.main`
 * at the script.
 *
 * @module
 */

import { describe, expect, it, spyOn } from 'bun:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { OVERALL } from '../scripts/check-coverage.ts'
import { FLOORS, OVERALL_FLOOR } from '../scripts/coverage-floors.ts'
import { DEFAULT_STATUS } from '../scripts/mutation-survivors.ts'
import { pipelineViolations } from '../scripts/pipeline-guard.ts'
import { ROOT } from '../scripts/source-tree.ts'
import { importRunsNothing, suiteRoot } from './gate-program.ts'
import { TREE_SCAN_BUDGET_MS } from './tree-budget.ts'

/** The three programs the merge chain runs, by absolute path. */
const GUARD = new URL('../scripts/pipeline-guard.ts', import.meta.url).pathname
const SURVIVORS = new URL('../scripts/mutation-survivors.ts', import.meta.url).pathname
const COVERAGE_GATE = new URL('../scripts/check-coverage.ts', import.meta.url).pathname

/** What one run of a program told the two streams and the shell. */
interface ProgramRun {
  readonly out: string
  readonly err: string
  readonly code: number
}

/**
 * Run one of the programs as a process, in the directory given, with the
 * arguments a reader would type after its name.
 *
 * `gate-program.ts` runs a gate with no arguments and a scrubbed environment,
 * because the gates it runs substitute an executable first on the path; the
 * three here substitute nothing and take arguments, so the spawn is spelled
 * here once, with both streams read whatever the exit turns out to be.
 * @param program - the program, by absolute path.
 * @param root - the directory the program runs in.
 * @param args - the arguments after the program's name.
 * @returns what the program printed and exited with.
 */
async function runProgram(program: string, root: string, args: readonly string[]): Promise<ProgramRun> {
  const run = Bun.spawn([process.execPath, program, ...args], { cwd: root, stdout: 'pipe', stderr: 'pipe' })
  const out = await new Response(run.stdout).text()
  const err = await new Response(run.stderr).text()
  return { out, err, code: await run.exited }
}

/** What one in-process run of the guard wrote, and whether the module answered. */
interface GuardRun {
  /** Every write the guard made to the output stream, in order. */
  readonly out: readonly string[]
  /** Every write the guard made to the error stream, in order. */
  readonly err: readonly string[]
  /** Whether the freshly evaluated module exported its reader. */
  readonly loaded: boolean
}

/**
 * Run the guard's program half in this process, the way
 * `outdated-guard-process.spec.ts` reaches its gate: `import.meta.main`
 * follows the entrypoint a module is loaded under, so the guard runs by
 * pointing `Bun.main` at the script and importing it under a query no other
 * import has used. The streams are held by spies so the answer is read exactly
 * where the guard writes it.
 * @param query - the query that keeps this evaluation out of the module cache.
 * @returns what the guard wrote, and whether the module it evaluated answered.
 */
async function runGuardInProcess(query: string): Promise<GuardRun> {
  const entryMain = Bun.main
  const out = spyOn(process.stdout, 'write').mockImplementation(() => true)
  const err = spyOn(process.stderr, 'write').mockImplementation(() => true)
  Reflect.set(Bun, 'main', GUARD)
  const mod = await import(`${GUARD}?${query}`)
  const run: GuardRun = {
    out: out.mock.calls.map((call) => String(call[0])),
    err: err.mock.calls.map((call) => String(call[0])),
    loaded: typeof mod.pipelineViolations === 'function',
  }
  err.mockRestore()
  out.mockRestore()
  Reflect.set(Bun, 'main', entryMain)
  return run
}

/**
 * A captured coverage table: one row per pinned floor, each at the floor it is
 * held to, and the summary row at the floor the whole is held to. A table at
 * its floors is the soundest table the gate can read, so the one offence a
 * case needs is the one row it moves.
 * @param below - one file to write below its floor, instead of at it.
 * @returns the table text.
 */
function coverageTable(below?: string): string {
  const rows = Object.entries(FLOORS).map(([file, floor]) => {
    const lines = below === file ? floor - 1 : floor
    return `${file} | 100.00 | ${lines.toFixed(2)} | `
  })
  rows.push(`${OVERALL} | 100.00 | ${OVERALL_FLOOR.toFixed(2)} | `)
  return `${rows.join('\n')}\n`
}

/** A report a run wrote: two files, one carrying a mutant no test noticed. */
const REPORT = JSON.stringify({
  files: {
    'src/roster.ts': {
      mutants: [
        {
          mutatorName: 'ConditionalExpression',
          replacement: 'if (true)',
          status: 'Survived',
          location: { start: { line: 12, column: 3 } },
        },
        {
          mutatorName: 'ConditionalExpression',
          replacement: 'if (false)',
          status: 'Killed',
          location: { start: { line: 13, column: 3 } },
        },
        {
          mutatorName: 'ConditionalExpression',
          replacement: 'if (true)',
          status: 'Survived',
          location: { start: { line: 14, column: 3 } },
        },
      ],
    },
    'src/wire.ts': {
      mutants: [
        {
          mutatorName: 'StringLiteral',
          replacement: '"sealed"',
          status: 'Survived',
          location: { start: { line: 40, column: 11 } },
        },
      ],
    },
  },
})

describe('the pipeline guard as the merge chain runs it', () => {
  it(
    'reads the repository it stands in and says every definition is sound',
    async () => {
      const run = await runProgram(GUARD, ROOT, [])
      expect([run.code, run.err]).toEqual([0, ''])
      expect(run.out).toBe('pipeline guard: every workflow definition is pinned, bounded and unsoftened\n')
    },
    TREE_SCAN_BUDGET_MS,
  )

  it(
    'names the cheat a tree carries, on the error stream, and fails',
    async () => {
      const root = await suiteRoot('gate-mains-guard-')
      await writeFile(join(root, 'package.json'), JSON.stringify({ packageManager: 'bun@1.4.2' }))
      await mkdir(join(root, '.github', 'workflows'), { recursive: true })
      await writeFile(join(root, '.github', 'workflows', 'ci.yml'), 'continue-on-error: true\n')
      const run = await runProgram(GUARD, root, [])
      expect(run.code).toBe(1)
      expect(run.out).toBe('')
      expect(run.err).toMatch(/^the pipeline definitions carry \d+ violation\(s\):\n/)
      expect(run.err).toContain('workflow ci.yml: carries "continue-on-error", which lets a run decide nothing')
      expect(run.err).toContain('.github/CODEOWNERS is gone; nothing names who must review the pipeline')
    },
    TREE_SCAN_BUDGET_MS,
  )
})

describe('the guard in this process, where a suite reads the streams it writes', () => {
  it('reaches its program half and says the repository is sound, on the output stream alone', async () => {
    // The guard answers an unsound tree with process.exit, which would end the
    // run that hosts it, so the tree the guard will read — the working
    // directory — is proven sound before the guard is reached here.
    expect(await pipelineViolations(process.cwd())).toEqual([])
    const run = await runGuardInProcess('gate-mains-in-process=1')
    expect(run.loaded).toBe(true)
    expect(run.out).toEqual(['pipeline guard: every workflow definition is pinned, bounded and unsoftened\n'])
    expect(run.err).toEqual([])
  })
})

describe('the survivor reader as a reader runs it', () => {
  it(
    'prints one section a file and the total, and leaves the killed work out',
    async () => {
      const root = await suiteRoot('gate-mains-survivors-')
      await writeFile(join(root, 'report.json'), REPORT)
      const run = await runProgram(SURVIVORS, root, ['report.json', DEFAULT_STATUS])
      expect([run.code, run.err]).toEqual([0, ''])
      expect(run.out).toContain('src/roster.ts (2)')
      expect(run.out).toContain('src/wire.ts (1)')
      expect(run.out).not.toContain('if (false)')
      expect(run.out.trimEnd().endsWith('3 survived')).toBe(true)
    },
    TREE_SCAN_BUDGET_MS,
  )
})

describe('the coverage gate against a table a run wrote', () => {
  it(
    'holds a table at its floors, and says so with the count it read and the whole',
    async () => {
      const root = await suiteRoot('gate-mains-coverage-')
      const table = join(root, 'table.txt')
      await writeFile(table, coverageTable())
      const run = await runProgram(COVERAGE_GATE, root, [table])
      expect([run.code, run.err]).toEqual([0, ''])
      expect(run.out).toBe(
        `check-coverage: every file the unit chain reaches is held at the detection measured: ${String(
          Object.keys(FLOORS).length,
        )} files, ${OVERALL} at ${OVERALL_FLOOR.toFixed(2)}\n`,
      )
    },
    TREE_SCAN_BUDGET_MS,
  )

  it(
    'fails, and names the file that fell below the floor pinned for it',
    async () => {
      const root = await suiteRoot('gate-mains-coverage-')
      const table = join(root, 'table.txt')
      await writeFile(table, coverageTable('scripts/jsonc.ts'))
      const run = await runProgram(COVERAGE_GATE, root, [table])
      expect(run.code).toBe(1)
      expect(run.out).toBe('')
      expect(run.err).toBe(
        'check-coverage: the unit chain does not reach what its floors state:\n' +
          '  scripts/jsonc.ts: measured 99.00, below its floor of 100.00\n',
      )
    },
    TREE_SCAN_BUDGET_MS,
  )

  it('runs nothing when it is imported rather than run', async () => {
    await importRunsNothing(COVERAGE_GATE, 'gate-mains-coverage-')
  })
})
