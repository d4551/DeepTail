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
 * being carried as the `{message}` of a localized one.
 * @param reason - whatever was thrown or rejected with.
 * @returns the text to show.
 */
export function messageOf(reason: unknown): string {
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
export function describeFailure(reason: unknown, t: Translate): string {
  if (!(reason instanceof RemoteError)) return messageOf(reason)
  const key = TRANSPORT_KEYS[reason.code]
  if (key === undefined) return reason.message
  return t(key, {
    endpoint: String(reason.details.endpoint ?? ''),
    status: String(reason.details.status ?? ''),
    detail: String(reason.details.detail ?? reason.message),
  })
}
