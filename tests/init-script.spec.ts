/**
 * Source the browser suite assembles by hand has to arrive whole.
 *
 * Two places stringify a list of functions and hand the text to a page:
 * `initScriptSource` installs the scripted IPC, and `structureCheckSource`
 * installs the structural checks. In both, a function the text calls that is
 * not in the list arrives as a `ReferenceError` — thrown inside the page, with
 * no module resolution anywhere to report it. Nothing said so: each list was a
 * hand-kept array, every name in it resolved by the module system at
 * type-check time, and the only thing that ever ran the assembled text was the
 * browser suite, which cannot run everywhere the unit suites can.
 *
 * The pins in `gate-coverage.spec.ts` read the other direction — which names
 * the assembled text defines — so a helper that is called but never emitted is
 * exactly what they cannot see: the name simply does not appear.
 *
 * So the assembled text is read here the way the page would: every name it
 * reaches for, against what the page actually supplies. A helper split out of
 * one of those functions and not added to its list fails in `bun test`, at the
 * moment it is written, instead of in a browser case later.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { structureCheckSource } from '../apps/deeptail/tests/structure.ts'
import { initScriptSource } from '../apps/deeptail/tests/tauri-ipc.ts'
import { freeNames } from '../scripts/free-names.ts'

/**
 * What a page supplies to a script it evaluates.
 *
 * Written out rather than read off this runtime's own globals: the script runs
 * in Chromium and this suite runs in Bun, and the two do not hold the same
 * names. A name this list does not carry is either a browser global nobody has
 * needed yet — added here deliberately, once — or the bug this suite exists to
 * report.
 */
const PROVIDED: ReadonlySet<string> = new Set([
  'Array',
  'Boolean',
  'CSS',
  'CustomEvent',
  'Date',
  'Error',
  'Event',
  'EventTarget',
  'HTMLElement',
  'JSON',
  'Map',
  'Math',
  'Node',
  'Number',
  'Object',
  'Promise',
  'RegExp',
  'Set',
  'String',
  'Symbol',
  'URL',
  'WebSocket',
  'clearTimeout',
  'crypto',
  'document',
  'fetch',
  'getComputedStyle',
  'globalThis',
  'location',
  'navigator',
  'queueMicrotask',
  'setTimeout',
  'structuredClone',
  'window',
])

/**
 * Every name one assembled script reads without bringing it.
 * @param label - what to attribute a parse failure to.
 * @param source - the assembled text.
 * @returns the names, sorted, with the page's own globals removed.
 */
function unresolvedNames(label: string, source: string): string[] {
  return freeNames(label, source).filter((name) => !PROVIDED.has(name))
}

// An empty answer table is the widest read of the IPC: every branch is present
// in the source whatever the table says, because the table is data the emitted
// functions close over rather than source that is emitted conditionally. The
// structure checks take the coarse-pointer limits and one class name, which
// likewise decide what the checks compare against and not what is emitted.
const ASSEMBLED: readonly (readonly [string, string])[] = [
  ['tauri-ipc.ts', initScriptSource({})],
  ['structure.ts', structureCheckSource(true, ['shell'])],
]

describe('the source the browser suite assembles by hand', () => {
  it('reaches for nothing the page does not supply', () => {
    expect(ASSEMBLED.flatMap(([label, source]) => unresolvedNames(label, source))).toEqual([])
  })

  it('reports a helper that was split out and never added to the emitted list', () => {
    // The failure this suite exists to catch, staged on the real assembled
    // text: a function that calls a helper the list does not carry. Without
    // this case the check above passes whether or not the reader can see the
    // mistake, because today's source happens to be whole.
    const split = ASSEMBLED.map(([label, source]) => [
      label,
      `${source}\nfunction deeptailProbe() { return deeptailUnemittedHelper() }`,
    ])
    for (const [label = '', source = ''] of split) {
      expect(unresolvedNames(label, source)).toContain('deeptailUnemittedHelper')
    }
  })

  it('is assembled from source the parser accepts', () => {
    // `freeNames` reports a parse failure as its single answer rather than
    // throwing, so a syntactically broken assembly would otherwise read as a
    // script that reaches for one oddly named global.
    for (const [label, source] of ASSEMBLED) {
      expect(freeNames(label, source).join('\n')).not.toContain('does not parse')
    }
  })
})
