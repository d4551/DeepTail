/**
 * A document for the suites that build one.
 *
 * The surfaces paint before any harness bundle loads, so they build elements
 * directly — and a suite that drives them needs the DOM those calls reach.
 * Bun's runner has none, and the browser suites run a real Chromium against a
 * built bundle, where the mutation runs' switch is never active: the page has
 * no process to read it from, so a suite there answers for the unmutated code
 * however the run is configured.
 *
 * happy-dom is what the two halves are read through here. The browser suites
 * remain the account of what a real engine does with the same markup; these
 * cases are the account of what each surface builds, which is the part a
 * mutation run can judge.
 *
 * ## The DOM is what this claims, and the network stack is not
 *
 * Bun runs every test file in one process and keeps one global object across
 * them, so a registration made here is still in force when a browser suite
 * runs beside it. happy-dom's registrator claims the process's network globals
 * as well as its DOM ones — `fetch`, `Request`, `Response`, `Headers`,
 * `WebSocket` and `FormData` — and the browser harness serves the built bundle
 * through `Bun.serve`, whose handler answers with `new Response(...)`.
 *
 * Answering with another library's `Response` is not a served page: the harness
 * returned nothing a socket could carry, every browser suite's first case timed
 * out against a page that never loaded, and the timeout closed that suite's
 * browser, which took the rest of its cases with it — 175 failures in one run,
 * from a helper whose callers came for a document.
 *
 * So the six are held before the registrator runs and put back the moment it
 * has: this module supplies the DOM its callers came for and leaves the
 * platform's network stack in place. A suite that registers for itself applies
 * the same reclaim, because the rule belongs to the registration rather than to
 * this file's import of it.
 *
 * @module
 */

import { GlobalRegistrator } from '@happy-dom/global-registrator'

/**
 * The record that this process already has a document.
 *
 * Bun re-evaluates a suite's module graph per test file while keeping one
 * global object, so a registration that ran at import time would run again
 * for the next suite that imports this module — and the registrator refuses
 * a second registration. The record lives on the global object the
 * registrator itself writes to, because that is the only state that survives
 * the re-evaluation; it books this module's work, it detects nothing about
 * the platform.
 */
const INSTALLED_KEY = 'deeptailDocumentInstalled'

/**
 * The globals outside the DOM that the registrator claims too, holding what the
 * platform has under each name.
 *
 * Every one is a constructor or a function the platform exposes, which is why
 * they are read as `object`: reading them as anything wider would be reading
 * the shape this file does not use. A file's imports are evaluated before its
 * body runs, and every suite that registers happy-dom imports this module, so
 * this reading is taken ahead of the first registration the process makes.
 */
const NATIVE: Readonly<Record<string, object>> = {
  fetch: globalThis.fetch,
  Request: globalThis.Request,
  Response: globalThis.Response,
  Headers: globalThis.Headers,
  WebSocket: globalThis.WebSocket,
  FormData: globalThis.FormData,
}

/**
 * How a reclaimed global is defined: the platform's own value, writable and
 * configurable as the platform had it, and not enumerated onto the global
 * object's key list by a test helper.
 */
const RECLAIMED = { writable: true, configurable: true, enumerable: false } as const

/**
 * Put the platform's network globals back after a registration has taken them.
 *
 * Called by this module for its registration and by any suite that registers
 * for itself, so the two cannot drift into claiming different sets. Each name
 * is written out rather than driven from a list, because the gate that refuses
 * a computed attribute name cannot read a name it is not given.
 */
export function reclaimNetworkGlobals(): void {
  Object.defineProperty(globalThis, 'fetch', { ...RECLAIMED, value: NATIVE.fetch })
  Object.defineProperty(globalThis, 'Request', { ...RECLAIMED, value: NATIVE.Request })
  Object.defineProperty(globalThis, 'Response', { ...RECLAIMED, value: NATIVE.Response })
  Object.defineProperty(globalThis, 'Headers', { ...RECLAIMED, value: NATIVE.Headers })
  Object.defineProperty(globalThis, 'WebSocket', { ...RECLAIMED, value: NATIVE.WebSocket })
  Object.defineProperty(globalThis, 'FormData', { ...RECLAIMED, value: NATIVE.FormData })
}

if (!Object.hasOwn(globalThis, INSTALLED_KEY)) {
  GlobalRegistrator.register()
  Object.defineProperty(globalThis, INSTALLED_KEY, { value: true })
  reclaimNetworkGlobals()
}

/**
 * Empty the document between cases, so nothing one built is read by the next.
 */
export function resetDocument(): void {
  document.body.replaceChildren()
  document.head.replaceChildren()
  delete document.body.dataset.dsDarkTheme
}
