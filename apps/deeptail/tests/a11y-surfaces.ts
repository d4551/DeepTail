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
 * Each arrangement is written out of the steps in `page-steps.ts` and the
 * fixtures in `fixtures.ts`, so a surface states what makes it that surface
 * rather than restating a selector or an answer table.
 *
 * @module
 */

import type { Page } from 'playwright'
import { oneHost, refusesUnknownPreset } from './fixtures.ts'
import type { Harness } from './harness.ts'
import {
  choosePairHost,
  clickAction,
  connectTailnet,
  fillField,
  openConnectForm,
  openPicker,
  pressNewSession,
  spawnUnknownPreset,
  state,
  submitPairing,
  waitForAction,
  waitForSheet,
  waitForState,
} from './page-steps.ts'
import {
  AUDIT_VIEWS,
  type AuditView,
  FLEET_ROW,
  type FleetFixture,
  openPairingForm,
  openShell,
  openShellWithDrawer,
  pressRowAction,
} from './surfaces.ts'
import { showSwitcher } from './switcher.ts'
import { isCoarse } from './viewports.ts'

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

/**
 * A surface the audit arranges by opening the shell over the fleet with its
 * sidebar showing, and then driving one step.
 *
 * The opening is stated once here rather than inside each arrangement: four
 * surfaces in the table below were opening it by hand, and a fifth would have
 * had to remember both calls.
 * @param name - the name the report lists the surface under.
 * @param drive - what the surface does once the sidebar is showing.
 * @param options - the fixture it boots against, and where it exists.
 * @returns the surface the audit arranges.
 */
function drawerSurface(
  name: string,
  drive: (page: Page) => Promise<void>,
  options: { readonly fixture?: FleetFixture; readonly only?: (view: AuditView) => boolean } = {},
): AuditedSurface {
  const surface = {
    name,
    kind: 'shown' as const,
    arrange: async (harness: Harness, view: AuditView): Promise<Page> => {
      const page = await openShellWithDrawer(harness, options.fixture ?? {}, view)
      await drive(page)
      return page
    },
  }
  return options.only === undefined ? surface : { ...surface, only: options.only }
}

/**
 * Reach the picker's list view the way the product does: from the sidebar's
 * switcher, by asking to pair another host.
 * @param page - the page showing the shell.
 */
async function openPairedPicker(page: Page): Promise<void> {
  await showSwitcher(page)
  await choosePairHost(page)
}

/** Every surface the audit arranges, in the order a report lists them. */
export const AUDITED_SURFACES: readonly AuditedSurface[] = [
  drawerSurface('the fleet roster', (page) => page.locator(FLEET_ROW).waitFor({ state: 'visible' })),
  {
    // The state a reader on a narrow window lands on, which is the one
    // arrangement the roster above never audits: it opens the drawer.
    name: 'the shell before the drawer is opened',
    kind: 'shown',
    only: (view) => view.mobile === true,
    arrange: (harness, view) => openShell(harness, {}, view),
  },
  drawerSurface('the connection menu', showSwitcher),
  {
    name: 'a host that needs re-pairing',
    kind: 'shown',
    arrange: async (harness, view) => {
      const page = await openShellWithDrawer(harness, { remoteStatuses: { 'lab-2:session/list': 401 } }, view)
      await showSwitcher(page)
      await waitForAction(page, 'repair')
      return page
    },
  },
  {
    name: 'a roster read in flight',
    kind: 'shown',
    arrange: async (harness, view) => {
      const page = await openShellWithDrawer(harness, { remotePending: ['session/list'] }, view)
      await page.locator(state('loading')).first().waitFor({ state: 'visible' })
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
      await waitForState(page, 'partial')
      return page
    },
  },
  {
    name: 'the compose sheet and its refusal',
    kind: 'shown',
    arrange: async (harness, view) => {
      const page = await openShellWithDrawer(harness, { remoteErrors: { 'session/prompt': 'agent busy' } }, view)
      await pressRowAction(page, 'row-message', isCoarse(view))
      await waitForSheet(page)
      await fillField(page, 'message', 'please rerun the tests')
      await clickAction(page, 'compose-send')
      await waitForState(page, 'compose-error')
      return page
    },
  },
  drawerSurface('the new-session dialog', pressNewSession),
  {
    name: 'the empty picker',
    kind: 'shown',
    arrange: (harness, view) => openPicker(harness, {}, view),
  },
  {
    name: 'the pairing form',
    kind: 'shown',
    arrange: (harness, view) => openPairingForm(harness, view),
  },
  drawerSurface('the picker listing the hosts already paired', openPairedPicker),
  {
    name: "the picker's read failure",
    kind: 'refusal',
    arrange: async (harness, view) => {
      const page = await openPicker(harness, { listError: 'the registry is unreadable' }, view)
      await waitForState(page, 'error')
      return page
    },
  },
  {
    name: 'a spawn refusal',
    kind: 'refusal',
    arrange: async (harness, view) => {
      const page = await openShellWithDrawer(harness, oneHost(refusesUnknownPreset()), view)
      await spawnUnknownPreset(page)
      await waitForState(page, 'spawn-error')
      return page
    },
  },
  {
    name: 'a shell error',
    kind: 'refusal',
    arrange: async (harness, view) => {
      const page = await openShellWithDrawer(harness, oneHost({ bootError: 'host refused the boot table' }), view)
      await page.locator(`${FLEET_ROW} .session-open`).click()
      await waitForState(page, 'shell-error')
      return page
    },
  },
  {
    name: 'a pairing refusal',
    kind: 'refusal',
    arrange: async (harness, view) => {
      const page = await openPairingForm(harness, view)
      await submitPairing(page, 'not a link')
      await waitForState(page, 'pair-error')
      return page
    },
  },
  {
    name: 'a tailnet connect refusal',
    kind: 'refusal',
    arrange: async (harness, view) => {
      const page = await openPicker(harness, { tailnetConnected: false }, view)
      await openConnectForm(page)
      await connectTailnet(page)
      await waitForState(page, 'tailnet-error')
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
