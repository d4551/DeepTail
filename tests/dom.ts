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
 * the re-evaluation; it books this module's own work, it detects nothing
 * about the platform.
 */
const INSTALLED_KEY = 'deeptailDocumentInstalled'

if (!Object.hasOwn(globalThis, INSTALLED_KEY)) {
  GlobalRegistrator.register()
  Object.defineProperty(globalThis, INSTALLED_KEY, { value: true })
}

/**
 * Empty the document between cases, so nothing one built is read by the next.
 */
export function resetDocument(): void {
  document.body.replaceChildren()
  document.head.replaceChildren()
  delete document.body.dataset['dsDarkTheme']
}
