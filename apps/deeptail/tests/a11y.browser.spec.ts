/**
 * WCAG 2.2 AA conformance over every rendered surface.
 *
 * The rules are axe-core's published set, run against the real built bundle in
 * Chromium. Nothing here restates a rule in local code, so a surface cannot be
 * made to pass by rewriting the check: the only way to clear a violation is to
 * fix the markup.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { fleet } from './fixtures.ts'
import { type Harness, startHarness, type Violation } from './harness.ts'

let harness: Harness

/**
 * Render a violation set as a failure message a reader can act on.
 * @param violations - what axe reported.
 * @returns one line per offending node.
 */
function describeViolations(violations: readonly Violation[]): string {
  return violations
    .map(
      (violation) => `${violation.id} (${violation.impact}): ${violation.help}\n    ${violation.nodes.join('\n    ')}`,
    )
    .join('\n  ')
}

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('has no WCAG violations on the fleet roster', async () => {
  const page = await harness.open(fleet())
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]').waitFor({ state: 'visible' })
  expect(describeViolations(await harness.audit(page))).toBe('')
  await page.close()
})

it('has no WCAG violations in the dark palette', async () => {
  const page = await harness.open(fleet(), { dark: true })
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]').waitFor({ state: 'visible' })
  expect(describeViolations(await harness.audit(page))).toBe('')
  await page.close()
})

it('has no WCAG violations with the connection menu open', async () => {
  const page = await harness.open(fleet())
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'visible' })
  expect(describeViolations(await harness.audit(page))).toBe('')
  await page.close()
})

it('has no WCAG violations on a host that needs re-pairing', async () => {
  // One host only, or every row offers the action and the assertion is blind.
  const page = await harness.open(fleet({ remoteStatuses: { 'lab-2:session/list': 401 } }))
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await page.locator('[data-deeptail-action="repair"]').waitFor({ state: 'visible' })
  expect(describeViolations(await harness.audit(page))).toBe('')
  await page.close()
})

it('has no WCAG violations while a host is failing beside one that answers', async () => {
  const page = await harness.open(fleet({ remoteErrors: { 'lab-2:session/list': 'roster unavailable' } }))
  await page.waitForSelector('[data-deeptail-state="partial"]')
  expect(describeViolations(await harness.audit(page))).toBe('')
  await page.close()
})

it('has no WCAG violations while a roster read is in flight', async () => {
  const page = await harness.open(fleet({ remotePending: ['session/list'] }))
  await page.waitForSelector('[data-deeptail-state="loading"]')
  expect(describeViolations(await harness.audit(page))).toBe('')
  await page.close()
})

it('has no WCAG violations in the compose sheet, including its error state', async () => {
  const page = await harness.open(fleet({ remoteErrors: { 'session/prompt': 'agent busy' } }))
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]').hover()
  await page
    .locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"] [data-deeptail-action="row-message"]')
    .click()
  await page.locator('[data-deeptail-dialog]').waitFor({ state: 'visible' })
  expect(describeViolations(await harness.audit(page))).toBe('')
  await page.locator('[data-deeptail-field="message"]').fill('please rerun the tests')
  await page.locator('[data-deeptail-action="compose-send"]').click()
  await page.locator('[data-deeptail-state="compose-error"]').waitFor({ state: 'visible' })
  expect(describeViolations(await harness.audit(page))).toBe('')
  await page.close()
})

it('has no WCAG violations in the new-session dialog', async () => {
  const page = await harness.open(fleet())
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-action="new-session"]').click()
  await page.locator('[data-deeptail-dialog]').waitFor({ state: 'visible' })
  expect(describeViolations(await harness.audit(page))).toBe('')
  await page.close()
})

it('has no WCAG violations on a phone before the drawer is opened', async () => {
  const page = await harness.open(fleet(), { mobile: true })
  await page.waitForSelector('[data-deeptail-shell]')
  // The state a phone user actually lands on. Auditing only the opened drawer
  // would measure the one arrangement that is guaranteed to pass.
  expect(describeViolations(await harness.audit(page))).toBe('')
  await page.close()
})

it('keeps a level-one heading on the shell before the drawer is opened', async () => {
  // The phone layout hides the sidebar, so the page's one heading must live in
  // the main header: a page whose only heading vanishes with the layout has
  // none at all once the drawer closes. axe flags this as page-has-heading-one;
  // asserting it directly names the element the rule is about.
  const page = await harness.open(fleet(), { mobile: true })
  await page.waitForSelector('[data-deeptail-shell]')
  const headings = page.locator('.main-header h1')
  expect(await headings.count()).toBe(1)
  expect(await headings.first().evaluate((node) => getComputedStyle(node).visibility)).toBe('visible')
  await page.close()
})

it('has no WCAG violations in the drawer on a touch viewport', async () => {
  const page = await harness.open(fleet(), { mobile: true })
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-action="drawer"]').click()
  await page.locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]').waitFor({ state: 'visible' })
  expect(describeViolations(await harness.audit(page))).toBe('')
  await page.close()
})

it('has no WCAG violations on the empty picker or its pairing form', async () => {
  const page = await harness.open({ hosts: [] })
  await page.waitForSelector('[data-deeptail-picker]')
  expect(describeViolations(await harness.audit(page))).toBe('')
  await page.getByRole('button', { name: 'Pair a host' }).click()
  await page.locator('[data-deeptail-field="link"]').waitFor({ state: 'visible' })
  expect(describeViolations(await harness.audit(page))).toBe('')
  await page.close()
})

it('has no WCAG violations on the picker listing already-paired hosts', async () => {
  // The list view is reached from the shell: pairing another host hands the
  // page back to the picker with the registry already populated.
  const page = await harness.open(fleet())
  await page.waitForSelector('[data-deeptail-shell]')
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await page.getByRole('menuitem', { name: 'Pair a host' }).click()
  await page.locator('[data-deeptail-state="ready"]').waitFor({ state: 'visible' })
  expect(describeViolations(await harness.audit(page))).toBe('')
  await page.close()
})
