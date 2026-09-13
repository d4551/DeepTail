/**
 * The doubles the transport suites share: the Tauri IPC, answered.
 *
 * Every hook the carrier hands the harness client ends in one Rust command, so
 * the whole surface is reachable by answering those commands from a double:
 * `@tauri-apps/api/core` is mocked at the module boundary, the double records
 * each invoke and answers it, and the mux frames are driven through the channel
 * callback the socket registers. Both suites read what was sent and what came
 * back from the same recorded state, reset between tests.
 *
 * @module
 */

import { mock } from 'bun:test'

/** The commands the carrier's Rust half answers. */
export type CarrierCommand =
  | 'carrier_close_mux'
  | 'carrier_fetch'
  | 'carrier_load_bundle'
  | 'carrier_open_mux'
  | 'carrier_send_mux'

/** The unary-call reply the Rust command returns across the IPC boundary. */
export interface CarrierReply {
  readonly status: number
  readonly headers: readonly (readonly [string, string])[]
  readonly body: string
}

/** The request the carrier builds for one unary call, as the double reads it back. */
interface FetchRequest {
  readonly path: string
  readonly method: string
  readonly headers: readonly (readonly [string, string])[]
  readonly body: string | null
}

/**
 * A mux frame as the wire carries it. The tag union is Rust's; the page names
 * a subset of it, so the double's wire also carries a tag the page does not.
 */
export type WireFrame =
  | { readonly type: 'open' }
  | { readonly type: 'message'; readonly data: string }
  | { readonly type: 'error'; readonly message: string }
  | { readonly type: 'close'; readonly code: number; readonly reason: string }
  | { readonly type: 'stranger' }

/** What the double recorded of one invoke, as the tests read it. */
export interface Invocation {
  readonly command: CarrierCommand
  readonly host?: string
  readonly request?: FetchRequest
  readonly path?: string
  readonly channel?: IpcChannel
  readonly data?: string
}

/** What watching one socket recorded. */
export interface Watched {
  /** The lifecycle event types, in the order they landed. */
  readonly events: string[]
  /** Reads the last close event, when one landed. */
  readonly close: () => CloseEvent | undefined
  /** Reads the last message event, when one landed. */
  readonly message: () => MessageEvent | undefined
}

/** Every invoke the carrier made, in order. */
export const invocations: Invocation[] = []

/** Every channel the carrier registered, in order. */
export const channels: IpcChannel[] = []

/** The reply the double answers `carrier_fetch` with. */
let fetchReply: CarrierReply = { status: 200, headers: [], body: '' }

/** The source the double answers `carrier_load_bundle` with. */
let bundleSource = 'void 0'

/** The refusal the double answers `carrier_load_bundle` with, when one is planted. */
let bundleRefusal: Error | undefined

/** The refusal the double answers `carrier_open_mux` with, when one is planted. */
let openMuxRefusal: Error | undefined

/** The refusal the double answers `carrier_send_mux` with, when one is planted. */
let sendMuxRefusal: Error | undefined

/** The refusal the double answers `carrier_close_mux` with, when one is planted. */
let closeMuxRefusal: Error | undefined

/** Answer one command with its value, or with the refusal a test planted. */
const settled = <T>(refusal: Error | undefined, value: T): Promise<T> =>
  refusal === undefined ? Promise.resolve(value) : Promise.reject(refusal)

/** The invoke double: it records the call and answers it the way the tests set. */
const invokeDouble = (command: CarrierCommand, args: Invocation): Promise<CarrierReply | string | undefined> => {
  invocations.push({ ...args, command })
  switch (command) {
    case 'carrier_fetch':
      return Promise.resolve(fetchReply)
    case 'carrier_load_bundle':
      return settled(bundleRefusal, bundleSource)
    case 'carrier_open_mux':
      return settled(openMuxRefusal, undefined)
    case 'carrier_send_mux':
      return settled(sendMuxRefusal, undefined)
    case 'carrier_close_mux':
      return settled(closeMuxRefusal, undefined)
  }
}

