/**
 * Every surface the accessibility audit arranges.
 *
 * One list, driven twice: `a11y.browser.spec.ts` and
 * `a11y-errors.browser.spec.ts` assert each surface under the published WCAG
 * tags, and `scripts/a11y-audit.ts` audits the whole list under every rule axe
 * enables. A surface therefore cannot be audited by one of them and absent from
 * the other, and the sentence the `a11y` script prints is about the same
 * surfaces the cases are.
 *
 * The tailnet screens are arranged in `tailnet.browser.spec.ts`, beside the
 * cases that drive the tailnet's own refusals. They are audited there, under
 * the published tags, and are not spelled out a second time here.
 *
 * @module
 */

import type { Page } from 'playwright'
import { oneHost } from './fixtures.ts'
import type { Harness } from './harness.ts'
import { AUDIT_VIEWS, type AuditView, openPairingForm, openShell, openShellWithDrawer } from './surfaces.ts'

/**
 * The session row every roster arrangement waits for: a running session on the
 * first host, which is what the fixture answers with.
 */
const ROSTER_ROW = '[data-deeptail-host="dev-1"][data-deeptail-session="s-running"]'

/** One surface the audit arranges, and how a case reaches it. */
export interface AuditedSurface {
  /** What a report and a case name it. */
  readonly name: string
  /** Whether the product shows this while it works, or reports it as a refusal. */
  readonly kind: 'shown' | 'refusal'
  /** The views it exists on, when it is not every designed width. */
  readonly only?: (view: AuditView) => boolean
  /** Open a page showing the surface, ready to audit. */
  readonly arrange: (harness: Harness, view: AuditView) => Promise<Page>
}

/**
 * The views one surface exists on.
 * @param surface - the surface to ask about.
 * @returns every designed width it is arranged at, palette included.
 */
export function viewsOf(surface: AuditedSurface): readonly AuditView[] {
  const at = surface.only
  return at === undefined ? AUDIT_VIEWS : AUDIT_VIEWS.filter((view) => at(view))
}

