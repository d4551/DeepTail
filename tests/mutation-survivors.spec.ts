/**
 * The reader that turns a mutation report into the work it names.
 *
 * A report is a list of tests that do not exist yet, and this is what makes
 * that list readable. It had no suite at all: every line of it lived under the
 * program's own guard, so the module scored zero on the very run it serves —
 * the reader of the mutation report, unread by the mutation report.
 *
 * @module
 */

import { afterEach, describe, expect, it } from 'bun:test'
import { TREE_SCAN_BUDGET_MS } from './tree-budget.ts'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import {
  DEFAULT_REPORT,
  DEFAULT_STATUS,
  type Mutant,
  openMutants,
  type Report,
  renderMutants,
} from '../scripts/mutation-survivors.ts'

/**
 * One mutant as a report records it.
 * @param line - the line it sits on.
 * @param status - what the run decided about it.
 * @param extra - the mutator name and replacement, when the case cares.
 * @returns the mutant.
 */
function mutant(line: number, status: string, extra: Partial<Mutant> = {}): Mutant {
  return {
    mutatorName: 'ConditionalExpression',
    replacement: 'if (true)',
    status,
    location: { start: { line, column: 3 } },
    ...extra,
  }
}

/**
 * A report over the files named.
 * @param files - mutants by file.
 * @returns the report.
 */
function report(files: Readonly<Record<string, readonly Mutant[]>>): Report {
  return { files: Object.fromEntries(Object.entries(files).map(([file, mutants]) => [file, { mutants }])) }
}

/** The program this module is when it is run rather than imported. */
const PROGRAM = new URL('../scripts/mutation-survivors.ts', import.meta.url).pathname

/** Directories this suite made, removed when it ends. */
const made: string[] = []

afterEach(async () => {
  await Promise.all(made.splice(0).map(async (root) => await rm(root, { recursive: true, force: true })))
})

/**
 * Write a report into a directory of this suite's own.
 * @param at - where to write it, relative to that directory.
 * @param files - mutants by file.
 * @returns the directory the program is run in.
 */
async function reportOnDisk(at: string, files: Readonly<Record<string, readonly Mutant[]>>): Promise<{ root: string }> {
  const root = await mkdtemp(join(tmpdir(), 'mutation-survivors-'))
  made.push(root)
  await mkdir(dirname(join(root, at)), { recursive: true })
  await writeFile(join(root, at), JSON.stringify(report(files)))
  return { root }
}

/**
 * Run the program and read what it printed.
 * @param root - the directory to run it in, which is never the repository.
 * @param args - the arguments a reader would type after the program's name.
 * @returns everything it wrote to the output stream.
 */
async function runProgram(root: string, args: readonly string[]): Promise<string> {
  const run = Bun.spawn([process.execPath, PROGRAM, ...args], { cwd: root, stdout: 'pipe', stderr: 'pipe' })
  const printed = await new Response(run.stdout).text()
  const complaint = await new Response(run.stderr).text()
  // Read together, so a program that died having printed nothing cannot pass
  // as one that found no work.
  expect([await run.exited, complaint]).toEqual([0, ''])
  return printed
}

describe('the open mutants a report carries', () => {
  it('keeps only the status it was asked for', () => {
    const read = openMutants(
      report({ 'a.ts': [mutant(2, 'Survived'), mutant(3, 'Killed'), mutant(4, 'Survived')] }),
      'Survived',
    )
    expect(read.map((entry) => entry.mutants.map((one) => one.location.start.line))).toEqual([[2, 4]])
  })

  it('reads a status other than the default, because a run has several', () => {
    const both = report({ 'a.ts': [mutant(2, 'Survived'), mutant(3, 'NoCoverage')] })
    expect(openMutants(both, 'NoCoverage').map((entry) => entry.mutants.length)).toEqual([1])
    expect(openMutants(both, 'Timeout')).toEqual([])
  })

  it('orders the mutants of a file by the line they sit on', () => {
    // The report lists them in whatever order the run finished them in, which
    // is not the order a reader walks the file in.
    const read = openMutants(report({ 'a.ts': [mutant(9, 'Survived'), mutant(2, 'Survived')] }), 'Survived')
    expect(read[0]?.mutants.map((one) => one.location.start.line)).toEqual([2, 9])
  })

  it('leaves out a file with nothing open in it, rather than listing it empty', () => {
    // A report is read to find work. A file with no work in it is a heading
    // with nothing under it, and a list of those hides the ones that matter.
    const read = openMutants(
      report({ 'clean.ts': [mutant(2, 'Killed')], 'open.ts': [mutant(2, 'Survived')] }),
      'Survived',
    )
    expect(read.map((entry) => entry.file)).toEqual(['open.ts'])
  })

  it('reads an empty report as no work rather than failing on it', () => {
    expect(openMutants(report({}), 'Survived')).toEqual([])
    expect(openMutants(report({ 'a.ts': [] }), 'Survived')).toEqual([])
  })
})

describe('the report it prints', () => {
  it('names each file, how many are open in it, and where each one is', () => {
    const text = renderMutants(
      openMutants(report({ 'a.ts': [mutant(2, 'Survived'), mutant(11, 'Survived')] }), 'Survived'),
      'Survived',
    )
    expect(text).toBe(
      [
        '',
        'a.ts (2)',
        '  2:3       ConditionalExpression  -> if (true)',
        '  11:3      ConditionalExpression  -> if (true)',
        '',
        '2 survived',
        '',
      ].join('\n'),
    )
  })

  it('counts across every file rather than the last one, and keeps them apart', () => {
    // The whole text, not a search inside it: a report whose sections ran
    // together would still contain every heading a `toContain` looked for, and
    // would be unreadable.
    const text = renderMutants(
      openMutants(
        report({ 'a.ts': [mutant(2, 'Survived')], 'b.ts': [mutant(2, 'Survived'), mutant(3, 'Survived')] }),
        'Survived',
      ),
      'Survived',
    )
    expect(text).toBe(
      [
        '',
        'a.ts (1)',
        '  2:3       ConditionalExpression  -> if (true)',
        '',
        'b.ts (2)',
        '  2:3       ConditionalExpression  -> if (true)',
        '  3:3       ConditionalExpression  -> if (true)',
        '',
        '3 survived',
        '',
      ].join('\n'),
    )
  })
})

