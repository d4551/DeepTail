/**
 * The page choreography every browser suite shares: open the shell over a
 * fixture, wait until it is showing, and settle the page at one designed width.
 * One module, so the suites cannot drift on how a page is opened.
 *
 * The controls, and the single steps a case takes on one, live above it in
 * `page-steps.ts`; what is here is the layer that opens a surface.
 *
 * What "clean" means, and the arrangements the accessibility audit drives, live
 * beside it: `audit.ts` decides it, `a11y-surfaces.ts` names the surfaces, and
 * `a11y-audit.ts` drives them.
 *
 * @module
 */

import type { Page } from 'playwright'
import { fleet, oneHost } from './fixtures.ts'
import type { Harness, Violation } from './harness.ts'
import {
  action,
  clickAction,
  type OpenOptions,
  openPairForm,
  openPicker,
  sessionRow,
  waitForSheet,
} from './page-steps.ts'
import { pointerFlags, VIEWPORTS, type Viewport } from './viewports.ts'

/** One designed width × palette the a11y suite must actually open, not merely list. */
export interface AuditView {
  readonly label: string
  readonly dark: boolean
  readonly width: number
  readonly height: number
  readonly mobile?: true
  readonly tablet?: true
}

/** Every `VIEWPORTS` row in both palettes. Tablet/phone keep a coarse pointer. */
export const AUDIT_VIEWS: readonly AuditView[] = VIEWPORTS.flatMap((viewport) =>
  ([false, true] as const).map((dark) => auditView(viewport, dark)),
)

/**
 * One designed width in one palette.
 * @param viewport - the designed width.
 * @param dark - whether the palette is the dark one.
 * @returns the row the audit opens.
 */
function auditView(viewport: Viewport, dark: boolean): AuditView {
  const label = `${viewport.label} ${dark ? 'dark' : 'light'}`
  const size = { label, dark, width: viewport.width, height: viewport.height }
  const pointer = pointerFlags(viewport)
  if (pointer.tablet === true) return { ...size, tablet: true }
  return pointer.mobile === true ? { ...size, mobile: true } : size
}

/**
 * Size the page to a designed width after opening with the matching pointer,
 * then let what is moving finish moving.
 *
 * Coarse rows open through `{ mobile: true }` / `{ tablet: true }` (hasTouch).
 *
 * The shell's drawer carries a transform transition, and a resize restarts
 * layout under it. An audit taken during one measures a frame no reader is
 * ever shown — a panel part-way across the viewport, and a colour axe samples
 * through whatever it is still sliding over, which is how a strip at eleven to
 * one was reported as failing contrast. Everything running is awaited first,
 * and then one frame, so what is audited is what a reader would be looking at.
 * A spinner never finishes and is not waited for.
 * @param page - the page just opened.
 * @param view - the width and height to realize.
 */
export async function realizeView(page: Page, view: Pick<AuditView, 'width' | 'height'>): Promise<void> {
  await page.setViewportSize({ width: view.width, height: view.height })
  await page.evaluate(async () => {
    await document.fonts.ready
    const finite = [...document.getAnimations()].filter((animation) => {
      const effect = animation.effect
      return effect !== null && effect.getComputedTiming().iterations !== Number.POSITIVE_INFINITY
    })
    await Promise.allSettled(finite.map((animation) => animation.finished))
  })
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve()
        })
      }),
  )
}

/**
 * Describe every violation an audit found, one line each, or nothing.
 * @param violations - the violations axe reported.
 * @returns the report, empty when nothing was found.
 */
export function describeViolations(violations: readonly Violation[]): string {
  return violations.map(({ id, nodes }) => `${id}: ${nodes.join(', ')}`).join('\n')
}

/**
 * Wait until the live mount has attached, not merely until the first paint is
 * in the document. The shipped page already carries `[data-deeptail-shell]`;
 * the new-session control is appended only when JS binds the chrome.
 * @param page - the page that loaded the built bundle.
 */
export async function waitForLiveShell(page: Page): Promise<void> {
  await page.waitForSelector('[data-deeptail-shell]')
  // Attached, not visible: on a drawer width the control sits in the closed
  // sidebar (`visibility: hidden`) until the case opens it.
  await page.locator(action('new-session')).waitFor({ state: 'attached' })
}

/**
 * Open the drawer when this width seats the roster behind it.
 *
 * The toggle is painted before JS binds it. Clicking it before the live mount
 * attaches is a no-op, and the subsequent adopt closes the drawer, so the
 * roster the case then waits to see never becomes visible.
 * @param page - the page showing the shell.
 */
export async function openDrawerIfPresent(page: Page): Promise<void> {
  if (!(await page.locator(action('drawer')).isVisible())) return
  await clickAction(page, 'drawer')
  await page.locator(`${action('drawer')}[aria-expanded="true"]`).waitFor({ state: 'visible' })
}

/**
 * Open the empty picker and drive it to its pairing form.
 *
 * The a11y suite audits this page and the error suite drives its refusal off
 * it, so the choreography is stated once here and neither suite can drift on
 * how the form is reached.
 * @param harness - the suite's browser harness.
 * @param view - the viewport and palette the case is measured under.
 * @returns the page, showing the pairing form.
 */
