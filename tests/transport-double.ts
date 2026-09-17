/**
 * The doubles the transport suites share: the Tauri runtime, answered.
 *
 * Every hook the carrier hands the harness client ends in one Rust command, so
 * the whole surface is reachable by answering those commands: `tauri-runtime.ts`
 * holds the runtime object the page calls, and this module is what the suites
 * import — the carrier under test, the recorded state, and the readers a case
 * asserts through.
 *
 * There is no substitution at the module boundary. Tauri's own `invoke` is
 * bound to the runtime object a webview carries, so the copy the product
 * modules called is the copy under test however Bun orders the suites of one
 * process.
 *
 * @module
 */

export {
  answerFetchWith,
  callbackRegistrations,
  channels,
  invocations,
  type OpenChannel,
  refuseBundleWith,
  refuseCloseMuxWith,
  refuseOpenMuxWith,
  refuseSendMuxWith,
  resetTransportDouble,
} from './tauri-runtime.ts'

/** Every command the carrier's Rust half answers, and what one call recorded. */
export type { CarrierCommand, Invocation } from './tauri-script.ts'

import {
  type CarrierCommand,
  channels,
  countOf as countIn,
  installTauriRuntime,
  type OpenChannel,
} from './tauri-runtime.ts'

/**
 * How many times one command was invoked.
 * @param command - the command to count.
 * @returns the number of invocations recorded for it.
 */
export function countOf(command: CarrierCommand): number {
  return countIn(command)
}

/**
 * The first channel the page opened, which is the mux socket of the carrier a
 * case just built.
 *
 * A case that reaches for it before the carrier has opened one is a case whose
 * setup did not happen, so the absence is named here rather than surfacing as
 * a failure to read a property of nothing.
 * @returns the channel.
 */
export function muxChannel(): OpenChannel {
  const [only] = channels
  if (only === undefined) throw new Error('deeptail: the carrier opened no mux channel')
  return only
}

/**
 * The transport host the product module graph resolves against.
 *
 * Imported through the real `@tauri-apps/api/core`, which reads the runtime
 * object this module installs. A fresh process installs it before any suite
 * runs, so the first case of the first file to load this module is answered as
 * well as the last.
 */
export const transport = await import('../apps/deeptail/src/transport.ts')

/** The bundle helpers, loaded through the same runtime. */
export const { bundleFromSettled, failBundleExecute } = await import('../apps/deeptail/src/transport-bundles.ts')

/**
 * Lets the IPC promise chain land before the test asserts.
 * @returns a promise that settles once the chain has run.
 */
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

/** What watching one socket recorded. */
export interface Watched {
  /** The lifecycle event types, in the order they landed. */
  readonly events: string[]
  /** Reads the last close event, when one landed. */
  readonly close: () => CloseEvent | undefined
  /** Reads the last message event, when one landed. */
  readonly message: () => MessageEvent | undefined
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

installTauriRuntime()
