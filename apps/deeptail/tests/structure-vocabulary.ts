/**
 * The class-vocabulary check: every class the page shows is one the shipped
 * stylesheets name.
 *
 * A class outside the vocabulary is a styling or hooking decision made outside
 * the design system: a one-off per-page name no gate reads and no sheet styles,
 * which is exactly how a utility framework's vocabulary (`btn`, `p-4`) drifts
 * in. The page is the ground truth — a class composed at runtime shows up here
 * in its final spelling.
 *
 * @module
 */

import { describe, type Report } from './structure-report.ts'

/** What the vocabulary check reads, as the caller hands it to the page. */
interface VocabularyLimits {
  /** The product surfaces the check reads, as one selector list. */
  readonly scope: string
  /** Every class name the shipped stylesheets define. */
  readonly vocabulary: readonly string[]
}

/**
 * Report every class an element carries that no shipped sheet defines.
 * @param add - collects a finding.
 * @param limits - the surfaces to read and the vocabulary to read against.
 */
function checkClassVocabulary(add: Report, limits: VocabularyLimits): void {
  const known = new Set(limits.vocabulary)
  for (const node of document.querySelectorAll(limits.scope)) {
    for (const element of [node, ...node.querySelectorAll('*')]) {
      for (const token of element.classList) {
        if (!known.has(token)) {
          add('unknown-class', `${describe(element)} carries class "${token}", which no shipped sheet defines`)
        }
      }
    }
  }
}

export { checkClassVocabulary }
