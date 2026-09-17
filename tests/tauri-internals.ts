/**
 * The shape of the Tauri boundary, read off the product's own calls.
 *
 * The runtime object a webview carries is the whole of the boundary the product
 * uses, and every type here describes one side of it: what `invoke` accepts and
 * answers, how a channel registers, and what the backend hands a callback. The
 * behaviour that answers the boundary lives in `tauri-runtime.ts`; this module
 * holds only the declarations, so a reader of either finds one thing in one
 * place.
 *
 * @module
 */

import type { invoke } from '../apps/deeptail/src/ipc.ts'
import type { JsonValue } from '../apps/deeptail/src/wire.ts'
import type { WireFrame } from './tauri-script.ts'

/**
 * What a registered callback was handed: the message the wire carried, and its
 * place in the order of delivery.
 *
 * Carries the index signature the wire model has, because this is the value the
 * runtime hands a callback, and a callback a page registers is typed by the
 * library as receiving a wire value.
 */
export interface CallbackEnvelope {
  readonly [field: string]: JsonValue
  readonly index: number
  readonly message: WireFrame
}

/** The answer a command carries, which is what crosses the boundary. */
export type WireValue = Awaited<ReturnType<typeof invoke>>

/**
 * A callback the webview registered through `transformCallback`.
 *
 * Tauri hands these to the backend and evaluates them when a frame arrives, so a
 * callback's answer is discarded whatever it returns; `unknown` is what says so.
 */
export type ChannelCallback = (payload: JsonValue) => unknown

/** One channel the page opened, and the callback it registered for it. */
export interface OpenChannel {
  /** The identifier `transformCallback` gave it, which is what the backend is handed. */
  readonly id: string
  /** Deliver one frame from the mux wire, the way Rust would. */
  readonly receive: (frame: WireFrame) => unknown
  /**
   * Deliver one frame under an index the caller names, rather than the next one.
   *
   * The library holds a frame back until the envelope's index is the one it
   * expects, so a case about ordering has to state the index, and cannot say it
   * through the next-in-sequence delivery `receive` performs.
   * @param index - the envelope index the frame arrives under.
   * @param frame - the frame to hand the callback.
   * @returns nothing a caller may use.
   */
  readonly deliver: (index: number, frame: WireFrame) => undefined
}

/** The arguments one invoke is handed, read off the boundary rather than restated. */
export type InvokeArguments = Parameters<typeof invoke>[1]

/**
 * The runtime object a webview holds, narrowed to what this platform answers.
 *
 * `invoke` is the whole of the boundary the product uses, and it answers with a
 * wire value: what a command returns is a value off the boundary, which is what
 * the readers in `native-call.ts` narrow. `transformCallback` is how a channel
 * registers itself, and `unregisterCallback` is how the installed `Channel`
 * gives its slot back when the wire ends.
 *
 * The argument type is read off the product's own `invoke` rather than written
 * out here, so a runtime substituted for a webview's own accepts exactly what
 * that call accepts and nothing here can drift from it. Exported because a suite
 * that reaches the runtime the way a page does needs a name for what it finds,
 * and `globalThis` carries no such member.
 */
export interface TauriInternals {
  readonly invoke: (command: string, args?: InvokeArguments) => Promise<WireValue>
  readonly transformCallback: (callback: ChannelCallback, once?: boolean) => string
  readonly unregisterCallback: (id: string) => boolean
  /**
   * How the asset protocol turns a device path into a URL.
   *
   * Carried because a webview's runtime carries it, so a double without it is a
   * runtime the product could not run on. It answers the path unchanged: no
   * product route asks for an asset here, and inventing a URL scheme would be
   * answering for a feature nothing exercises.
   */
  readonly convertFileSrc: (path: string) => string
}
