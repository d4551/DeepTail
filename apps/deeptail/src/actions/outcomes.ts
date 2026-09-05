/**
 * What an interaction ends with, and what the operator is told about it.
 *
 * Every action answers with one of five outcomes, and each of them has a
 * sentence in the operator's own language:
 *
 * - `executed` — the work ran.
 * - `denied` — the capability was not there to spend.
 * - `invalid` — what was supplied, or what the host answered, could not be
 *   acted on.
 * - `unavailable` — the control's own precondition does not hold.
 * - `unwired` — nothing is connected that this action could act on.
 *
 * The maps below are `Record`s over closed unions, so a reason added to one
 * without its sentence is a compile error rather than a control that answers in
 * English inside a Chinese window.
 *
 * @module
 */

import type { DenialReason } from '../capabilities/grants.ts'
import type { PickerKey, Translate } from '../locales.ts'

/** Why a control is not offered at all. */
export type UnavailableReason = 'no-hosts' | 'no-active-host' | 'not-running' | 'not-unauthorized' | 'no-tailnet'

/** Why what was supplied could not be acted on. */
export type InvalidReason = 'no-host' | 'no-session' | 'empty-message' | 'incomplete-credential' | 'host-refused'

/** The invalid reasons this product writes the sentence for itself. */
export type RefusedReason = Exclude<InvalidReason, 'host-refused'>

/** What the action reached for that this page has nothing to run it on. */
export type UnwiredReason = 'no-booted-client' | 'no-tailnet-credential' | 'no-host'

/** The five answers an interaction can end with. */
export type ActionOutcome =
  | { readonly kind: 'executed'; readonly traceId: string; readonly announce?: string }
  | { readonly kind: 'denied'; readonly traceId: string; readonly reason: DenialReason }
  | { readonly kind: 'invalid'; readonly traceId: string; readonly reason: RefusedReason }
  | { readonly kind: 'invalid'; readonly traceId: string; readonly reason: 'host-refused'; readonly message: string }
  | { readonly kind: 'unavailable'; readonly traceId: string; readonly reason: UnavailableReason }
  | { readonly kind: 'unwired'; readonly traceId: string; readonly reason: UnwiredReason }

/** What a handler itself decided, before the dispatcher wrapped it. */
export type ActionEffect =
  | { readonly kind: 'executed'; readonly announce?: string }
  | { readonly kind: 'invalid'; readonly reason: RefusedReason }
  | { readonly kind: 'invalid'; readonly reason: 'host-refused'; readonly message: string }
  | { readonly kind: 'unwired'; readonly reason: UnwiredReason }

/** The sentence each denial reason is told with. */
const DENIAL_KEYS: Record<DenialReason, PickerKey> = {
  'no-grant': 'denial.none',
  expired: 'denial.expired',
  'stale-revision': 'denial.stale',
  'subject-mismatch': 'denial.subject',
  'context-changed': 'denial.context',
  'malformed-hydration': 'denial.malformed',
  'not-issued-natively': 'denial.native',
}

/** The sentence each unavailable reason is told with. */
const UNAVAILABLE_KEYS: Record<UnavailableReason, PickerKey> = {
  'no-hosts': 'unavailable.noHosts',
  'no-active-host': 'unavailable.noActiveHost',
  'not-running': 'unavailable.notRunning',
  'not-unauthorized': 'unavailable.notUnauthorized',
  'no-tailnet': 'unavailable.noTailnet',
}

/** The sentence each invalid reason is told with. */
const INVALID_KEYS: Record<RefusedReason, PickerKey> = {
  'no-host': 'invalid.noHost',
  'no-session': 'invalid.noSession',
  'empty-message': 'chat.messageRequired',
  'incomplete-credential': 'tailnet.incomplete',
}

/** The sentence each unwired reason is told with. */
const UNWIRED_KEYS: Record<UnwiredReason, PickerKey> = {
  'no-booted-client': 'unwired.noClient',
  'no-tailnet-credential': 'unwired.noTailnet',
  'no-host': 'unwired.noHost',
}

/**
 * The sentence an outcome is shown with.
 *
 * Every arm has one, including `executed` with nothing to announce: a surface
 * that has to invent a branch for "and otherwise" is a surface that can do one
 * thing and say another.
 * @param outcome - what the dispatcher answered.
 * @param t - copy source.
 * @returns the copy, or undefined when the outcome has nothing to say.
 */
export function outcomeCopy(outcome: ActionOutcome, t: Translate): string | undefined {
  switch (outcome.kind) {
    case 'executed':
      return outcome.announce
    case 'denied':
      return `${t(DENIAL_KEYS[outcome.reason])} ${t('denial.trace', { trace: outcome.traceId })}`
    case 'invalid':
      return outcome.reason === 'host-refused' ? outcome.message : t(INVALID_KEYS[outcome.reason])
    case 'unavailable':
      return t(UNAVAILABLE_KEYS[outcome.reason])
    case 'unwired':
      return t(UNWIRED_KEYS[outcome.reason])
  }
}