describe('the report it prints, file by file', () => {
  it('puts a replacement on one line, and cuts one too long to read', () => {
    // A replacement carries the mutated source, newlines and all. Printed as
    // written it breaks the column this report is read down.
    const long = 'x'.repeat(200)
    const text = renderMutants(
      openMutants(
        report({
          'a.ts': [mutant(2, 'Survived', { replacement: `one\ntwo` }), mutant(3, 'Survived', { replacement: long })],
        }),
        'Survived',
      ),
      'Survived',
    )
    expect(text).toContain('-> one two')
    expect(text).toContain(`-> ${'x'.repeat(90)}\n`)
    expect(text).not.toContain('x'.repeat(91))
  })
})

describe('the report it prints, line by line', () => {
  it('renders a mutant that records no replacement at all', () => {
    // A report does not always carry one, and a reader who is shown `undefined`
    // learns less than one shown nothing.
    const bare: Mutant = {
      mutatorName: 'ConditionalExpression',
      status: 'Survived',
      location: { start: { line: 2, column: 3 } },
    }
    const text = renderMutants(openMutants(report({ 'a.ts': [bare] }), 'Survived'), 'Survived')
    expect(text).toContain('ConditionalExpression  -> \n')
    expect(text).not.toContain('undefined')
  })

  it('says nothing is open, rather than printing an empty page', () => {
    expect(renderMutants([], 'Survived')).toBe('\n\n0 survived\n')
  })

  it('names the status in the words the run uses for it', () => {
    expect(renderMutants([], 'NoCoverage')).toContain('0 nocoverage')
  })
})

describe('the defaults the program runs with', () => {
  it('reads the report a run writes, and the status a run leaves on open work', () => {
    // Both are what the program falls back to with no arguments, so a change
    // to either is a change to what `bun run mutate` hands a reader.
    expect(DEFAULT_REPORT).toBe('reports/mutation/mutation.json')
    expect(DEFAULT_STATUS).toBe('Survived')
  })
})

describe('the program a reader actually runs', () => {
  // Imported, the module is a pair of readers and nothing runs. Run, it is a
  // program — and the whole of what makes it one lives under a guard no
  // importing suite can reach, so it is driven here as a process, against a
  // report this suite wrote, in a directory of its own.
  it('prints the survivors of the report it is given', async () => {
    const { root } = await reportOnDisk('elsewhere/report.json', {
      'a.ts': [mutant(2, 'Survived'), mutant(3, 'Killed')],
    })
    const printed = await runProgram(root, ['elsewhere/report.json'])
    expect(printed).toContain('a.ts (1)')
    expect(printed.trimEnd().endsWith('1 survived')).toBe(true)
  }, TREE_SCAN_BUDGET_MS)

  it('reads the status it is given, so a run’s other outcomes can be listed', async () => {
    const { root } = await reportOnDisk('elsewhere/report.json', { 'a.ts': [mutant(2, 'NoCoverage')] })
    expect(await runProgram(root, ['elsewhere/report.json', 'NoCoverage'])).toContain('1 nocoverage')
  }, TREE_SCAN_BUDGET_MS)
})

describe('the program, run the way a reader runs it', () => {
  it('falls back to the report a run writes, and to the open status', async () => {
    // No arguments at all: this is the invocation a reader types after a run,
    // and the defaults are the whole of what makes it work.
    const { root } = await reportOnDisk(DEFAULT_REPORT, {
      'a.ts': [mutant(2, DEFAULT_STATUS), mutant(4, DEFAULT_STATUS)],
    })
    const printed = await runProgram(root, [])
    expect(printed).toContain('a.ts (2)')
    expect(printed.trimEnd().endsWith('2 survived')).toBe(true)
  })

  it('runs nothing when it is imported rather than run', async () => {
    // The guard is the whole difference between a module of readers and a
    // program. Dropped, an importing suite runs the program as a side effect
    // of the import — reading whatever report happens to sit at the default
    // path, or dying on a directory that has none. Imported here from a
    // directory that has neither, so both outcomes are visible.
    const root = await mkdtemp(join(tmpdir(), 'mutation-survivors-'))
    made.push(root)
    const source = `await import(${JSON.stringify(PROGRAM)})\nprocess.stdout.write('imported')\n`
    const run = Bun.spawn([process.execPath, '-e', source], { cwd: root, stdout: 'pipe', stderr: 'pipe' })
    const printed = await new Response(run.stdout).text()
    expect([await run.exited, printed]).toEqual([0, 'imported'])
  })

  it('fails on a report that is not there, rather than printing nothing', async () => {
    // A reader who mistypes a path must not be told there is no work left.
    const { root } = await reportOnDisk('elsewhere/report.json', {})
    const run = Bun.spawn([process.execPath, PROGRAM, 'no-such-report.json'], {
      cwd: root,
      stdout: 'pipe',
      stderr: 'pipe',
    })
    await new Response(run.stdout).text()
    expect(await run.exited).not.toBe(0)
  })
})