/** Every surface the audit arranges, in the order a report lists them. */
export const AUDITED_SURFACES: readonly AuditedSurface[] = [
  {
    name: 'the fleet roster',
    kind: 'shown',
    arrange: async (harness, view) => {
      const page = await openShellWithDrawer(harness, {}, view)
      await page.locator(ROSTER_ROW).waitFor({ state: 'visible' })
      return page
    },
  },
  {
    // The state a reader on a narrow window lands on, which is the one
    // arrangement the roster above never audits: it opens the drawer.
    name: 'the shell before the drawer is opened',
    kind: 'shown',
    only: (view) => view.mobile === true,
    arrange: (harness, view) => openShell(harness, {}, view),
  },
  {
    name: 'the connection menu',
    kind: 'shown',
    arrange: async (harness, view) => {
      const page = await openShellWithDrawer(harness, {}, view)
      await page.locator('[data-deeptail-connection="trigger"]').click()
      await page.locator('[data-deeptail-connection="menu"]').waitFor({ state: 'visible' })
      return page
    },
  },
  {
    name: 'a host that needs re-pairing',
    kind: 'shown',
    arrange: async (harness, view) => {
      const page = await openShellWithDrawer(harness, { remoteStatuses: { 'lab-2:session/list': 401 } }, view)
      await page.locator('[data-deeptail-connection="trigger"]').click()
      await page.locator('[data-deeptail-action="repair"]').waitFor({ state: 'visible' })
      return page
    },
  },
  {
    name: 'a roster read in flight',
    kind: 'shown',
    arrange: async (harness, view) => {
      const page = await openShellWithDrawer(harness, { remotePending: ['session/list'] }, view)
      await page.locator('[data-deeptail-state="loading"]').first().waitFor({ state: 'visible' })
      return page
    },
  },
  {
    name: 'a partial roster',
    kind: 'shown',
    arrange: async (harness, view) => {
      const page = await openShellWithDrawer(
        harness,
        { remoteErrors: { 'lab-2:session/list': 'roster unavailable' } },
        view,
      )
      await page.waitForSelector('[data-deeptail-state="partial"]')
      return page
    },
  },
  {
    name: 'the compose sheet and its refusal',
    kind: 'shown',
    arrange: async (harness, view) => {
      const page = await openShellWithDrawer(harness, { remoteErrors: { 'session/prompt': 'agent busy' } }, view)
      const row = page.locator(ROSTER_ROW)
      await row.waitFor({ state: 'visible' })
      // The row's actions are revealed by hover where the pointer is fine and
      // are painted throughout where it is coarse.
      if (view.mobile !== true && view.tablet !== true) await row.hover()
      await row.locator('[data-deeptail-action="row-message"]').click()
      await page.locator('[data-deeptail-dialog]').waitFor({ state: 'visible' })
      await page.locator('[data-deeptail-field="message"]').fill('please rerun the tests')
      await page.locator('[data-deeptail-action="compose-send"]').click()
      await page.locator('[data-deeptail-state="compose-error"]').waitFor({ state: 'visible' })
      return page
    },
  },
  {
    name: 'the new-session dialog',
    kind: 'shown',
    arrange: async (harness, view) => {
      const page = await openShellWithDrawer(harness, {}, view)
      await page.locator('[data-deeptail-action="new-session"]').click()
      await page.locator('[data-deeptail-dialog]').waitFor({ state: 'visible' })
      return page
    },
  },
  {
    name: 'the empty picker',
    kind: 'shown',
    arrange: async (harness, view) => {
      const page = await harness.open({ hosts: [] }, view)
      await page.waitForSelector('[data-deeptail-picker]')
      return page
    },
  },
  {
    name: 'the pairing form',
    kind: 'shown',
    arrange: (harness, view) => openPairingForm(harness, view),
  },
  {
    name: 'the picker listing the hosts already paired',
    kind: 'shown',
    arrange: async (harness, view) => {
      const page = await openShellWithDrawer(harness, {}, view)
      await page.locator('[data-deeptail-connection="trigger"]').click()
      await page.getByRole('menuitem', { name: 'Pair a host' }).click()
      await page.locator('[data-deeptail-state="ready"]').waitFor({ state: 'visible' })
      return page
    },
  },
  {
    name: "the picker's read failure",
    kind: 'refusal',
    arrange: async (harness, view) => {
      const page = await harness.open({ hosts: [], listError: 'the registry is unreadable' }, view)
      await page.waitForSelector('[data-deeptail-state="error"]')
      return page
    },
  },
  {
    name: 'a spawn refusal',
    kind: 'refusal',
    arrange: async (harness, view) => {
      const page = await openShellWithDrawer(
        harness,
        oneHost({
          remoteErrors: { 'session/create': 'no such preset' },
          remoteErrorCodes: { 'session/create': 'agent-preset-not-found' },
          remoteErrorDetails: { 'session/create': { available: ['standard', 'ptc'] } },
        }),
        view,
      )
      await page.locator('[data-deeptail-action="new-session"]').click()
      await page.locator('[data-deeptail-dialog]').waitFor({ state: 'visible' })
      await page.locator('[data-deeptail-field="preset"]').fill('nope')
      await page.locator('[data-deeptail-action="spawn-create"]').click()
      await page.locator('[data-deeptail-state="spawn-error"]').waitFor({ state: 'visible' })
      return page
    },
  },
  {
    name: 'a shell error',
    kind: 'refusal',
    arrange: async (harness, view) => {
      const page = await openShellWithDrawer(harness, oneHost({ bootError: 'host refused the boot table' }), view)
      await page.locator(`${ROSTER_ROW} .session-open`).click()
      await page.locator('[data-deeptail-state="shell-error"]').waitFor({ state: 'visible' })
      return page
    },
  },
  {
    name: 'a pairing refusal',
    kind: 'refusal',
    arrange: async (harness, view) => {
      const page = await openPairingForm(harness, view)
      await page.locator('[data-deeptail-field="link"]').fill('not a link')
      await page.locator('[data-deeptail-action="pair-submit"]').click()
      await page.locator('[data-deeptail-state="pair-error"]').waitFor({ state: 'visible' })
      return page
    },
  },
  {
    name: 'a tailnet connect refusal',
    kind: 'refusal',
    arrange: async (harness, view) => {
      const page = await harness.open({ hosts: [], tailnetConnected: false }, view)
      await page.waitForSelector('[data-deeptail-picker]')
      await page.locator('[data-deeptail-action="tailnet"]').click()
      await page.locator('[data-deeptail-action="tailnet-connect"]').click()
      await page.locator('[data-deeptail-state="tailnet-error"]').waitFor({ state: 'visible' })
      return page
    },
  },
]

/** The states the product shows while it is working. */
export const SHOWN_SURFACES: readonly AuditedSurface[] = AUDITED_SURFACES.filter((surface) => surface.kind === 'shown')

/** The refusals the product reports when a step cannot be taken. */
export const REFUSAL_SURFACES: readonly AuditedSurface[] = AUDITED_SURFACES.filter(
  (surface) => surface.kind === 'refusal',
)
