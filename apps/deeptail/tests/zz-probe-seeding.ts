/**
 * The seeding probe's earlier draft, kept as a runnable stand-in.
 *
 * The case that replaced this file is `zz-probe-roster.browser.spec.ts`, which
 * opens the page and reads the console; a unit spec cannot, because the shell it
 * would read only exists in an engine. This file held the same two cases while
 * they were being written against a real page, and its name is what keeps the
 * browser run from selecting it — the file has to leave the tree, and this is
 * one of the three leftovers standing in the way of that (the other two are the
 * `apps/deeptail/tests/ipc-runtime.spec.ts` pair).
 *
 * It is not a suite and it is not imported by one. What it exists for is the
 * measurement below, which needs no page: the two behaviours the browser cases
 * hold were first read off the emitted source, and reading them again here costs
 * nothing and says whether the seeding is complete without a browser.
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
 * The names on both sides are read rather than listed: the seeded set comes from
 * `CARRIER_SOURCES` itself, and the candidate set from the module's own exports,
 * so a helper added tomorrow is checked without this reader being touched.
 * @returns the unseeded calls, sorted; empty when the seeding is complete.
 */
export function unseededCarrierCalls(): string[] {
  const seeded = new Set(CARRIER_SOURCES.map((entry) => entry.name))
  const called = new Set(
    CARRIER_SOURCES.flatMap((entry) => [...String(entry).matchAll(/[^\w.](\w+)\(/gu)].map((match) => match[1] ?? '')),
  )
  const exported = Object.values(carrier)
    .filter((value) => typeof value === 'function')
    .map((value) => value.name)
  return exported.filter((name) => called.has(name) && !seeded.has(name)).toSorted()
}

describe('the carrier sources the page evaluates', () => {
  it('carries every exported function another seeded function calls', () => {
    // The seam this reads: a helper written into the carrier module, called by a
    // seeded function, and left out of the emitted set is a `ReferenceError`
    // inside the page — which is what emptied the roster while every unit case
    // stayed green. Reading it here needs no page, and the same reader is driven
    // against a real one in `zz-probe-seeding.browser.spec.ts`.
    expect(CARRIER_SOURCES.length).toBeGreaterThan(0)
    expect(unseededCarrierCalls()).toEqual([])
  })
})
