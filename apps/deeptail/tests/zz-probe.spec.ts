/**
 * The picker resolves each host row's spoken state only after `select_host`
 * answers through the scripted IPC carrier, which settles a few frames after
 * the list first paints. This case holds that chain to a visible result for
 * every row at once, not merely the one another case reads.
 *
 * @module
 */

import { afterAll, beforeAll, it } from 'bun:test'
import type { Page } from 'playwright'
import { HOSTS } from './fixtures.ts'
import { type Harness, startHarness } from './harness.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})
afterAll(async () => {
  await harness?.stop()
})

/** The picker reached from the shell's connection menu, as an operator does. */
async function openPickerFromShell(): Promise<Page> {
  const page = await harness.open({ hosts: HOSTS, remote: { 'session/list': { items: [] } } })
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await page.getByRole('menuitem', { name: 'Pair a host' }).click()
  await page.waitForSelector('[data-deeptail-state="ready"]')
  return page
}

it('settles every row into its spoken state after its probe answers', async () => {
  const page = await openPickerFromShell()
  // One wait per row, all at once: each row settles on its own probe's clock,
  // and a filtered locator polls until the row carries the settled word — the
  // first paint says Status unknown.
  await Promise.all(
    ['dev-1', 'lab-2'].map((host) =>
      page.locator(`[data-deeptail-host="${host}"] .visually-hidden`).filter({ hasText: 'Online' }).waitFor(),
    ),
  )
  await page.close()
})
