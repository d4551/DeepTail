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
import { type PairDraft, type PairingState, pairView } from './picker-pair-form.ts'
import { emptyView, failedView, listView, loadingView, type PickerContext } from './picker-views.ts'
import { el } from './ui/dom.ts'

/**
 * What the picker is doing. An empty list is only empty once `ready` — until
 * then it reads as loading, so a cold start never flashes "no hosts".
 */
export type Phase =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly hosts: readonly HostRecord[] }
  | { readonly kind: 'failed'; readonly message: string }
  | ({ readonly kind: 'pairing' } & PairingState)

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

  const live = el('div', { className: 'visually-hidden' })
  live.setAttribute('role', 'status')
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
      return [loadingView(ctx.t)]
    case 'failed':
      return [failedView(ctx.t, phase.message, actions.reload)]
    case 'ready':
      return phase.hosts.length === 0
        ? emptyView(ctx.t, () => {
            actions.beginPairing([])
          })
        : listView({ ...ctx, hosts: phase.hosts, pick: actions.choose, startPairing: actions.beginPairing })
    case 'pairing':
      return pairView({ ...ctx, current: phase, submit: actions.submitPairing, cancel: actions.cancelPairing })
    default:
      throw new Error('deeptail: unreachable picker phase')
  }
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
}
