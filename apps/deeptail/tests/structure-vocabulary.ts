/**
 * What the page shows has to be something the shipped sheets named: the classes
 * it carries, and the motion it spends.
 *
 * A class outside the vocabulary is a styling or hooking decision made outside
 * the design system: a one-off per-page name no gate reads and no sheet styles,
 * which is exactly how a utility framework's vocabulary (`btn`, `p-4`) drifts
 * in. The page is the ground truth — a class composed at runtime shows up here
 * in its final spelling.
 *
 * Motion is the same question asked of durations: the budget every surface that
 * moves pays for it out of is the page's own token, and a surface that never
 * reads it keeps moving for exactly the readers who asked not to see it.
 *
 * @module
 */

import { surfaceElements } from './structure-elements.ts'
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
  for (const element of surfaceElements(limits.scope)) {
    for (const token of element.classList) {
      if (!known.has(token)) {
        add('unknown-class', `${describe(element)} carries class "${token}", which no shipped sheet defines`)
      }
    }
  }
}

/**
 * Every duration a computed multi-value declaration holds, in seconds.
 *
 * `transition-duration`, `transition-delay` and `animation-duration` are comma
 * separated lists the engine reports in whichever unit the sheet wrote, and a
 * surface can carry several at once — the shell's drawer transitions its
 * transform and its visibility separately. Reading the whole list is what keeps
 * one long duration from hiding behind a zero beside it.
 * @param value - the computed declaration.
 * @returns one entry per duration, in seconds.
 */
function durationsInSeconds(value: string): number[] {
  return value
    .split(',')
    .map((one) => {
      const text = one.trim()
      if (text.endsWith('ms')) return Number(text.slice(0, -2)) / 1000
      return text.endsWith('s') ? Number(text.slice(0, -1)) : Number.NaN
    })
    .filter((one) => Number.isFinite(one))
}

/**
 * A reader who asked for less motion gets less motion.
 *
 * `prefers-reduced-motion` is the one setting a stylesheet cannot honour by
 * itself: the sheet declares what motion costs, and every surface that moves
 * has to pay for it out of the same budget. A transition written with a literal
 * duration is a surface that never reads the budget, so it keeps moving at full
 * speed for exactly the readers the setting exists for, and nothing reports it:
 * the page is correct, accessible and still animating.
 *
 * The budget is the page's own `--ds-transition-duration`, read from the live
 * document rather than assumed, so the rule measures against whatever the sheet
 * declares for this reader: under `reduce` that token holds the near-zero value
 * the sheet substitutes, and a surface that reads it cannot exceed it. A page
 * that names no budget leaves this check nothing to measure against, and every
 * duration above zero is then over it — stated in the finding, because that is
 * the fact the reader is living with.
 * @param add - collects a finding.
 * @param limits - the product surfaces to read.
 */
function checkReducedMotion(add: Report, limits: { readonly scope: string }): void {
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const declared = getComputedStyle(document.documentElement).getPropertyValue('--ds-transition-duration').trim()
  const budget = durationsInSeconds(declared)[0] ?? 0
  const report = (node: Element, what: string, durations: readonly number[]): void => {
    for (const duration of durations) {
      if (duration <= budget) continue
      add(
        'motion-not-reduced',
        `${describe(node)} runs a ${what} of ${String(duration)}s while the reader asked for less motion, where the page's own budget is ${String(budget)}s`,
      )
    }
  }
  for (const element of surfaceElements(limits.scope)) {
    const style = getComputedStyle(element)
    report(element, 'transition', durationsInSeconds(style.transitionDuration))
    report(element, 'transition delay', durationsInSeconds(style.transitionDelay))
    if (style.animationName !== 'none') report(element, 'animation', durationsInSeconds(style.animationDuration))
  }
}

export { checkClassVocabulary, checkReducedMotion, durationsInSeconds }
