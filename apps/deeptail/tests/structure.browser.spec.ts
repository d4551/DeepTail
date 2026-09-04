/**
 * Structural conformance of the markup, across every surface the product ships.
 *
 * These are the defects a WCAG rule engine does not report: an interactive
 * element nested inside another, a heading level skipped, an ARIA reference
 * pointing at nothing, an item outside its list, a class outside the shipped
 * vocabulary, or a label clipped by its box. The checks run in the page, so
 * they see the computed layout rather than the markup that produced it. What a
 * finger has to reach, and what scrolls inside what, is measured in
 * structure-geometry.browser.spec.ts.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { fleet, oneHost } from './fixtures.ts'
import { type Harness, startHarness } from './harness.ts'
import { defects, isDrawerLayout, VIEWPORTS } from './structure-page.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('has no structural defects on the roster at any width', async () => {
  const checked = await Promise.all(
    VIEWPORTS.map(async (viewport) => {
      const page = await harness.open(fleet())
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.waitForSelector('[data-deeptail-shell]')
      await page
        .locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]')
        .waitFor({ state: 'attached' })
      const found = await defects(page)
      await page.close()
      return [viewport.label, found]
    }),
  )
  expect(checked).toEqual(VIEWPORTS.map((viewport) => [viewport.label, '']))
})

it('has no structural defects with the connection menu open', async () => {
  const page = await harness.open(fleet())
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'visible' })
  expect(await defects(page)).toBe('')
  await page.close()
})

it('has no structural defects in either dialog', async () => {
  const page = await harness.open(oneHost())
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-action="new-session"]').click()
  await page.locator('[data-deeptail-dialog]').waitFor({ state: 'visible' })
  expect(await defects(page)).toBe('')
  await page.keyboard.press('Escape')
  await page.locator('[data-deeptail-session="s-running"]').hover()
  await page.locator('[data-deeptail-session="s-running"] [data-deeptail-action="row-message"]').click()
  await page.locator('[data-deeptail-dialog]').waitFor({ state: 'visible' })
  expect(await defects(page)).toBe('')
  await page.close()
})

it('has no structural defects on the picker', async () => {
  const page = await harness.open({ hosts: [] })
  await page.waitForSelector('[data-deeptail-picker]')
  expect(await defects(page)).toBe('')
  await page.getByRole('button', { name: 'Pair a host' }).click()
  await page.locator('[data-deeptail-field="link"]').waitFor({ state: 'visible' })
  expect(await defects(page)).toBe('')
  await page.close()
})

it('has no structural defects with the document direction reversed', async () => {
  const page = await harness.open(fleet(), { direction: 'rtl' })
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]').waitFor({ state: 'attached' })
  // Layout is flow-relative, so reversing the direction must not overflow the
  // viewport or clip a label. This is what a right-to-left locale meets.
  expect(await defects(page)).toBe('')
  await page.close()
})

it('has no structural defects on any failure state, at every width', async () => {
  // No failure state was ever measured. That is where the retry control, the
  // strips and their borders live, so the one surface with an extra affordance
  // in it was the one surface no structural check had seen.
  const checked = await Promise.all(
    VIEWPORTS.map(async (viewport) => {
      const page = await harness.open(fleet({ remoteErrors: { 'lab-2:session/list': 'roster unavailable' } }))
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.waitForSelector('[data-deeptail-shell]')
      // Below the drawer breakpoint the roster — and the strip in it — is
      // inside the closed drawer, so it is on screen only once the drawer is
      // open. The layout decides that at this width, not the fixture.
      if (await isDrawerLayout(page)) await page.locator('[data-deeptail-action="drawer"]').click()
      await page.locator('[data-deeptail-state="partial"]').waitFor({ state: 'visible' })
      const found = await defects(page)
      await page.close()
      return `${viewport.label}: ${found}`
    }),
  )
  expect(checked.filter((line) => !line.endsWith(': '))).toEqual([])
})

// A check that never reports is indistinguishable from one that cannot: the
// rule below was written against a fixture whose panes happen to fit, so it
// stayed quiet through every case above whether or not it worked. This one
// gives it something to find.
it('has no structural defects on the picker while it is reporting a refusal', async () => {
  const page = await harness.open({ hosts: [], listError: 'the registry is unreadable' })
  await page.waitForSelector('[data-deeptail-state="error"]')
  expect(await defects(page)).toBe('')
  await page.close()
})

it('has no structural defects on a pairing form that refused what was typed', async () => {
  // The picker only draws while nothing is paired; a host in the registry goes
  // straight to the shell.
  const page = await harness.open({ hosts: [] })
  await page.waitForSelector('[data-deeptail-picker]')
  await page.getByRole('button', { name: 'Pair a host' }).click()
  await page.locator('[data-deeptail-field="link"]').fill('not a link')
  await page.locator('[data-deeptail-action="pair-submit"]').click()
  await page.waitForSelector('[data-deeptail-state="pair-error"]')
  expect(await defects(page)).toBe('')
  await page.close()
})

it('has no structural defects with a row action revealed', async () => {
  const page = await harness.open(fleet())
  await page.waitForSelector('[data-deeptail-shell]')
  // The actions are `display: none` until the row is focused, so on a fine
  // pointer they were never measured at all — a 0x0 box is not a target.
  await page.locator('[data-deeptail-session="s-running"] .session-open').first().focus()
  await page.locator('[data-deeptail-action="row-message"]').first().waitFor({ state: 'visible' })
  expect(await defects(page)).toBe('')
  await page.close()
})

/** Plant one element in a container, as the page itself would draw it. */
const PLANT_STRANGERS = `(() => {
  const stranger = document.createElement('div')
  stranger.className = 'btn p-4'
  stranger.dataset.deeptailProbe = 'stranger'
  document.querySelector('[data-deeptail-shell]').append(stranger)
  const outsider = document.createElement('div')
  outsider.className = 'btn p-4'
  outsider.dataset.deeptailProbe = 'outsider'
  document.body.append(outsider)
})()`

