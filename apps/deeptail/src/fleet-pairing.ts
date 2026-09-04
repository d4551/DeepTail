/**
 * Pairing, from what a viewer typed to the host the picker settles on.
 *
 * Two paths land here and only one field differs between them: a pasted link
 * carries its own origin, while a machine chosen from the tailnet already has
 * one and the viewer supplies the token alone. Composing the link here keeps
 * one pairing command rather than two.
 *
 * @module
 */

import type { HostRecord } from './host.ts'
import type { Translate } from './locales.ts'
import type { PairDraft } from './picker-pair-form.ts'
import { settled } from './picker-ports.ts'
import type { Phase } from './picker-screen.ts'
import { tailnetPairingLink } from './tailscale.ts'

/** What pairing needs from the running picker. */
export interface PairingRuntime {
  /** Pair one host. */
  pairHost(link: string, label: string): Promise<HostRecord>
  /** Copy source. */
  readonly t: Translate
  /** Move the picker to a phase and repaint. */
  toPhase(next: Phase): void
  /** Hand the paired host back and take the picker down. */
  finish(host: HostRecord): void
}

/**
 * The name a host is paired under: it has to be listed as something, so one
 * left blank is paired as "Harness".
 * @param typed - the name as typed.
 * @returns the label to pair with.
 */
function pairLabel(typed: string): string {
  const trimmed = typed.trim()
  return trimmed === '' ? 'Harness' : trimmed
}

/**
 * The pairing phase, carrying an origin only when there is one.
 *
 * Written as two literals rather than one with `origin: undefined`, because
 * `exactOptionalPropertyTypes` makes those different types and the absent case
 * is the one the paste path is in.
 * @param hosts - the roster the form was opened over.
 * @param draft - what the viewer typed.
 * @param busy - whether an attempt is in flight.
 * @param origin - the chosen machine's origin on the tailnet path.
 * @param error - the refusal to show, when there is one.
 * @returns the phase to move to.
 */
function pairingPhase(
  hosts: readonly HostRecord[],
  draft: PairDraft,
  busy: boolean,
  origin: string | undefined,
  error?: string,
): Phase {
  const base =
    error === undefined
      ? { kind: 'pairing' as const, hosts, busy, draft }
      : { kind: 'pairing' as const, hosts, busy, draft, error }
  return origin === undefined ? base : { ...base, origin }
}

/**
 * Why what was typed cannot be paired with, or undefined when it can.
 *
 * The browser refuses a malformed `type="url"` itself, in a bubble this product
 * neither wrote nor translated, and the submit never runs — so the form's own
 * strip stayed empty for exactly the paste that needed it. Constraint
 * validation is off and the refusal is written here.
 * @param typed - what the viewer typed, already trimmed: a link on the paste
 * path, a token on the tailnet path.
 * @param composed - the link the pairing command will parse.
 * @param origin - the chosen machine's origin on the tailnet path.
 * @param t - copy source.
 * @returns the refusal to show, or undefined.
 */
function pairRefusal(typed: string, composed: string, origin: string | undefined, t: Translate): string | undefined {
  if (typed === '') return origin === undefined ? t('error.linkRequired') : t('tailnet.tokenRequired')
  return URL.canParse(composed) ? undefined : t('error.linkInvalid')
}

/**
 * Pair the host the draft describes, and finish with it.
 *
 * Both refusals keep the typed draft in place, so a mistyped link is
 * corrected, not re-pasted.
 * @param run - what pairing needs from the picker.
 * @param hosts - the roster the form was opened over.
 * @param draft - what the viewer typed.
 * @param origin - the chosen machine's origin on the tailnet path.
 * @returns when the attempt has settled.
 */
export async function pairAndFinish(
  run: PairingRuntime,
  hosts: readonly HostRecord[],
  draft: PairDraft,
  origin?: string,
): Promise<void> {
  const { t } = run
  const typed = draft.link.trim()
  // On the tailnet path the machine is already chosen, so what was typed is the
  // token and the link is composed from it; on the paste path the link is what
  // was typed and there is nothing to compose.
  const link = origin === undefined ? typed : tailnetPairingLink(origin, typed)
  const refusal = pairRefusal(typed, link, origin, t)
  if (refusal !== undefined) {
    run.toPhase(pairingPhase(hosts, draft, false, origin, refusal))
    return
  }
  run.toPhase(pairingPhase(hosts, draft, true, origin))
  const added = await settled(run.pairHost(link, pairLabel(draft.label)))
  if (!added.ok) {
    run.toPhase(pairingPhase(hosts, draft, false, origin, t('error.pairFailed', { message: added.message })))
    return
  }
  run.finish(added.value)
}
