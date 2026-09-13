/**
 * The source a page evaluates to run the structural checks.
 *
 * Split from `structure.ts` so that module stays under the file-size limit.
 * The checks themselves live there; this file only serialises them.
 *
 * @module
 */

import {
  checkAriaReferences,
  checkDuplicateIds,
  checkGroupNames,
  checkHeadingOrder,
  checkListOwnership,
  checkNestedInteractive,
  findStructureDefects,
} from './structure.ts'
import {
  checkAlignment,
  checkClipping,
  checkGrid,
  checkHorizontalOverflow,
  checkNestedScroll,
  gridAncestor,
  isLayoutPane,
  scrolls,
} from './structure-layout.ts'
import { checkOverlappingTargets, checkTouchTargets, drawnBox } from './structure-pointer.ts'
import { describe } from './structure-report.ts'
import { checkInlineScripts, checkOneOffScripts, checkShell } from './structure-shell.ts'
import { checkClassVocabulary } from './structure-vocabulary.ts'

/**
 * Wait for fonts and finite animations. Infinite ones (the loading spinner)
 * never finish and must not be awaited.
 * @returns nothing, once fonts are ready and finite animations have finished.
 */
export async function waitForFiniteAnimations(): Promise<void> {
  await document.fonts.ready
  const finite = [...document.getAnimations()].filter((animation) => {
    const effect = animation.effect
    return effect !== null && effect.getComputedTiming().iterations !== Number.POSITIVE_INFINITY
  })
  await Promise.allSettled(finite.map((animation) => animation.finished))
}

/** The smallest touch target Apple's Human Interface Guidelines admit, in CSS pixels. */
const MINIMUM_TOUCH_TARGET = 44

/** The smallest target WCAG 2.2 admits for any pointer, in CSS pixels. */
const MINIMUM_POINTER_TARGET = 24

/** The surfaces this product draws, however the page is laid out. */
const PRODUCT_SURFACES =
  '[data-deeptail-shell], [data-deeptail-picker], [data-deeptail-state="boot-error"], [data-deeptail-return]'

/** Elements that take focus or activation, including role-named forms. */
const INTERACTIVE =
  'a[href], button, input, select, textarea, summary, [contenteditable="true"], [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], [role="option"]'

/**
 * The source a page evaluates to run these checks.
 * @param coarsePointer - whether the platform minimum touch target applies.
 * @param vocabulary - every class name the shipped stylesheets define.
 * @returns the source to evaluate.
 */
export function structureCheckSource(coarsePointer: boolean, vocabulary: readonly string[]): string {
  const limits = {
    target: coarsePointer ? MINIMUM_TOUCH_TARGET : MINIMUM_POINTER_TARGET,
    interactive: INTERACTIVE,
    scope: PRODUCT_SURFACES,
    vocabulary,
  }
  const functions = [
    describe,
    checkDuplicateIds,
    checkNestedInteractive,
    checkHeadingOrder,
    checkAriaReferences,
    checkListOwnership,
    checkGroupNames,
    checkClassVocabulary,
    checkHorizontalOverflow,
    scrolls,
    isLayoutPane,
    checkClipping,
    checkNestedScroll,
    drawnBox,
    checkOverlappingTargets,
    checkTouchTargets,
    checkAlignment,
    gridAncestor,
    checkGrid,
    checkShell,
    checkInlineScripts,
    checkOneOffScripts,
    findStructureDefects,
    waitForFiniteAnimations,
  ].map(String)
  return `(async () => {\n${functions.join(
    '\n\n',
  )}\nawait waitForFiniteAnimations()\nreturn findStructureDefects(${JSON.stringify(limits)})\n})()`
}
