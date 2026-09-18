/**
 * The server-rendered boot table, reproduced on a page that was never served.
 *
 * The harness renders an ordered table of boot rows into the HTML it serves.
 * DeepTail's shell is not served — it is a bundle inside a webview — so it
 * fetches that table over an authenticated route and replays it. Order is the
 * whole contract: a `global` row must land before the scripts that read it, and
 * a `script-src` row is a real request through the carrier because its URL is a
 * host path no browser can reach.
 *
 * Nothing drove any of it. The scripted IPC answered `boot_injections` with the
 * empty table for every case in the suite, so every row kind, the ordering, the
 * carrier request and the refusal of a row nobody wrote were all unexercised —
 * the one module that reproduces what a server rendered, never once run.
 *
 * Each case asserts from inside the page, through a log the injected scripts
 * write as they run: what a row observed at the moment it ran is the only
 * evidence of order, and it survives whatever the shell entry does to the
 * document afterwards.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import type { Page } from 'playwright'
import type { IndexInjection } from '../src/injections.ts'
import type { JsonValue } from '../src/wire.ts'
import { oneHost } from './fixtures.ts'
import { type Harness, startHarness, textOf } from './harness.ts'
import { shellMounts, waitForState } from './page-steps.ts'
import { waitForLiveShell } from './surfaces.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

/** What one injected script records about the page at the moment it ran. */
interface Observation {
  readonly at: string
  readonly probe: string | null
  readonly text: string | null
  readonly colour: string
}

declare global {
  interface Window {
    /** What each injected script saw, in the order the rows ran. */
    readonly deeptailBootLog?: readonly Observation[]
    /** The marker the harness seats for an injected script to read back. */
    readonly deeptailBootProbe?: string
  }
}

/** The path the preload row names, and the path the script-src row loads. */
const WARM = '/assets/warm.js'
const LATE = '/assets/late.js'

/**
 * Source for an injected script that records what the page looks like to it.
 * @param at - which row is running.
 * @returns the script's text.
 */
function observer(at: string): string {
  return [
    'globalThis.deeptailBootLog = globalThis.deeptailBootLog ?? []',
    'globalThis.deeptailBootLog.push({',
    `  at: ${JSON.stringify(at)},`,
    '  probe: globalThis.deeptailBootProbe ?? null,',
    "  text: document.getElementById('deeptail-boot-probe')?.textContent ?? null,",
    "  colour: document.getElementById('deeptail-boot-probe')",
    "    ? getComputedStyle(document.getElementById('deeptail-boot-probe')).color",
    "    : '',",
    '})',
  ].join('\n')
}

/** The marker global every boot table seats first, for a script to read back. */
const PROBE_ROW: IndexInjection = { kind: 'global', name: 'deeptailBootProbe', value: 'served' }

/**
 * The boot table a case serves: the marker global first, then the rows the case
 * is about.
 *
 * Every injected script reads the marker back, so seating it first is the
 * contract rather than a convention each table has to remember and restate.
 * @param rows - the rows this case seats, after the marker.
 * @returns the table the harness serves.
 */
function bootTable(...rows: readonly IndexInjection[]): readonly IndexInjection[] {
  return [PROBE_ROW, ...rows]
}

/**
 * A table carrying one row of every kind the harness serves.
 *
 * The order is the point: the global is first and both scripts read it, the
 * style and the markup land before either script measures them, and the
 * `script-src` row is last so its record must come second.
 */
const EVERY_KIND: readonly IndexInjection[] = bootTable(
  { kind: 'style', text: '#deeptail-boot-probe { color: rgb(1, 2, 3) }' },
  { kind: 'html', placement: 'body', html: '<p id="deeptail-boot-probe">from the boot table</p>' },
  { kind: 'script', placement: 'body', text: observer('script') },
  { kind: 'script-preload', src: WARM },
  { kind: 'script-src', placement: 'body', src: LATE },
)

/**
 * Open the shell and click through to a session, which is what boots a host.
 * @param table - the boot table the host serves.
 * @param sources - what the carrier answers each bundle path with.
 * @param failures - why a bundle path fails, keyed by path.
 * @returns the page, with the boot attempted.
 */
