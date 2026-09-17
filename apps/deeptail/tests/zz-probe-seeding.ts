/**
 * The seeding the page's emitted sources depend on.
 *
 * The scripted IPC is emitted as source and evaluated in the page, so a function
 * that calls another by name arrives naming something the page has to have.
 * Nothing enforced that, and the failure was silent from every other direction:
 * `hostOf` was written into `tauri-ipc-carrier.ts` and left out of
 * `CARRIER_SOURCES`, so `carrier_fetch` threw `ReferenceError: hostOf is not
 * defined` inside the page, every Remote call answered nothing, the roster came
 * up empty — and the unit suites and the type checker both stayed green, because
 * neither of them ever evaluates the emitted source.
 *
 * The reader below is that check without a page. The case here drives the reader
 * against something it must refuse, which is what says the reader works rather
 * than merely agreeing; `zz-probe-seeding.browser.spec.ts` drives the same
 * contract through a real page and the runtime the product actually calls.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import * as carrier from './tauri-ipc-carrier.ts'
import { CARRIER_SOURCES } from './tauri-ipc-carrier.ts'

/**
 * The carrier functions a seeded function calls that the emitted sources do not
 * carry.
 *
 * The names on both sides are read rather than listed: the seeded set and the
 * calls come from the functions' own emitted text, and the candidate set from
 * the module's own exports, so a helper added tomorrow is checked without this
 * reader being touched. Nothing is asked of an entry but that it can be printed,
 * which is what lets a case hand it a function written for the purpose.
 * @param sources - the emitted functions to read; the module's own by default.
 * @returns the unseeded calls, sorted; empty when the seeding is complete.
 */
export function unseededCarrierCalls(sources: readonly { toString(): string }[] = CARRIER_SOURCES): string[] {
  const declared = sources.map((entry) => String(entry).match(/^function (\w+)\(/u)?.[1] ?? '')
  const seeded = new Set(declared.filter((name) => name !== ''))
  const called = new Set(
    sources.flatMap((entry) => [...String(entry).matchAll(/[^\w.](\w+)\(/gu)].map((match) => match[1] ?? '')),
  )
  const exported = Object.values(carrier)
    .filter((value) => typeof value === 'function')
    .map((value) => value.name)
  return exported.filter((name) => called.has(name) && !seeded.has(name)).toSorted()
}

/**
 * The name of the exported function the detection case hands its reader.
 *
 * Spelt in parts so this file carries no call to the function the reader is
 * asked to report: a literal here would be the very call the case is checking
 * for, and the fixture would then match on its own source.
 * @returns the function's name.
 */
function unseededCandidate(): string {
  return ['deeptail', 'CarrierFetch'].join('')
}

/**
 * A stand-in for one emitted function, so a case can hand the reader whatever
 * body it needs to be judged by.
 * @param body - the statements the emitted function carries.
 * @returns the text the reader reads as a function.
 */
function emittedFunction(body: string): string {
  return `function probeTheReader() { ${body} }`
}

describe('the carrier sources the page evaluates', () => {
  it('carries every exported function another seeded function calls', () => {
    // The seam this reads: a helper written into the carrier module, called by a
    // seeded function, and left out of the emitted set is a `ReferenceError`
    // inside the page — which is what emptied the roster while every unit case
    // stayed green. `hostOf` is seeded now, and this is the reading that would
    // have named it.
    expect(CARRIER_SOURCES.length).toBeGreaterThan(0)
    // A list rather than a length, so a reader that found the wrong name says
    // which one: the emptiness is what the case is about, and the name is what a
    // reader reads when it is not.
    expect(unseededCarrierCalls()).toEqual([])
  })

  it('names an exported function a seeded one calls when the sources do not carry it', () => {
    // The case above is green over the shipped tree, which makes it a claim until
    // the reader under it is driven against the defect it exists for: a name the
    // page cannot resolve, being a call to a module function the emitted set does
    // not carry. The fixture is that call and nothing else, so the reader's own
    // answer is the assertion rather than a list here agreeing with itself.
    expect(unseededCarrierCalls([{ toString: () => emittedFunction('') }])).toEqual([])
    expect(unseededCarrierCalls([{ toString: () => emittedFunction(`${unseededCandidate()}()`) }])).toEqual([
      'deeptailCarrierFetch',
    ])
  })
})
