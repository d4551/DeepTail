/**
 * What the overlap check does with targets an inert pane holds.
 *
 * The narrow layout seats the roster in the closed drawer: translated off the
 * canvas and marked inert, so nothing in it takes a click. Pinning two of its
 * controls into the same pixels must therefore report nothing — an unreachable
 * target cannot be unreachable twice — while the wide layout proves the same
 * pair, in play, is reported (structure-geometry.browser.spec.ts).
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { fleet } from './fixtures.ts'
import { type Harness, startHarness } from './harness.ts'
import { defects } from './structure-page.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('reports no overlap between targets an inert pane holds out of play', async () => {
  const page = await harness.open(fleet(), { mobile: true })
  await page.waitForSelector('[data-deeptail-shell]')
  // A stylesheet, not an inline style: the roster's own controls are pinned
  // into the same pixels, but the closed drawer has already taken them out of
  // play, and a check that reported them would be reading a pane no reader can
  // reach.
  await page.addStyleTag({
    content:
      '[data-deeptail-action="new-session"], [data-deeptail-connection="trigger"] { position: fixed; inset-block-start: 0; inset-inline-start: 0; margin: 0; }',
  })
  expect(await defects(page)).toBe('')
  await page.close()
})