/** The channel double: it keeps the callback the socket registers, for tests to drive. */
export class IpcChannel {
  readonly #deliver: (frame: WireFrame) => void

  constructor(onmessage: (frame: WireFrame) => void) {
    this.#deliver = onmessage
    channels.push(this)
  }

  /** Deliver one frame from the mux wire. */
  receive(frame: WireFrame): void {
    this.#deliver(frame)
  }
}

mock.module('@tauri-apps/api/core', () => ({ invoke: invokeDouble, Channel: IpcChannel }))

/** The carrier module under test, imported after the boundary was mocked. */
export const transport = await import('../apps/deeptail/src/transport.ts')

/** The bundle helpers, loaded through the same mocked invoke graph. */
export const { bundleFromSettled, failBundleExecute } = await import('../apps/deeptail/src/transport-bundles.ts')

/**
 * Put the recorded state back the way a fresh process would find it: no
 * invocations, no channels, and an empty 200 for every unary call. A test that
 * needs a different reply plants one with `answerFetchWith`.
 */
export function resetTransportDouble(): void {
  invocations.length = 0
  channels.length = 0
  fetchReply = { status: 200, headers: [], body: '' }
  bundleSource = 'void 0'
  bundleRefusal = undefined
  openMuxRefusal = undefined
  sendMuxRefusal = undefined
  closeMuxRefusal = undefined
}

/**
 * Plant the reply the double answers `carrier_fetch` with.
 * @param reply - the reply the next unary calls read.
 */
export function answerFetchWith(reply: CarrierReply): void {
  fetchReply = reply
}

/** Plant the refusal the double answers `carrier_load_bundle` with. */
export function refuseBundleWith(refusal: Error): void {
  bundleRefusal = refusal
}

/** Plant the refusal the double answers `carrier_open_mux` with. */
export function refuseOpenMuxWith(refusal: Error): void {
  openMuxRefusal = refusal
}

/** Plant the refusal the double answers `carrier_send_mux` with. */
export function refuseSendMuxWith(refusal: Error): void {
  sendMuxRefusal = refusal
}

/** Plant the refusal the double answers `carrier_close_mux` with. */
export function refuseCloseMuxWith(refusal: Error): void {
  closeMuxRefusal = refusal
}

/** Lets the IPC promise chain land before the test asserts. */
export const tick = (): Promise<void> =>
  new Promise((done) => {
    setTimeout(done, 0)
  })

/**
 * Read one call's outcome as data: the Error it failed with.
 * @param work - the call expected to fail.
 * @returns the failure, or undefined when the call answered instead.
 */
export async function refusalOf<T>(work: Promise<T>): Promise<Error | undefined> {
  const [outcome] = await Promise.allSettled([work])
  return outcome.status === 'rejected' && outcome.reason instanceof Error ? outcome.reason : undefined
}

/**
 * How many times one command was invoked.
 * @param command - the command to count.
 * @returns the number of invocations recorded for it.
 */
export function countOf(command: CarrierCommand): number {
  return invocations.filter((invocation) => invocation.command === command).length
}

/**
 * Record a socket's lifecycle events as they land.
 * @param socket - the socket to watch.
 * @returns what the socket announced, read back as data.
 */
export function watch(socket: EventTarget): Watched {
  let closed: CloseEvent | undefined
  let received: MessageEvent | undefined
  const seen: Watched = { events: [], close: () => closed, message: () => received }
  socket.addEventListener('open', () => {
    seen.events.push('open')
  })
  socket.addEventListener('error', () => {
    seen.events.push('error')
  })
  socket.addEventListener('close', (event) => {
    if (event instanceof CloseEvent) closed = event
    seen.events.push('close')
  })
  socket.addEventListener('message', (event) => {
    if (event instanceof MessageEvent) received = event
  })
  return seen
}
