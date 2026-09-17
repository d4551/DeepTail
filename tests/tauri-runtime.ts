/**
 * The Tauri runtime object, answered.
 *
 * This replaces the earlier approach of mocking `@tauri-apps/api/core` by
 * specifier, which patched whichever copy of the library was in the module
 * registry when the mock was registered. Bun runs one command's test files in
 * one process, so whether the modules that bind `invoke` at import time saw the
 * double or Tauri depended on which suite imported the library first: alone, the
 * suite passed; with the rest of the repository, sixteen cases failed with a
 * `TypeError` thrown from inside Tauri, because the real `invoke` ran against a
 * `window` no webview had installed `__TAURI_INTERNALS__` on.
 *
 * Tauri reads that object at call time, so answering it answers every command
 * and every channel the page opens, through the same `invoke` the shipped bundle
 * binds and with nothing substituted. `Channel` is answered the same way rather
 * than replaced: the installed one registers its callback through
 * `transformCallback`, so this module keeps the callbacks and delivers a frame
 * through the one a socket registered, in the numbered envelope Rust uses.
 *
 * The command script — what each command answers, and the refusals a case can
 * plant — is `tauri-script.ts`, and the declarations of the boundary this
 * module answers are `tauri-internals.ts`.
 *
 * @module
 */

import { isWireObject } from '../apps/deeptail/src/wire.ts'
import type {
  CallbackEnvelope,
  ChannelCallback,
  InvokeArguments,
  OpenChannel,
  TauriInternals,
  WireValue,
} from './tauri-internals.ts'
import {
  answerTo,
  argOf,
  type Call,
  type CarrierCommand,
  countOf as countInScript,
  type Invocation,
  requestOf,
  resetScript,
  stringArgOf,
  type WireFrame,
} from './tauri-script.ts'

export type { OpenChannel, TauriInternals } from './tauri-internals.ts'
export {
  answerFetchWith,
  type CarrierCommand,
  type Invocation,
  refuseBundleWith,
  refuseCloseMuxWith,
  refuseOpenMuxWith,
  refuseSendMuxWith,
} from './tauri-script.ts'

/**
 * The runtime object this process installed, which is what a page reads.
 *
 * Held beside the global it was written to rather than read back out of it: the
 * property is not declared on `globalThis`, so a project that does not load the
 * library's own declaration cannot ask for it by name without being handed a
 * value no caller may use.
 * @returns the runtime.
 * @throws Error when nothing installed it, which is the failure every suite here depends on not happening.
 */
export function installedRuntime(): TauriInternals {
  if (installed === undefined) throw new Error('deeptail: the runtime double is not installed')
  return installed
}

/** Every invoke the carrier made, in order. */
export const invocations: Invocation[] = []

/** Every channel the page opened, in order. */
export const channels: OpenChannel[] = []

/** The callback each identifier a channel registered under belongs to. */
const callbacks = new Map<string, ChannelCallback>()

/** The runtime object most recently written to the global, and the one a page reads. */
let installed: TauriInternals | undefined

/** How many channels have registered, so every identifier is its own. */
let callbackCount = 0

/** How many frames this double has delivered, so every envelope carries its own index. */
let deliveries = 0

/**
 * How many channels have registered a callback with the runtime.
 *
 * A channel cannot be built without one — the installed `Channel` asks for a
 * callback in its constructor — so a count of nought after a page opened a
 * socket is proof that the page is talking to Tauri rather than to this double.
 * @returns the count.
 */
export function callbackRegistrations(): number {
  return callbackCount
}

/**
 * How many times one command was invoked.
 * @param command - the command to count.
 * @returns the number of invocations recorded for it.
 */
export function countOf(command: CarrierCommand): number {
  return countInScript(invocations, command)
}

