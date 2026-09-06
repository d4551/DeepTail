/**
 * Every name the injected sources reach for, resolved in the page that runs
 * them.
 *
 * Two suites hand their work to the browser as source text: the structural
 * checks and the scripted Tauri IPC are both stringified and evaluated there.
 * The compiler cannot see that boundary — a helper moved to another module
 * still imports cleanly, still type-checks, and still arrives in the page
 * naming something that does not exist. It has cost this repository twice:
 * `isLayoutPane` left behind would have thrown inside the check runner and
 * silenced every structural check on the page, and the capability issuance
 * left behind did throw, hydrating the ledger to empty while the case watching
 * for the command being *asked* stayed green.
 *
 * The authority for what a page supplies is the page, not a list written here:
 * each free name is looked up on the running document's own `globalThis`, so
 * nothing can be admitted by adding it to a fixture.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import type { Page } from 'playwright'
import { freeNames } from '../../../scripts/free-names.ts'
import { type Harness, startHarness } from './harness.ts'
import { structureCheckSource } from './structure.ts'
import { initScriptSource } from './tauri-ipc.ts'

let harness: Harness
let page: Page

beforeAll(async () => {
  harness = await startHarness()
  // Opened, not driven to a surface: the page is here only as the authority on
  // what a browser realm supplies, and waiting for the product to mount would
  // make this gate report a crash instead of the name that caused it — exactly
  // the unreadable failure it exists to replace.
  page = await harness.open({})
})

afterAll(async () => {
  await harness?.stop()
})

/**
 * The names one injected source reads that the page does not supply.
 * @param label - what to call the source in a failure.
 * @param source - the text the page is handed.
 * @returns one entry per unresolvable name.
 */
async function unresolved(label: string, source: string): Promise<string[]> {
  const names = freeNames('injected.js', source)
  expect([label, names.length > 0]).toEqual([label, true])
  const missing = await page.evaluate(
    (candidates) => candidates.filter((name) => !(name in (globalThis as unknown as Record<string, unknown>))),
    names,
  )
  return missing.map((name) => `${label}: ${name}`)
}

it('hands the page no scripted IPC naming anything the page has not got', async () => {
  // The table a real case passes: hosts, so the registry answer is not empty,
  // and the fields the pairing surfaces read.
  const source = initScriptSource({
    hosts: [{ id: 'alpha', label: 'Alpha', origin: 'https://alpha.example' }],
    paired: { id: 'beta', label: 'Beta', origin: 'https://beta.example' },
    muxHosts: ['alpha'],
    remote: { 'session/list': { sessions: [] } },
  })
  expect(await unresolved('scripted IPC', source)).toEqual([])
})

it('hands the page no structural check naming anything the page has not got', async () => {
  // Both pointer densities: the coarse branch selects a different limit, and a
  // check reachable from only one of them would otherwise go unread.
  const vocabulary = ['modal-dialog', 'modal-body']
  const missing = await Promise.all(
    [true, false].map((coarse) =>
      unresolved(`structural checks (coarse: ${String(coarse)})`, structureCheckSource(coarse, vocabulary)),
    ),
  )
  expect(missing.flat()).toEqual([])
})
