/**
 * Which of the picker's views is on screen, and how the card is painted for it.
 *
 * A phase plus the copy to draw it with is the whole of a picker screen, so
 * painting never has to reach back into the work that produced the phase. What
 * a drawn control does is handed in as commands, which is what keeps the paint
 * one-directional.
 *
 * @module
 */

import type { HostRecord } from './host.ts'
import type { PickerKey } from './locales.ts'
import { type PairDraft, type PairingState, pairView } from './picker-pair-form.ts'
import { type TailnetConnectState, type TailnetDraft, tailnetConnectView } from './picker-tailnet.ts'
import { type TailnetListState, tailnetListView } from './picker-tailnet-list.ts'
import { emptyView, listView, type PickerContext } from './picker-views.ts'
import type { TailnetHost } from './tailscale.ts'
import { el, liveRegion } from './ui/dom.ts'
import { loadingRow, retryStrip } from './ui/states.ts'

/**
 * What the picker is doing. An empty list is only empty once `ready` — until
 * then it reads as loading, so a cold start never flashes "no hosts".
 */
export type Phase =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly hosts: readonly HostRecord[] }
  | { readonly kind: 'failed'; readonly message: string }
  | ({ readonly kind: 'pairing' } & PairingState)
  | ({ readonly kind: 'tailnetConnect' } & TailnetConnectState)
  | ({ readonly kind: 'tailnet' } & TailnetListState)

/** What a painted control asks the picker to do. */
export interface PickerActions {
  /** Read the roster again. */
  reload(): void
  /** Open the pairing form over a roster. */
  beginPairing(hosts: readonly HostRecord[]): void
  /** Leave the pairing form for the roster it was opened over. */
  cancelPairing(hosts: readonly HostRecord[]): void
  /** Pair the host the draft describes. */
  submitPairing(hosts: readonly HostRecord[], draft: PairDraft): void
  /** Settle on a host and hand it back. */
  choose(host: HostRecord): void
  /** Open the tailnet: its machine list, or the form that connects one. */
  beginTailnet(hosts: readonly HostRecord[]): void
  /** Connect the tailnet the draft describes. */
  submitTailnet(hosts: readonly HostRecord[], draft: TailnetDraft): void
  /** Redraw the connect form for a different credential kind. */
  switchTailnetKind(hosts: readonly HostRecord[], draft: TailnetDraft): void
  /** Leave the tailnet for the roster it was opened over. */
  cancelTailnet(hosts: readonly HostRecord[]): void
  /** Drop the stored tailnet credential and return to the roster. */
  forgetTailnet(hosts: readonly HostRecord[]): void
  /** Open the pairing form for one machine chosen from the tailnet. */
  pairTailnetDevice(hosts: readonly HostRecord[], device: TailnetHost): void
}

/** The lasting parts of the picker, which every phase is painted between. */
export interface PickerFrame {
  /** The card each view is drawn into. */
  readonly card: HTMLElement
  /** Announces state changes without stealing focus. */
  readonly live: HTMLElement
}

/**
 * Take over a mount point and build the picker's frame in it.
 *
 * The mount point is claimed wholesale so nothing an earlier screen left
 * behind can outlive the picker.
 * @param container - the mount point.
 * @returns the card to paint into and the region to announce through.
 */
export function mountPickerFrame(container: HTMLElement): PickerFrame {
  const root = el('main', { className: 'picker' })
  root.dataset.deeptailPicker = ''
  const card = el('div', { className: 'card' })
  root.append(card)
  container.replaceChildren(root)

  const live = liveRegion()
  return { card, live }
}

/**
 * The views one phase draws, wired to the commands their controls invoke.
 * @param phase - what the picker is doing.
 * @param ctx - the copy and reachability every view reads.
 * @param actions - what the drawn controls invoke.
 * @returns the views, in the order they are laid out.
 */
function phaseViews(phase: Phase, ctx: PickerContext, actions: PickerActions): HTMLElement[] {
  switch (phase.kind) {
    case 'loading':
      return [loadingRow(ctx.t, 'status.loading')]
    case 'failed':
      return [retryStrip('error', phase.message, ctx.t('action.retry'), actions.reload)]
    case 'ready':
      return phase.hosts.length === 0
        ? emptyView(
            ctx.t,
            () => {
              actions.beginPairing([])
            },
            () => {
              actions.beginTailnet([])
            },
          )
        : listView({
            ...ctx,
            hosts: phase.hosts,
            pick: actions.choose,
            startPairing: actions.beginPairing,
            startTailnet: actions.beginTailnet,
          })
    case 'pairing':
      return pairView({ ...ctx, current: phase, submit: actions.submitPairing, cancel: actions.cancelPairing })
    case 'tailnetConnect':
      return tailnetConnectView({
        ...ctx,
        current: phase,
        submit: actions.submitTailnet,
        cancel: actions.cancelTailnet,
        switchKind: actions.switchTailnetKind,
      })
    case 'tailnet':
      return tailnetListView({
        ...ctx,
        current: phase,
        pair: actions.pairTailnetDevice,
        open: actions.choose,
        cancel: actions.cancelTailnet,
        forget: actions.forgetTailnet,
      })
    default:
      return assertNever(phase)
  }
}

/**
 * Refuse a phase the union does not have.
 *
 * `Phase` is closed, so this is a compile error the moment an arm is added and
 * not drawn — which is what a runtime throw could only report after shipping,
 * and what no test could ever cover.
 * @param phase - the phase no arm matched.
 * @returns never.
 */
function assertNever(phase: never): never {
  throw new Error(`deeptail: unreachable picker phase ${JSON.stringify(phase)}`)
}

/** What each phase announces when the picker settles into it. */
const PHASE_NOTICES: Readonly<Record<Phase['kind'], PickerKey | undefined>> = {
  loading: 'status.loading',
  ready: undefined,
  failed: undefined,
  pairing: 'pair.title',
  tailnetConnect: 'tailnet.connectTitle',
  tailnet: 'tailnet.listTitle',
}

/**
 * What the picker says when it settles into a phase.
 *
 * Only the loading phase ever wrote to the live region, so a roster settling
 * from "Loading hosts…" into a list of three announced nothing at all. A phase
 * that carries its own `role="alert"` strip is already spoken by it and says
 * nothing twice.
 * @param phase - the phase the picker moved to.
 * @param ctx - the copy and reachability every view reads.
 * @returns the text to announce, or the empty string for a phase that speaks
 * for itself.
 */
function phaseNotice(phase: Phase, ctx: PickerContext): string {
  if (phase.kind === 'ready') {
    return phase.hosts.length === 0 ? ctx.t('status.empty') : ctx.t('sessions.count', { count: phase.hosts.length })
  }
  const key = PHASE_NOTICES[phase.kind]
  return key === undefined ? '' : ctx.t(key)
}

/**
 * Repaint the card for one phase.
 *
 * The live region is laid down again with every phase so an announcement is
 * never lost to the swap that follows it.
 * @param frame - the card to repaint and the region to keep mounted.
 * @param phase - what the picker is doing.
 * @param ctx - the copy and reachability every view reads.
 * @param actions - what the drawn controls invoke.
 * @returns nothing.
 */
export function paintScreen(frame: PickerFrame, phase: Phase, ctx: PickerContext, actions: PickerActions): void {
  frame.card.replaceChildren(
    el('h1', { className: 'wordmark', text: ctx.t('app.name') }),
    ...phaseViews(phase, ctx, actions),
    frame.live,
  )
  frame.live.textContent = phaseNotice(phase, ctx)
}