/** Drop the probe element a previous evaluation planted. */
const DROP = (probe: string): string => `(() => {
  document.querySelector('[data-deeptail-probe="${probe}"]')?.remove()
  return document.querySelector('[data-deeptail-probe="${probe}"]') === null
})()`

it('reports a class the shipped vocabulary does not define, and only inside the product', async () => {
  const page = await harness.open(fleet())
  await page.waitForSelector('[data-deeptail-shell]')
  // A foreign utility vocabulary (`btn`, `p-4`) is the shape this refusal
  // exists for: a styling decision made outside the design system, on an
  // element the product itself drew.
  await page.evaluate(PLANT_STRANGERS)
  const found = await defects(page)
  expect(found).toContain('unknown-class')
  expect(found).toContain('"btn"')
  expect(found).toContain('"p-4"')
  // The vocabulary is this product's law, not the document's: the harness
  // client styles its own UI with classes no sheet here names, so the same
  // classes outside the product's surfaces are somebody else's markup and no
  // refusal of theirs.
  expect(await page.evaluate<boolean>(DROP('outsider'))).toBe(true)
  const stillFound = await defects(page)
  expect(stillFound).toContain('unknown-class')
  expect(await page.evaluate<boolean>(DROP('stranger'))).toBe(true)
  expect(await defects(page)).toBe('')
  await page.close()
})

/** Paint a focusable button away to nothing, as a layout accident would. */
const PLANT_COLLAPSED = `(() => {
  const gone = document.createElement('button')
  gone.textContent = 'vanished'
  gone.dataset.deeptailProbe = 'collapsed'
  gone.style.width = '0'
  gone.style.height = '0'
  gone.style.padding = '0'
  gone.style.border = 'none'
  document.querySelector('[data-deeptail-shell]').append(gone)
})()`

it('reports an interactive control that takes focus but paints no box', async () => {
  const page = await harness.open(fleet())
  await page.waitForSelector('[data-deeptail-shell]')
  // A collapsed control is the reachable-but-unaimable defect: in the tab
  // order, announced, and impossible to point at. The fixture paints itself
  // away in the page, because the point is what the box measures at runtime.
  await page.evaluate(PLANT_COLLAPSED)
  const found = await defects(page)
  expect(found).toContain('target-collapsed')
  expect(await page.evaluate<boolean>(DROP('collapsed'))).toBe(true)
  expect(await defects(page)).toBe('')
  await page.close()
})