async function boot(
  table: readonly JsonValue[],
  sources: Readonly<Record<string, string>> = {},
  failures: Readonly<Record<string, string>> = {},
): Promise<Page> {
  const page = await harness.open(oneHost({ bootInjections: table, bundleSources: sources, bundleErrors: failures }))
  await waitForLiveShell(page)
  await page.locator('[data-deeptail-session="s-running"] .session-open').click()
  return page
}

/**
 * What the injected scripts recorded, once both have run.
 * @param page - the booting page.
 * @param rows - how many records to wait for.
 * @returns the records, in the order the rows ran.
 */
async function observations(page: Page, rows: number): Promise<readonly Observation[]> {
  await page.waitForFunction((count: number) => (window.deeptailBootLog?.length ?? 0) >= count, rows)
  return await page.evaluate(() => window.deeptailBootLog ?? [])
}

it('replays every row kind the harness serves, in the order it serves them', async () => {
  const page = await boot(EVERY_KIND, { [LATE]: observer('script-src') })
  // Both scripts ran, in table order, and each saw the whole of what the rows
  // before it had put on the page. A table applied concurrently, or one that
  // skipped the global, the style or the markup, cannot produce this.
  expect(await observations(page, 2)).toEqual([
    { at: 'script', probe: 'served', text: 'from the boot table', colour: 'rgb(1, 2, 3)' },
    { at: 'script-src', probe: 'served', text: 'from the boot table', colour: 'rgb(1, 2, 3)' },
  ])
  await page.close()
})

it('reaches the host for a script-src row, because no browser can fetch that path', async () => {
  const page = await boot(EVERY_KIND, { [LATE]: observer('script-src') })
  await observations(page, 2)
  // The row's URL is a host path behind the device token, so honouring it is a
  // carrier request and nothing else. A row honoured by a page-issued fetch
  // would reach no host at all.
  expect(await harness.commands(page)).toContain('carrier_load_bundle')
  // Both bundle rows reached the host, the preload row first and once each: a
  // preload that fetched nothing, or a `script-src` row that asked again for
  // what the preload row already held, would both read differently here.
  expect(await page.evaluate(() => window.deeptailBundlePaths ?? [])).toEqual([WARM, LATE])
  await page.close()
})

it('runs what the preload row fetched, rather than asking the host for it twice', async () => {
  // The preload row names the same bundle the `script-src` row runs, which is
  // the shape a served page's preload link has. One request, and the source
  // that request returned is what runs.
  const table = bootTable({ kind: 'script-preload', src: LATE }, { kind: 'script-src', placement: 'body', src: LATE })
  const page = await boot(table, { [LATE]: observer('script-src') })
  expect((await observations(page, 1)).map((seen) => seen.at)).toEqual(['script-src'])
  expect(await page.evaluate(() => window.deeptailBundlePaths ?? [])).toEqual([LATE])
  await page.close()
})

it('reports a bundle the host refuses, rather than booting a shell that is missing it', async () => {
  const page = await boot(EVERY_KIND, {}, { [LATE]: 'the host has no such bundle' })
  // The first script row still ran: the failure is at the row that failed, not
  // a table abandoned before it started.
  expect((await observations(page, 1)).map((seen) => seen.at)).toEqual(['script'])
  await waitForState(page, 'shell-error')
  expect(await textOf(page, '[data-deeptail-state="shell-error"]')).toContain('/assets/late.js')
  // The control plane is still there, so the operator is not left on a blank
  // page with a half-applied table.
  const mounts = await shellMounts(page)
  expect(mounts).toBe(1)
  await page.close()
})

it('refuses a row of a kind it does not know, rather than skipping it in silence', async () => {
  // A table is a contract with a host that may be ahead of this client. A row
  // this build cannot honour is a shell that would boot missing something, so
  // it stops the boot and says which row it was.
  const page = await boot([PROBE_ROW, { kind: 'chalk-outline', placement: 'body' }])
  await waitForState(page, 'shell-error')
  expect(await textOf(page, '[data-deeptail-state="shell-error"]')).toContain('chalk-outline')
  await page.close()
})
