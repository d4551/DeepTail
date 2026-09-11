/**
 * What a module may do when it is merely imported.
 *
 * Importing a module must run nothing. The rule reads a module's top-level
 * statements: a declaration declares, and everything else runs — including,
 * exactly, the line that cost a whole mutation scope its number.
 */

import { describe, expect, it } from 'bun:test'
import { scanEntry } from '../scripts/entry-gate.ts'
import { source } from './fixtures.ts'

/** The reasons a module is rejected for. */
function entries(...lines: readonly string[]): string[] {
  return scanEntry('fixture.ts', source(...lines)).map((offence) => offence.why)
}

/** The one reason this gate reports. */
const RUNS = 'this runs when the module is imported; put the work behind `if (import.meta.main)`'

describe('the entry gate rejects work done at import', () => {
  it('a bare call, which is what an unguarded script is', () => {
    expect(entries('doWork()')).toEqual([RUNS])
    expect(entries('await doWork()')).toEqual([RUNS])
  })

  it('the shape that cost a mutation scope its score', () => {
    // `mutate-restore.ts` restored the tree at import. Its suite was named in a
    // mutation command, so every mutant run undid the instrumentation and the
    // scope reported nought per cent with nothing amiss in the log.
    expect(entries('const restored = await restore()', 'if (restored.length > 0) report(restored)')).toEqual([RUNS])
  })

  it('every other statement that does something rather than declaring it', () => {
    expect(entries('process.exitCode = 1')).toEqual([RUNS])
    expect(entries('for (const x of list) doWork(x)')).toEqual([RUNS])
    expect(entries('while (ready) doWork()')).toEqual([RUNS])
    expect(entries('try { doWork() } catch { report() }')).toEqual([RUNS])
    expect(entries('switch (mode) { default: doWork() }')).toEqual([RUNS])
    expect(entries('throw new Error("x")')).toEqual([RUNS])
  })

  it('one statement per offence, so a module is not judged by its first line alone', () => {
    expect(entries('doWork()', 'report()')).toEqual([RUNS, RUNS])
  })

  it('and names the line it runs on', () => {
    expect(scanEntry('fixture.ts', source('const a = 1', '', 'doWork()')).map((one) => one.line)).toEqual([3])
  })
})

describe('the entry gate allows a module that only declares', () => {
  it('every declaration form a module is written out of', () => {
    expect(
      entries(
        "import { a } from './a.ts'",
        "import type { B } from './b.ts'",
        "export { a } from './a.ts'",
        "export * from './c.ts'",
        'export type C = B',
        'export interface D { a: number }',
        'const value = 1',
        'let held = 2',
        'function run(): number { return value + held }',
        'class Holder {}',
        'export default run',
        ';',
      ),
    ).toEqual([])
  })

  it('a declaration written without an export, and a semicolon nothing precedes', () => {
    // An export is a declaration of its own, so a fixture that only ever
    // exports never reaches the forms underneath it. And a semicolon written
    // after a statement is absorbed into that statement, so the only empty
    // statement a file really holds is one with nothing before it.
    expect(entries('type X = string', 'interface Y { a: number }')).toEqual([])
    expect(entries(';', 'const a = 1')).toEqual([])
  })

  it('every declaration form the type system adds, which erase to nothing at all', () => {
    // None of these appear in this repository's own sources, so the gate has
    // never met one. A gate that did not know a form would report a file that
    // declares in it as doing work at import, and no such file could be added.
    expect(
      entries(
        'declare function ambient(value: number): void',
        'declare module "ambient" { export const held: number }',
        'declare namespace Held { const value: number }',
        'enum Mode { first, second }',
        'import legacyRequire = require("node:path")',
      ),
    ).toEqual([])
  })
})

describe('the guard a runnable script does its work behind', () => {
  it('is the entry check, written as an if', () => {
    expect(entries('if (import.meta.main) {', '  doWork()', '}')).toEqual([])
    expect(entries('if (import.meta.main) process.exitCode = await main()')).toEqual([])
  })

  it('is not any other condition around work that still runs on import', () => {
    // Only the entry check is the guard; anything else is a condition around
    // work that still runs on import.
    expect(entries('if (ready) doWork()')).toEqual([RUNS])
    // The guard is an `if`. Every other statement that carries a condition
    // carries it around work that runs on import, however the condition reads.
    expect(entries('while (import.meta.main) doWork()')).toEqual([RUNS])
    expect(entries('import.meta.main && doWork()')).toEqual([RUNS])
    expect(entries('if (import.meta.url) doWork()')).toEqual([RUNS])
    expect(entries('if (globalThis.main) doWork()')).toEqual([RUNS])
  })

  it('does not stop the gate saying so when the module does not parse at all', () => {
    expect(scanEntry('fixture.ts', 'function (').map((one) => one.why)[0]).toContain('does not parse')
  })
})
