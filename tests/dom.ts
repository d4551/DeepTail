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

GlobalRegistrator.register()

/**
 * Empty the document between cases, so nothing one built is read by the next.
 */
export function resetDocument(): void {
  document.body.replaceChildren()
  document.head.replaceChildren()
  delete document.body.dataset['dsDarkTheme']
}
