/**
 * The native commands this double answers, and what each one answers with.
 *
 * Split from `tauri-runtime.ts`, which installs the runtime object: this half
 * is the script — the command names the carrier's Rust half declares, the
 * shapes those commands answer with, and the refusals a case can plant in place
 * of an answer. Keeping the script apart from the runtime is what lets either
 * be read on its own, and keeps each module under the size the repository
 * holds every file to.
 *
 * @module
 */

import { fieldOf, isWireObject, type JsonValue, type WireObject, type WireValue } from '../apps/deeptail/src/wire.ts'

/** Every command the carrier's Rust half answers. */
export type CarrierCommand =
  | 'carrier_close_mux'
  | 'carrier_fetch'
  | 'carrier_load_bundle'
  | 'carrier_open_mux'
  | 'carrier_send_mux'

/**
 * A mux frame as the wire carries it.
 *
 * The tag union is Rust's; the page names a subset of it, so the double's wire
 * also carries a tag the page does not. Every field is present and a frame that
 * does not carry one carries `null`, because this is the value a channel is
 * handed and the runtime hands a channel a wire value: a member that is merely
 * absent is not one.
 */
export interface WireFrame {
  readonly [field: string]: JsonValue
  readonly type: 'open' | 'message' | 'error' | 'close' | 'stranger'
  readonly data: string | null
  readonly message: string | null
  readonly code: number | null
  readonly reason: string | null
}

/**
 * The unary-call reply the Rust command returns across the IPC boundary.
 *
 * Carries the index signature the wire model has, because this is a value the
 * double answers a command with: a shape with a fixed set of fields and no
 * index signature is not a wire value.
 */
export interface CarrierReply {
  readonly [field: string]: JsonValue
  readonly status: number
  readonly headers: JsonValue
  readonly body: string
}

/**
 * One header pair, as the request carries it.
 *
 * Named here rather than written out at the field: the pair is the unit the
 * boundary speaks in, and naming it keeps the shape in one place if it moves.
 */
type HeaderPair = readonly [string, string]

/** The request the carrier builds for one unary call, as the double reads it back. */
export interface FetchRequest {
  readonly path: string
  readonly method: string
  readonly headers: readonly HeaderPair[]
  readonly body: string | null
}

/** What the double recorded of one invoke, as the tests read it. */
export interface Invocation {
  readonly command: string
  readonly host?: string
  readonly request?: FetchRequest
  readonly path?: string
  /** The identifier the channel was handed to the backend under. */
  readonly channel?: string
  readonly data?: string
}

/** One command as the page sent it: the name, and the arguments beside it. */
export interface Call {
  readonly command: string
  readonly args: WireObject
}

/** The reply the script answers `carrier_fetch` with. */
let fetchReply: CarrierReply = { status: 200, headers: [], body: '' }

/** The source the script answers `carrier_load_bundle` with. */
let bundleSource = 'void 0'

/** The refusal the script answers `carrier_load_bundle` with, when one is planted. */
let bundleRefusal: Error | undefined

/** The refusal the script answers `carrier_open_mux` with, when one is planted. */
let openMuxRefusal: Error | undefined

/** The refusal the script answers `carrier_send_mux` with, when one is planted. */
let sendMuxRefusal: Error | undefined

/** The refusal the script answers `carrier_close_mux` with, when one is planted. */
let closeMuxRefusal: Error | undefined

/** Read one argument by field, which is the only way a wire value is read. */
export const argOf = (call: Call, field: string): WireValue => fieldOf(call.args, field)

/** Read one argument that has to be a string. */
export const stringArgOf = (call: Call, field: string): string | undefined => {
  const read = argOf(call, field)
  return typeof read === 'string' ? read : undefined
}

/**
 * Read the request the carrier named, field by field: an argument that is not
 * the shape the command declares is a call this script will not answer, and
 * saying so is what keeps a broken carrier from reading as an unrecorded one.
 * @param call - the call, as the runtime received it.
 * @returns the request, or undefined when the call named none.
 */
export function requestOf(call: Call): FetchRequest | undefined {
  const held = argOf(call, 'request')
  if (!isWireObject(held)) return undefined
  const path = fieldOf(held, 'path')
  const method = fieldOf(held, 'method')
  const body = fieldOf(held, 'body')
  const headers: [string, string][] = []
  const listed = fieldOf(held, 'headers')
  if (Array.isArray(listed)) {
    for (const pair of listed) {
      if (!Array.isArray(pair)) continue
      const [name, value] = pair
      if (typeof name === 'string' && typeof value === 'string') headers.push([name, value])
    }
  }
  return {
    path: typeof path === 'string' ? path : '',
    method: typeof method === 'string' ? method : '',
    headers,
    body: typeof body === 'string' ? body : null,
  }
}

/** Answer one command with its value, or with the refusal a case planted. */
const settled = <T>(refusal: Error | undefined, value: T): Promise<T> =>
  refusal === undefined ? Promise.resolve(value) : Promise.reject(refusal)

/**
 * The answer one command carries, as the script currently stands.
 *
 * A command this double does not know is refused rather than answered with
 * nothing: a carrier that sent one is a carrier talking to Rust this script
 * does not stand in for, and a silent `undefined` would read as a command that
 * answered.
 * @param command - the command the page invoked.
 * @returns the answer.
 */
export function answerTo(command: string): Promise<WireValue> {
  switch (command) {
    case 'carrier_fetch':
      return Promise.resolve<WireValue>(fetchReply)
    case 'carrier_load_bundle':
      return settled(bundleRefusal, bundleSource)
    case 'carrier_open_mux':
      return settled(openMuxRefusal, undefined)
    case 'carrier_send_mux':
      return settled(sendMuxRefusal, undefined)
    case 'carrier_close_mux':
      return settled(closeMuxRefusal, undefined)
    default:
      return Promise.reject(new Error(`deeptail: no carrier is scripted for ${command}`))
  }
}

/**
 * Plant the reply the script answers `carrier_fetch` with.
 * @param reply - the reply the next unary calls read.
 */
export function answerFetchWith(reply: CarrierReply): void {
  fetchReply = reply
}

/** Plant the refusal the script answers `carrier_load_bundle` with. */
export function refuseBundleWith(refusal: Error): void {
  bundleRefusal = refusal
}

/** Plant the refusal the script answers `carrier_open_mux` with. */
export function refuseOpenMuxWith(refusal: Error): void {
  openMuxRefusal = refusal
}

/** Plant the refusal the script answers `carrier_send_mux` with. */
export function refuseSendMuxWith(refusal: Error): void {
  sendMuxRefusal = refusal
}

/** Plant the refusal the script answers `carrier_close_mux` with. */
export function refuseCloseMuxWith(refusal: Error): void {
  closeMuxRefusal = refusal
}

/**
 * How many times one command was invoked.
 * @param recorded - every invoke the runtime has recorded, in order.
 * @param command - the command to count.
 * @returns the number of invocations recorded for it.
 */
export function countOf(recorded: readonly Invocation[], command: CarrierCommand): number {
  return recorded.filter((invocation) => invocation.command === command).length
}

/** Put every planted answer and refusal back the way a fresh process finds them. */
export function resetScript(): void {
  fetchReply = { status: 200, headers: [], body: '' }
  bundleSource = 'void 0'
  bundleRefusal = undefined
  openMuxRefusal = undefined
  sendMuxRefusal = undefined
  closeMuxRefusal = undefined
}
