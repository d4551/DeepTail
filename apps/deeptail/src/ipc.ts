/**
 * The one module a product file reaches the native side through.
 *
 * A webview reaches its native half through Tauri's own `invoke` and `Channel`.
 * Both are reachable from any module, and both are bound at import time by every
 * module that asks the other side for something. Naming the surface here is what
 * gives the boundary one door: a suite that answers the other end has one name
 * to read, and a second door is a failure a test names rather than a behaviour
 * that depends on which file a runner happened to load first.
 *
 * Nothing is added to Tauri's own call, and deliberately: the arguments a
 * command carries are checked by the serializer that sends them, and a check
 * written beside it can only disagree with it. An earlier revision of this
 * module walked every argument for the wire model and refused the call when it
 * did not recognise one; it refused `tailscale_connect`, whose credential is
 * JSON, and the browser suite caught it. A boundary may not be the place a
 * working call stops working.
 *
 * What a command answers is read by `native-call.ts`, which is where a value
 * stops being arbitrary; the commands themselves are named by the modules that
 * own them.
 *
 * @module
 */

import { type InvokeArgs, Channel as NativeChannel, invoke as tauriInvoke } from '@tauri-apps/api/core'

/**
 * Call one native command.
 *
 * The arguments are the boundary's own list, not a narrower one: a command
 * carries a `Channel` when it opens a stream, and `Channel` is not one of the
 * values a roll-your-own argument shape admits. A boundary that narrowed this
 * would refuse a call that works — which is the failure this module's doc
 * comment above records.
 * @param command - the command's name as Rust declares it.
 * @param args - the arguments the call site built.
 * @returns what the native side answered with.
 */
function invoke<T>(command: string, args?: InvokeArgs): Promise<T> {
  return tauriInvoke<T>(command, args)
}

/**
 * The stream handle the native side pushes over.
 *
 * Named `NativeChannel` here rather than left as `Channel`: the module it comes
 * from is the only other place the name appears in the product, and a reader of
 * a call site should not have to know which of the two a bare `Channel` meant.
 */
export { invoke, NativeChannel }
