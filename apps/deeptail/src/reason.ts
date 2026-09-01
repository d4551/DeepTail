/**
 * How a rejection is turned into something an operator can read.
 *
 * Every surface that reports a failure needs this, and each of them used to
 * carry its own copy — eight of them, three behind different names. A message
 * shown to an operator is part of the product, so it is written once.
 *
 * @module
 */

/**
 * The message a failure should be reported with.
 * @param reason - whatever was thrown or rejected with.
 * @returns the text to show.
 */
export function messageOf(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason)
}
