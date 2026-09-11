/**
 * How a rejection is turned into something an operator can read.
 *
 * Every surface that reports a failure needs this, and each of them used to
 * carry its own copy — eight of them, three behind different names. A message
 * shown to an operator is part of the product, so it is written once.
 *
 * @module
 */

import { FORBIDDEN, PROTOCOL, RemoteError, TRANSPORT, UNAUTHORIZED } from './api.ts'
import type { PickerKey, Translate } from './locales.ts'

/**
 * The message a failure should be reported with.
 *
 * The raw text, for a caller that has no copy source — a log line, or a message
 * being carried as the `{message}` of a localized one. A rejection can be
 * raised by anything this product calls, so the parameter is generic — a catch
 * clause cannot annotate its variable — and is narrowed here, once, by
 * `instanceof`, instead of at every catch.
 * @param reason - whatever was thrown or rejected with.
 * @returns the text to show.
 */
export function messageOf<T>(reason: T): string {
  return reason instanceof Error ? reason.message : String(reason)
}

/** The dictionary key each transport-level failure is reported through. */
const TRANSPORT_KEYS: Readonly<Record<string, PickerKey>> = {
  [UNAUTHORIZED]: 'error.http',
  [FORBIDDEN]: 'error.http',
  [PROTOCOL]: 'error.protocol',
  [TRANSPORT]: 'error.transport',
}

/**
 * The localized message a failure should be reported with.
 *
 * The transport writes its failures in the protocol's own terms — an endpoint,
 * a status — and those reached the operator verbatim, so a host returning 500
 * showed `session/list returned HTTP 500` whatever language the product was in.
 * The code is what selects the sentence; the endpoint and status fill it.
 *
 * A failure the host itself raised keeps the host's own message: it is the only
 * account of what went wrong, and this product has no dictionary for it.
 * @param reason - whatever was thrown or rejected with.
 * @param t - copy source.
 * @returns the text to show.
 */
export function describeFailure<T>(reason: T, t: Translate): string {
  if (!(reason instanceof RemoteError)) return messageOf(reason)
  const key = TRANSPORT_KEYS[reason.code]
  if (key === undefined) return reason.message
  return t(key, {
    endpoint: typeof reason.details.endpoint === 'string' ? reason.details.endpoint : '',
    status: typeof reason.details.status === 'number' ? reason.details.status : '',
    detail: typeof reason.details.detail === 'string' ? reason.details.detail : reason.message,
  })
}

/**
 * Let a fire-and-forget promise land, reporting its failure in the operator's
 * language.
 *
 * The surfaces that kick work without awaiting it still owe the operator an
 * account when that work fails, and each used to spell that account out at the
 * call site. This is the one place a rejection is turned into copy for them.
 * @param work - the promise to let settle.
 * @param t - copy source.
 * @param report - where the failure message lands.
 */
export function reportSettled<T>(work: Promise<T>, t: Translate, report: (message: string) => void): void {
  work.then(undefined, (reason: T) => report(describeFailure(reason, t)))
}

/** The settled outcome of work: landed, or failed with the operator's copy. */
export type Outcome = { readonly ok: true } | { readonly ok: false; readonly message: string }

/**
 * Await work with its failure settled into copy, so a caller branches on an
 * outcome instead of catching or chaining arms.
 *
 * The surfaces that stay interactive through a mutation need the failure as a
 * message, not as a thrown value; this hands both arms back as one value.
 * @param work - the promise to settle.
 * @param t - copy source.
 * @returns landed, or the localized failure message.
 */
export function settle<T>(work: Promise<T>, t: Translate): Promise<Outcome> {
  return work.then(
    (): Outcome => ({ ok: true }),
    (reason: T): Outcome => ({ ok: false, message: describeFailure(reason, t) }),
  )
}