/**
 * The identifier a channel was handed over as, and the callback behind it.
 *
 * The channel crosses as the object whose `id` is what `transformCallback` gave
 * it, read by field the way every other argument here is. The callback the
 * socket registered is looked up by that identifier, because that is where the
 * frames Rust delivers land: a frame for an identifier nothing registered is a
 * wire the page never opened, and is refused rather than read past.
 * @param call - the call, as the runtime received it.
 * @returns the channel, or undefined when the call opened none.
 */
function channelOf(call: Call): OpenChannel | undefined {
  const held = argOf(call, 'channel')
  if (typeof held !== 'object' || held === null || Array.isArray(held)) return undefined
  const registered = stringArgOf({ command: call.command, args: held }, 'id')
  if (registered === undefined) return undefined
  /**
   * Hand one numbered frame to the callback the socket registered.
   * @param index - the envelope index the frame arrives under.
   * @param frame - the frame the wire carried.
   * @returns nothing a caller may use.
   */
  const deliver = (index: number, frame: WireFrame): undefined => {
    const callback = callbacks.get(registered)
    if (callback === undefined) throw new Error(`deeptail: no channel is registered under ${registered}`)
    // A frame reaches a channel the way Rust sends one: numbered, in the order
    // it was delivered. Delivering the message bare would read as a frame out of
    // order, and be held back rather than handed on.
    const envelope: CallbackEnvelope = { index, message: frame }
    callback(envelope)
    return undefined
  }
  return {
    id: registered,
    // The next index in the order this double has delivered, which is what every
    // case but one wants: only a case about ordering says the index itself.
    receive: (frame) => {
      const next = deliveries
      deliveries += 1
      return deliver(next, frame)
    },
    deliver,
  }
}

/**
 * The invoke double: it records the call and answers it the way the script is
 * set.
 *
 * Both records are taken before this returns, not once its answer settles:
 * asking Rust to open a channel hands over the channel, so a case that has
 * called for one holds it at the call, exactly as the page does.
 * @param command - the command the page invoked.
 * @param args - the arguments the page passed.
 * @returns the answer the script carries for it.
 */
function invokeDouble(command: string, args?: InvokeArguments): Promise<WireValue> {
  const call: Call = { command, args: isWireObject(args) ? args : {} }
  const channel = channelOf(call)
  const host = stringArgOf(call, 'host')
  const path = stringArgOf(call, 'path')
  const data = stringArgOf(call, 'data')
  const request = requestOf(call)
  invocations.push({
    command,
    ...(host === undefined ? {} : { host }),
    ...(path === undefined ? {} : { path }),
    ...(data === undefined ? {} : { data }),
    ...(request === undefined ? {} : { request }),
    ...(channel === undefined ? {} : { channel: channel.id }),
  })
  if (channel !== undefined) channels.push(channel)
  return answerTo(command)
}

/**
 * Install the runtime object on the global every webview carries it on.
 *
 * happy-dom replaces the global object's own properties, so this is called
 * again after any registration a suite makes: the object a page would find at
 * that moment is the object it finds here.
 */
export function installTauriRuntime(): void {
  const internals: TauriInternals = {
    invoke: (command, args) => invokeDouble(command, args),
    transformCallback: (callback) => {
      callbackCount += 1
      const id = String(callbackCount)
      callbacks.set(id, callback)
      return id
    },
    unregisterCallback: (id) => callbacks.delete(id),
    convertFileSrc: (path) => path,
  }
  installed = internals
  Object.defineProperty(globalThis, '__TAURI_INTERNALS__', {
    value: internals,
    writable: true,
    configurable: true,
    enumerable: false,
  })
}

/**
 * Put the recorded state back the way a fresh process would find it: no
 * invocations, no channels, no planted refusal, and an empty 200 for every
 * unary call. A test that needs a different reply plants one with
 * `answerFetchWith`.
 */
export function resetTransportDouble(): void {
  invocations.length = 0
  channels.length = 0
  callbacks.clear()
  callbackCount = 0
  deliveries = 0
  installed = undefined
  resetScript()
  installTauriRuntime()
}
