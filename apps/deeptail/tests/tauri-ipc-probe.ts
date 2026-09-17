/**
 * What a case can read back out of the page's runtime object.
 *
 * These are serialised into the page alongside the scripted IPC, so each one is
 * a top-level function that closes over nothing but its arguments. They live
 * apart from `tauri-ipc.ts` because they are not the runtime: the runtime is
 * what the page's library calls, and everything here only reads or delivers
 * through it.
 *
 * The reading function is why they exist. The runtime object is the page's own,
 * carrying a name no engine provides and no declaration the page's bundle loads
 * — so a suite that reached for it by name would be asserting against a
 * property TypeScript cannot see, and a function cannot cross back out of a
 * page through Playwright at all. Everything a case wants to know is therefore
 * answered here, in the page, as data.
 *
 * @module
 */

import type { JsonValue } from '../src/wire.ts'
import type { IpcState } from './tauri-ipc-answers.ts'

/** What one identifier the page's runtime minted turned out to be. */
interface IdentifierReport {
  /** What the page had already registered before this probe minted anything. */
  readonly bootRegistrations: number
  readonly identifier: string
  readonly second: string
  readonly distinct: boolean
  /** How many the probe's own two registrations added. */
  readonly registrations: number
  readonly delivered: boolean
  readonly released: boolean
  readonly afterRelease: boolean
}

/**
 * The runtime object the page carries, as far as the probe reaches into it.
 *
 * Only the member the probe calls is named: what the page's library reads of the
 * object is the library's business, and a probe that restated the whole surface
 * would be a second declaration of it to keep in step.
 */
interface PageRuntime {
  readonly transformCallback: (callback: (frame: JsonValue) => unknown) => string
  readonly unregisterCallback: (identifier: string) => boolean
}

/**
 * The runtime object the page carries, or a failure.
 *
 * A page with none is a page whose bundle never ran, which is a failure a case
 * should read rather than a value it has to guard.
 * @returns the runtime.
 * @throws Error when the page carries no runtime object.
 */
function deeptailPageRuntime(): PageRuntime {
  const runtime: PageRuntime | undefined = window.__TAURI_INTERNALS__
  if (runtime === undefined) throw new Error('deeptail: the page carries no runtime object')
  return runtime
}

/**
 * The names of the members the page's runtime object carries.
 * @returns the member names, sorted.
 */
function deeptailRuntimeMembers(): string[] {
  return Object.keys(window.__TAURI_INTERNALS__ ?? {}).toSorted()
}

/**
 * How many callbacks the runtime is holding.
 * @param state - this page's IPC state.
 * @returns the number of registered callbacks.
 */
function deeptailCallbackRegistrations(state: IpcState): number {
  return state.callbacks.size
}

/**
 * Deliver one frame to the callback registered under an identifier, the way the
 * backend does when it pushes over a channel.
 *
 * A frame for an identifier nothing registered is refused rather than thrown
 * on, because that is what the backend does when it addresses an identifier the
 * page has released: the delivery lands nowhere, and the count of what it
 * reached says so.
 * @param state - this page's IPC state.
 * @param id - the identifier `transformCallback` minted.
 * @param frame - the frame to hand the callback.
 * @returns true when a callback was there to receive it.
 */
function deeptailDeliver(state: IpcState, id: string, frame: JsonValue): boolean {
  return state.callbacks.get(id)?.(frame) !== undefined
}

/**
 * What one identifier the page's runtime minted turned out to be, and what it
 * answered for.
 *
 * Every step happens inside the page: an identifier is a string, a callback
 * cannot cross back out of a page, and an identifier that never left the page
 * is not one the backend could address. The reading is the whole interchange —
 * mint, hold, deliver, release, release again — reported as data.
 * @param state - this page's IPC state.
 * @returns what the runtime made of two registrations.
 */
function deeptailIdentifierReport(state: IpcState): IdentifierReport {
  const runtime = deeptailPageRuntime()
  // Counted before the probe mints anything: a page that booted has already
  // registered, and a report that folded that in would be read as the probe's
  // own registrations plus however many the product happened to make.
  const bootRegistrations = state.callbacks.size
  let arrived = 0
  const identifier = runtime.transformCallback(() => {
    arrived += 1
    return null
  })
  const second = runtime.transformCallback(() => null)
  const held = state.callbacks.size
  // The runtime holds the callback against the identifier it minted, so a frame
  // delivered for that identifier reaches the callback and no other.
  const delivered = deeptailDeliver(state, identifier, 'probe')
  runtime.unregisterCallback(identifier)
  return {
    bootRegistrations,
    identifier: typeof identifier === 'string' ? identifier : '',
    second: typeof second === 'string' ? second : '',
    distinct: identifier !== second,
    registrations: held - bootRegistrations,
    delivered,
    released: arrived === 1,
    // A released identifier is one the runtime no longer holds, so a second
    // release reports nothing given back rather than an answer for nothing.
    afterRelease: runtime.unregisterCallback(identifier),
  }
}

export {
  deeptailCallbackRegistrations,
  deeptailDeliver,
  deeptailIdentifierReport,
  deeptailPageRuntime,
  deeptailRuntimeMembers,
}
