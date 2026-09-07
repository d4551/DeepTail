/**
 * The unary answer the native carrier returns, read rather than asserted.
 *
 * Every remote call the product makes passes through this shape. Until this
 * module existed the answer was asserted by the invoke call's own type
 * argument: a reply short its headers reached `.map` on nothing, and one
 * carrying a status outside the range `Response` accepts threw from the
 * constructor. Both arrived as a failure from inside the transport rather than
 * as the protocol failure they are.
 *
 * Split from `transport.ts`, which holds the socket and the fetch itself, when
 * that file reached the size a source file here may hold.
 *
 * @module
 */

import type { JsonValue } from '@deepseek-ai/dsh-util-values'
import { isWireObject, type WireObject, type WireValue } from './wire.ts'

/**
 * The response shape the Rust unary-call command returns across the IPC
 * boundary.
 *
 * A type alias rather than an interface, for the reason `SessionSummary` is
 * one: an alias carries the implicit index signature that lets a value of this
 * shape travel as a wire value.
 */
export type CarrierResponse = {
  readonly status: number
  readonly headers: readonly (readonly [string, string])[]
  readonly body: string
}

/** The lowest and highest status `Response` will accept. */
const STATUS_FLOOR = 200
const STATUS_CEILING = 599

/** The fields a carrier response must carry, as the wire object they are read from. */
interface CarrierResponseWire extends WireObject {
  readonly status?: JsonValue
  readonly headers?: JsonValue
  readonly body?: JsonValue
}

/**
 * The header pairs a carrier answer carries, or nothing when one is not a pair.
 * @param headers - the header list, as the carrier serialised it.
 * @returns the pairs, or undefined when the list is not one of them.
 */
function readHeaderPairs(headers: JsonValue): [string, string][] | undefined {
  if (!Array.isArray(headers)) return undefined
  const pairs: [string, string][] = []
  for (const pair of headers) {
    if (!Array.isArray(pair) || pair.length !== 2) return undefined
    const [name, held] = pair
    if (typeof name !== 'string' || typeof held !== 'string') return undefined
    pairs.push([name, held])
  }
  return pairs
}

/**
 * The response a carrier answered with, or nothing when it answered one this
 * transport cannot return.
 *
 * The shape is built rather than claimed, so what the caller holds is the
 * pairs this reader checked one at a time.
 * @param value - whatever the native carrier answered with.
 * @returns the response, or undefined when the answer is not one.
 */
export function readCarrierResponse<T>(value: T | WireValue): CarrierResponse | undefined {
  if (!isWireObject(value)) return undefined
  const reply: CarrierResponseWire = value
  const { status, headers, body } = reply
  if (typeof status !== 'number' || !Number.isInteger(status)) return undefined
  if (status < STATUS_FLOOR || status > STATUS_CEILING) return undefined
  if (typeof body !== 'string') return undefined
  const pairs = headers === undefined ? undefined : readHeaderPairs(headers)
  return pairs === undefined ? undefined : { status, headers: pairs, body }
}
