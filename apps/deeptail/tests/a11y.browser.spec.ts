/**
 * WCAG 2.2 AA conformance over every rendered surface.
 *
 * The rules are axe-core's published set, run against the real built bundle in
 * Chromium. Nothing here restates a rule in local code, so a surface cannot be
 * made to pass by rewriting the check: the only way to clear a violation is to
 * fix the markup.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { type Harness, startHarness, WCAG_TAGS } from './harness.ts'
import {
  auditShellAtEachWidth,
  describeViolations,
  expectNoViolations,
  expectNoViolationsAtEachWidth,
  openPairingForm,
  openShell,
} from './surfaces.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('has no WCAG violations on the fleet roster, in both palettes', async () => {
  // Each palette gets its own page, so the two audits are independent and run
  // concurrently; a shared page would measure one palette and claim both.
  await Promise.all(
    [undefined, { dark: true }].map(async (view) => {
      const page = await openShell(harness, {}, view)
      await page
        .locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]')
        .waitFor({ state: 'visible' })
      await expectNoViolations(harness, page)
      await page.close()
    }),
  )
})

it('has no WCAG violations with the connection menu open', async () => {
  const page = await openShell(harness)
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'visible' })
  await expectNoViolations(harness, page)
  await page.close()
})

it('has no WCAG violations on a host that needs re-pairing', async () => {
  // One host only, or every row offers the action and the assertion is blind.
  const page = await openShell(harness, { remoteStatuses: { 'lab-2:session/list': 401 } })
  await page.locator('[data-deeptail-connection="trigger"]').click()
  await page.locator('[data-deeptail-action="repair"]').waitFor({ state: 'visible' })
  await expectNoViolations(harness, page)
  await page.close()
})

it('has no WCAG violations on a host that needs re-pairing at mobile, tablet and desktop, in both palettes', async () => {
  await auditShellAtEachWidth(harness, { remoteStatuses: { 'lab-2:session/list': 401 } }, async (page) => {
    await page.locator('[data-deeptail-connection="trigger"]').click()
    await page.locator('[data-deeptail-action="repair"]').waitFor({ state: 'visible' })
  })
}, 180_000)

it('has no WCAG violations while a host is failing beside one that answers', async () => {
  const page = await openShell(harness, { remoteErrors: { 'lab-2:session/list': 'roster unavailable' } })
  await page.waitForSelector('[data-deeptail-state="partial"]')
  await expectNoViolations(harness, page)
  await page.close()
})

it('has no WCAG violations while a roster read is in flight', async () => {
  const page = await openShell(harness, { remotePending: ['session/list'] })
  await page.waitForSelector('[data-deeptail-state="loading"]')
  await expectNoViolations(harness, page)
  await page.close()
})

it('has no WCAG violations in the compose sheet, including its error state', async () => {
  const page = await openShell(harness, { remoteErrors: { 'session/prompt': 'agent busy' } })
  await page.locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]').hover()
  await page
    .locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"] [data-deeptail-action="row-message"]')
    .click()
  await page.locator('[data-deeptail-dialog]').waitFor({ state: 'visible' })
  await expectNoViolations(harness, page)
  await page.locator('[data-deeptail-field="message"]').fill('please rerun the tests')
  await page.locator('[data-deeptail-action="compose-send"]').click()
  await page.locator('[data-deeptail-state="compose-error"]').waitFor({ state: 'visible' })
  await expectNoViolations(harness, page)
  await page.close()
})

it('has no WCAG violations in the new-session dialog', async () => {
  const page = await openShell(harness)
  await page.locator('[data-deeptail-action="new-session"]').click()
  await page.locator('[data-deeptail-dialog]').waitFor({ state: 'visible' })
  await expectNoViolations(harness, page)
  await page.close()
})

it('has no WCAG violations on a phone before the drawer is opened', async () => {
  const page = await openShell(harness, {}, { mobile: true })
  // The state a phone user actually lands on. Auditing only the opened drawer
  // would measure the one arrangement that is guaranteed to pass.
  await expectNoViolations(harness, page)
  await page.close()
})

it('keeps a level-one heading on the shell before the drawer is opened', async () => {
  // The phone layout hides the sidebar, so the page's one heading must live in
  // the main header: a page whose only heading vanishes with the layout has
  // none at all once the drawer closes. axe flags this as page-has-heading-one;
  // asserting it directly names the element the rule is about.
  const page = await openShell(harness, {}, { mobile: true })
  const headings = page.locator('.main-header h1')
  expect(await headings.count()).toBe(1)
  expect(await headings.first().evaluate((node) => getComputedStyle(node).visibility)).toBe('visible')
  await page.close()
})

it('has no WCAG violations in the drawer on a touch viewport', async () => {
  const page = await openShell(harness, {}, { mobile: true })
  await page.locator('[data-deeptail-action="drawer"]').click()
  await page.locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]').waitFor({ state: 'visible' })
  await expectNoViolations(harness, page)
  await page.close()
})

it('has no WCAG violations on the empty picker or its pairing form', async () => {
  const page = await harness.open({ hosts: [] })
  await page.waitForSelector('[data-deeptail-picker]')
  await expectNoViolations(harness, page)
  await page.getByRole('button', { name: 'Pair a host' }).click()
  await page.locator('[data-deeptail-field="link"]').waitFor({ state: 'visible' })
  await expectNoViolations(harness, page)
  await page.close()
})

it('holds axe to the published WCAG 2.2 AA tags', () => {
  expect([...WCAG_TAGS]).toEqual(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
})

it('has no WCAG violations on the fleet roster at mobile, tablet and desktop, in both palettes', async () => {
  await auditShellAtEachWidth(harness, {}, async (page) => {
    await page.locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]').waitFor({ state: 'visible' })
  })
}, 180_000)

it('has no WCAG violations on the picker at mobile, tablet and desktop, in both palettes', async () => {
  await expectNoViolationsAtEachWidth(harness, async (view) => {
    const page = await harness.open({ hosts: [] }, view)
    await page.waitForSelector('[data-deeptail-picker]')
    return page
  })
}, 180_000)

it('has no WCAG violations with the connection menu open at mobile, tablet and desktop, in both palettes', async () => {
  await auditShellAtEachWidth(harness, {}, async (page) => {
    await page.locator('[data-deeptail-connection="trigger"]').click()
    await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'visible' })
  })
}, 180_000)

it('has no WCAG violations in the new-session dialog at mobile, tablet and desktop, in both palettes', async () => {
  await auditShellAtEachWidth(harness, {}, async (page) => {
    await page.locator('[data-deeptail-action="new-session"]').click()
    await page.locator('[data-deeptail-dialog]').waitFor({ state: 'visible' })
  })
}, 180_000)

it('has no WCAG violations while a roster read is in flight at mobile, tablet and desktop, in both palettes', async () => {
  await auditShellAtEachWidth(harness, { remotePending: ['session/list'] }, async (page) => {
    await page.locator('[data-deeptail-state="loading"]').first().waitFor({ state: 'visible' })
  })
}, 180_000)

it('has no WCAG violations on a partial roster at mobile, tablet and desktop, in both palettes', async () => {
  await auditShellAtEachWidth(
    harness,
    { remoteErrors: { 'lab-2:session/list': 'roster unavailable' } },
    async (page) => {
      await page.waitForSelector('[data-deeptail-state="partial"]')
    },
  )
}, 180_000)

it('has no WCAG violations in the compose sheet at mobile, tablet and desktop, in both palettes', async () => {
  await auditShellAtEachWidth(harness, { remoteErrors: { 'session/prompt': 'agent busy' } }, async (page, view) => {
    const row = page.locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]')
    await row.waitFor({ state: 'visible' })
    if (view.mobile !== true && view.tablet !== true) await row.hover()
    await row.locator('[data-deeptail-action="row-message"]').waitFor({ state: 'visible' })
    await row.locator('[data-deeptail-action="row-message"]').click()
    await page.locator('[data-deeptail-dialog]').waitFor({ state: 'visible' })
    await page.locator('[data-deeptail-field="message"]').fill('please rerun the tests')
    await page.locator('[data-deeptail-action="compose-send"]').click()
    await page.locator('[data-deeptail-state="compose-error"]').waitFor({ state: 'visible' })
  })
}, 180_000)

it('has no WCAG violations on the pairing form at mobile, tablet and desktop, in both palettes', async () => {
  await expectNoViolationsAtEachWidth(harness, async (view) => openPairingForm(harness, view))
}, 180_000)

it('has no WCAG violations on the picker error at mobile, tablet and desktop, in both palettes', async () => {
  await expectNoViolationsAtEachWidth(harness, async (view) => {
    const page = await harness.open({ hosts: [], listError: 'the registry is unreadable' }, view)
    await page.waitForSelector('[data-deeptail-state="error"]')
    return page
  })
}, 180_000)

it('has no WCAG violations on the picker listing already-paired hosts at mobile, tablet and desktop, in both palettes', async () => {
  await auditShellAtEachWidth(harness, {}, async (page) => {
    await page.locator('[data-deeptail-connection="trigger"]').click()
    await page.getByRole('menuitem', { name: 'Pair a host' }).click()
    await page.locator('[data-deeptail-state="ready"]').waitFor({ state: 'visible' })
  })
}, 180_000)

it('has no WCAG violations with the drawer open in both palettes on a phone', async () => {
  await Promise.all(
    [false, true].map(async (dark) => {
      const page = await openShell(harness, {}, { mobile: true, dark })
      await page.locator('[data-deeptail-action="drawer"]').click()
      await page
        .locator('[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]')
        .waitFor({ state: 'visible' })
      await expectNoViolations(harness, page)
      await page.close()
    }),
  )
})

it('reports an unlabeled control as a WCAG violation', async () => {
  const page = await openShell(harness)
  await page.evaluate(() => {
    const button = document.createElement('button')
    button.dataset['deeptailProbe'] = 'unlabeled'
    document.querySelector('[data-deeptail-shell]')?.append(button)
  })
  const found = await harness.audit(page)
  expect(describeViolations(found)).not.toBe('')
  expect(found.some((violation) => violation.id === 'button-name')).toBe(true)
  await page.evaluate(() => document.querySelector('[data-deeptail-probe="unlabeled"]')?.remove())
  await expectNoViolations(harness, page)
  await page.close()
})