export async function openPairingForm(harness: Harness, view: AuditView): Promise<Page> {
  const page = await openPicker(harness, {}, view)
  await openPairForm(page)
  return page
}

/**
 * The registry overrides a case states before the page boots.
 *
 * Read off the fleet fixture, which is the shape every opener here hands the
 * harness, so no opener can accept a fixture the others do not.
 */
export type FleetFixture = Parameters<typeof fleet>[0]

/**
 * The registry overrides a single-host case states before the page boots.
 *
 * Read off the single-host fixture for the same reason `FleetFixture` is read
 * off the fleet's: no opener can accept a shape the fixture does not produce.
 */
type OneHostFixture = Parameters<typeof oneHost>[0]

/**
 * Open the shell over a fleet fixture and wait until it is showing.
 * @param harness - the suite's browser harness.
 * @param fixture - the registry the page boots against.
 * @param view - the viewport and palette the case is measured under.
 * @returns the page, showing the shell.
 */
export async function openShell(harness: Harness, fixture: FleetFixture = {}, view?: OpenOptions): Promise<Page> {
  const page = await harness.open(fleet(fixture), view)
  await waitForLiveShell(page)
  return page
}

/**
 * Open the shell and show the roster, which on a narrow width means opening the
 * drawer that seats it.
 *
 * The surface list in `a11y-surfaces.ts` opens through here, so every roster
 * arrangement reaches the state it names the same way.
 * @param harness - the suite's browser harness.
 * @param fixture - the registry the page boots against.
 * @param view - the viewport and palette the case is measured under.
 * @returns the page, showing the shell with the roster visible.
 */
export async function openShellWithDrawer(
  harness: Harness,
  fixture: FleetFixture = {},
  view?: OpenOptions,
): Promise<Page> {
  const shell = await openShell(harness, fixture, view)
  await openDrawerIfPresent(shell)
  return shell
}

/** The row a roster seats for the one running session `oneHost` serves. */
export const RUNNING_ROW = sessionRow('s-running')

/** The same row on the fleet fixture, scoped to the host that seats it. */
export const FLEET_ROW = `[data-deeptail-host="dev-1"]${RUNNING_ROW}`

/**
 * Open the shell over the single-host fixture and wait until its row is seated.
 *
 * Three suites want the same page: the built product, one host, and a roster
 * that has finished reading. Waiting for the shell alone is not enough — the
 * registry, the grant table and the roster read all land after it — so a case
 * that went on to assert about a row would race the read it is asserting about.
 * @param harness - the suite's browser harness.
 * @param fixture - the registry the page boots against.
 * @returns the page, showing the shell with its roster row visible.
 */
export async function openShellWithRoster(harness: Harness, fixture: OneHostFixture = {}): Promise<Page> {
  const page = await openShell(harness, oneHost(fixture))
  await page.locator(RUNNING_ROW).waitFor({ state: 'visible' })
  return page
}

/**
 * Open the compose sheet for the running session's row.
 *
 * The row actions ride behind a hover on a fine pointer, so the pointer is what
 * reveals them here; the keyboard route into the sheet is the row suite's
 * subject.
 * @param harness - the suite's browser harness.
 * @param fixture - the registry the page boots against.
 * @returns the page, showing the open sheet.
 */
export async function openComposeSheet(harness: Harness, fixture: OneHostFixture = {}): Promise<Page> {
  const page = await openShellWithRoster(harness, fixture)
  await pressRowAction(page, 'row-message')
  await waitForSheet(page)
  return page
}

/**
 * Reveal the running row's own actions and press one.
 *
 * The row actions ride behind a hover where the pointer is fine, so the hover
 * is part of reaching the control rather than something each case restates.
 * Where the pointer is coarse the page paints them throughout — the harness
 * emulates `(hover: none)` for a touch context — and a hover would only move a
 * pointer the reader does not have.
 * @param page - the page showing the shell with its roster row visible.
 * @param name - the row action's marker, as the row draws it.
 * @param coarse - whether the pointer cannot hover, so nothing needs revealing.
 */
export async function pressRowAction(page: Page, name: string, coarse = false): Promise<void> {
  if (!coarse) await page.locator(FLEET_ROW).hover()
  await page.locator(`${FLEET_ROW} ${action(name)}`).click()
}

/**
 * Wait until the roster has seated the row every sibling suite reads.
 * @param page - the page showing the shell.
 */
export async function waitForRoster(page: Page): Promise<void> {
  await page.locator(FLEET_ROW).waitFor({ state: 'visible' })
}

/**
 * Open the shell at one designed width with that width's pointer.
 * @param harness - the suite's browser harness.
 * @param viewport - the designed width.
 * @param fixture - the registry the page boots against.
 * @param extra - palette and writing-direction overrides.
 */
export async function openShellAt(
  harness: Harness,
  viewport: Viewport,
  fixture: FleetFixture = {},
  extra?: OpenOptions,
): Promise<Page> {
  const page = await harness.open(fleet(fixture), {
    ...extra,
    ...pointerFlags(viewport),
    width: viewport.width,
    height: viewport.height,
  })
  await waitForLiveShell(page)
  await realizeView(page, viewport)
  return page
}
