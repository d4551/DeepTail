/**
 * The tailnet half of the picker's engine: connecting a tailnet, listing it,
 * and handing one machine to the pairing form.
 *
 * Separated from `./fleet.ts` for the reason the views are separated from the
 * phase machine — this is the only part that talks to Tailscale, and the only
 * part that decides what a refusal from Tailscale means for the screen.
 *
 * @module
 */

import type { HostRecord } from './host.ts'
import type { Translate } from './locales.ts'
import { settled } from './picker-ports.ts'
import type { Phase } from './picker-screen.ts'
import { credentialOf, draftIsComplete, EMPTY_TAILNET_DRAFT, type TailnetDraft } from './picker-tailnet.ts'
import type { TailnetHost, TailnetPorts } from './tailscale.ts'

/** What the tailnet flow needs from the running picker. */
export interface TailnetRuntime {
  /** How the tailnet is reached. */
  readonly tailnet: TailnetPorts
  /** Copy source. */
  readonly t: Translate
  /** Move the picker to a phase and repaint. */
  toPhase(next: Phase): void
}

/** The tailnet to list, or undefined for the one the credential belongs to. */
function tailnetName(draft: TailnetDraft): string | undefined {
  const trimmed = draft.tailnet.trim()
  return trimmed === '' ? undefined : trimmed
}

/**
 * Open the tailnet.
 *
 * A stored credential goes straight to the machines; without one the connect
 * form opens instead. A stored credential that has since been revoked lands
 * back on the form carrying Tailscale's own refusal, which is the only thing
 * that distinguishes it from an empty tailnet.
 * @param run - the tailnet flow's runtime.
 * @param hosts - the roster this was opened over.
 * @returns when the tailnet has been read or the form is up.
 */
export async function openTailnet(run: TailnetRuntime, hosts: readonly HostRecord[]): Promise<void> {
  const stored = await settled(run.tailnet.connected())
  if (!stored.ok || !stored.value) {
    run.toPhase({ kind: 'tailnetConnect', hosts, busy: false, draft: EMPTY_TAILNET_DRAFT })
    return
  }
  const read = await settled(run.tailnet.devices())
  if (!read.ok) {
    run.toPhase({
      kind: 'tailnetConnect',
      hosts,
      busy: false,
      draft: EMPTY_TAILNET_DRAFT,
      error: run.t('tailnet.listFailed', { message: read.message }),
    })
    return
  }
  run.toPhase({ kind: 'tailnet', hosts, devices: read.value })
}

/**
 * Connect the tailnet the draft describes, and list it.
 *
 * The native side proves the credential by listing before it stores anything,
 * so a refusal here means nothing was written and the form can simply be shown
 * again with what was typed.
 * @param run - the tailnet flow's runtime.
 * @param hosts - the roster the form was opened over.
 * @param draft - what the viewer typed.
 * @returns when the attempt has settled.
 */
export async function connectTailnet(
  run: TailnetRuntime,
  hosts: readonly HostRecord[],
  draft: TailnetDraft,
): Promise<void> {
  if (!draftIsComplete(draft)) {
    run.toPhase({ kind: 'tailnetConnect', hosts, busy: false, draft, error: run.t('tailnet.incomplete') })
    return
  }
  run.toPhase({ kind: 'tailnetConnect', hosts, busy: true, draft })
  const listed = await settled(run.tailnet.connect(credentialOf(draft), tailnetName(draft)))
  if (!listed.ok) {
    const error = run.t('tailnet.connectFailed', { message: listed.message })
    run.toPhase({ kind: 'tailnetConnect', hosts, busy: false, draft, error })
    return
  }
  run.toPhase({ kind: 'tailnet', hosts, devices: listed.value })
}

/**
 * Drop the stored credential and return to the roster.
 *
 * Paired hosts are untouched: each holds its own device token and none of them
 * was ever reached through this credential.
 * @param run - the tailnet flow's runtime.
 * @param hosts - the roster to return to.
 * @returns when the credential is gone.
 */
export async function forgetTailnet(run: TailnetRuntime, hosts: readonly HostRecord[]): Promise<void> {
  await settled(run.tailnet.forget())
  run.toPhase({ kind: 'ready', hosts })
}

/**
 * The pairing phase for one machine chosen from the tailnet.
 *
 * The machine's own hostname is the name it is filed under unless the viewer
 * changes it, and the origin travels with the phase so the form asks for a
 * token rather than a URL.
 * @param hosts - the roster this was opened over.
 * @param device - the machine chosen.
 * @returns the phase to move to.
 */
export function tailnetPairingPhase(hosts: readonly HostRecord[], device: TailnetHost): Phase {
  return {
    kind: 'pairing',
    hosts,
    busy: false,
    origin: device.origin,
    draft: { link: '', label: device.label },
  }
}
